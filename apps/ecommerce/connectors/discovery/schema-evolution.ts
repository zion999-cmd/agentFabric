// P0005.2 Phase 2 — Schema Evolution.
//
// Hash-based change detection per API endpoint.
// - When JD upgrades their API → schema hash changes → Connector detects it.
// - Version history stored on disk (data/discovery-schema/{platform}/).
// - Detects: field_added, field_removed, field_type_changed.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadApiInventory } from './loader.js';
import { SchemaVersionSchema } from './types.js';
import type { ApiEndpoint, SchemaChange, SchemaVersion } from './types.js';

// ---------------------------------------------------------------------------
// Schema hash
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic SHA-256 hash for an endpoint's field schema.
 *
 * The canonical form is a sorted concatenation of "fieldName:fieldType" pairs,
 * joined by commas.  This is:
 * - Deterministic (same fields → same hash, always)
 * - Sensitive to field additions, removals, and type changes
 * - Invariant to field declaration order in the source JSON
 */
export const computeSchemaHash = (endpoint: ApiEndpoint): string => {
  const pairs = Object.entries(endpoint.fields)
    .map(([name, info]) => `${name}:${info.type}`)
    .sort();
  const canonical = pairs.join(',');
  return createHash('sha256').update(canonical).digest('hex');
};

// ---------------------------------------------------------------------------
// Schema version capture
// ---------------------------------------------------------------------------

/** Build a SchemaVersion record for an endpoint at the current moment. */
export const captureSchemaVersion = (
  endpoint: ApiEndpoint,
  previousVersion = 0,
): SchemaVersion => {
  const fieldNames = Object.keys(endpoint.fields).sort();
  const fieldTypes: Record<string, string> = {};
  for (const [name, info] of Object.entries(endpoint.fields)) {
    fieldTypes[name] = info.type;
  }

  return SchemaVersionSchema.parse({
    hash: computeSchemaHash(endpoint),
    version: previousVersion + 1,
    recorded_at: new Date().toISOString(),
    field_names: fieldNames,
    field_types: fieldTypes,
  });
};

// ---------------------------------------------------------------------------
// Change detection
// ---------------------------------------------------------------------------

const PLACEHOLDER_EP = '<detectChanges>'; // filled by caller in detectAllChanges

/** Compare two SchemaVersions and return a list of detected changes. */
export const detectChanges = (
  previous: SchemaVersion,
  current: SchemaVersion,
): SchemaChange[] => {
  if (previous.hash === current.hash) return [];

  const changes: SchemaChange[] = [];
  const prevFields = new Set(previous.field_names);
  const currFields = new Set(current.field_names);

  // Fields added
  for (const field of currFields) {
    if (!prevFields.has(field)) {
      changes.push({
        endpoint: PLACEHOLDER_EP,
        change_type: 'field_added',
        field,
        current: current.field_types[field],
      });
    }
  }

  // Fields removed
  for (const field of prevFields) {
    if (!currFields.has(field)) {
      changes.push({
        endpoint: PLACEHOLDER_EP,
        change_type: 'field_removed',
        field,
        previous: previous.field_types[field],
      });
    }
  }

  // Type changes
  for (const field of currFields) {
    if (prevFields.has(field) && previous.field_types[field] !== current.field_types[field]) {
      changes.push({
        endpoint: PLACEHOLDER_EP,
        change_type: 'field_type_changed',
        field,
        previous: previous.field_types[field],
        current: current.field_types[field],
      });
    }
  }

  return changes;
};

// ---------------------------------------------------------------------------
// Version history persistence
// ---------------------------------------------------------------------------

const VERSIONS_DIR = 'data/discovery-schema';

const versionsPath = (platform: string): string =>
  resolve(process.cwd(), VERSIONS_DIR, platform, 'schema-versions.json');

/** Load stored version history for a platform. */
export const loadVersionHistory = (
  platform: string,
): Record<string, SchemaVersion[]> => {
  const path = versionsPath(platform);
  if (!existsSync(path)) return {};
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
  const parsed: Record<string, SchemaVersion[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      parsed[key] = value.map((v) => SchemaVersionSchema.parse(v));
    }
  }
  return parsed;
};

/** Save a version history snapshot for one or more endpoints. */
export const saveVersionHistory = (
  platform: string,
  versions: Record<string, SchemaVersion>,
): void => {
  // Merge with existing history
  const history = loadVersionHistory(platform);
  for (const [epName, version] of Object.entries(versions)) {
    const list = history[epName] ?? [];
    // Avoid duplicate identical hashes
    if (list.length > 0 && list[list.length - 1]!.hash === version.hash) continue;
    list.push(version);
    history[epName] = list;
  }

  const dir = resolve(process.cwd(), VERSIONS_DIR, platform);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(versionsPath(platform), JSON.stringify(history, null, 2), 'utf-8');
};

// ---------------------------------------------------------------------------
// Batch operations
// ---------------------------------------------------------------------------

/** Compare the current API inventory against stored version history. */
export const detectAllChanges = (
  platform: string,
  currentEndpoints?: Record<string, ApiEndpoint>,
): SchemaChange[] => {
  const endpoints = currentEndpoints ?? loadApiInventory();
  const history = loadVersionHistory(platform);
  const allChanges: SchemaChange[] = [];

  for (const [epName, ep] of Object.entries(endpoints)) {
    const storedVersions = history[epName];
    if (!storedVersions || storedVersions.length === 0) continue; // first-time discovery
    const latest = storedVersions[storedVersions.length - 1]!;
    const current = captureSchemaVersion(ep, latest.version);
    const changes = detectChanges(latest, current);
    for (const change of changes) {
      change.endpoint = epName;
    }
    allChanges.push(...changes);
  }

  return allChanges;
};

/** Return the latest schema version for a specific endpoint (null if unknown). */
export const getLatestVersion = (
  platform: string,
  endpointName: string,
): SchemaVersion | null => {
  const history = loadVersionHistory(platform);
  const versions = history[endpointName];
  if (!versions || versions.length === 0) return null;
  return versions[versions.length - 1]!;
};

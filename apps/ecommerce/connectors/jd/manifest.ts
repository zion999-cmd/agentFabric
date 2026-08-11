// JD Connector capability manifest.
// Declares what business capabilities this connector provides.
// Every P0005 connector exports a manifest.
//
// P0005.4: Business fields (signal_types, business_context, evidence_chain)
// are derived from the generated blueprint. UI/display fields remain hardcoded.

import { loadOrGenerate } from '#app/connectors/binding/index.js';
import type { BoundCapabilityModel } from '#app/connectors/binding/index.js';

/** Lazy-loaded blueprint cache. */
let _blueprintCache: BoundCapabilityModel | null = null;

const getBlueprint = (): BoundCapabilityModel => {
  if (!_blueprintCache) _blueprintCache = loadOrGenerate('jd');
  return _blueprintCache;
};

/** Derive refresh cadence from signal types. */
const deriveRefreshCadence = (
  signalTypes: readonly string[],
): Readonly<Record<string, string>> => {
  const cadence: Record<string, string> = {};
  for (const st of signalTypes) {
    if (st.includes('hourly')) cadence[st] = 'hourly';
    else if (st === 'campaign_performance') cadence[st] = 'daily';
    else cadence[st] = 'daily';
  }
  return cadence;
};

/** Build the manifest from the blueprint, adding UI-only hardcoded fields. */
const buildManifestFromBlueprint = (bp: BoundCapabilityModel) => {
  return {
    source: bp.platform as 'jd',
    display_name: '京东商智',
    version: '1.0.0',

    signal_types: [...bp.manifest.signal_types] as readonly string[],

    business_context: [...bp.manifest.business_context] as readonly string[],

    acquisition_methods: [
      'CDP (Playwright connectOverCDP)',
      'Mock (Development/Test)',
    ] as const,

    refresh_cadence: deriveRefreshCadence(bp.manifest.signal_types),

    evidence_chain: [...bp.manifest.evidence_chain] as readonly string[],

    /** API gateway */
    api_gateway: 'szgateway.jd.com/api/lowcode/indexSummary/',

    /** Auth method */
    auth_method: 'CDP cookie reuse (Chrome debug mode session)',

    /** Shop defaults */
    default_shop: {
      shop_id: 'jd_shop_001',
      shop_name: '京东店铺',
    },
  } as const;
};

/** The JD connector manifest — derived from generated blueprint. */
export const JD_MANIFEST = buildManifestFromBlueprint(getBlueprint());

export type JdManifest = typeof JD_MANIFEST;

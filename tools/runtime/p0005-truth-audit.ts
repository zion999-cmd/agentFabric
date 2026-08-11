import { readFileSync } from 'node:fs';
import { globSync } from 'glob';

type Verdict = 'PASS' | 'FAIL' | 'WARN';
type Result = {
  name: string;
  status: Verdict;
  evidence: string[];
};

type AuditEntry = { file: string; line: number; text: string };

// ---- File classification ----

const ENTRY_FILES = ['scripts/cli.ts'];
const ALL_SCRIPT_FILES = globSync('scripts/**/*.ts');

/** Scan a single file for patterns. Returns line-numbered hits. */
function scanFile(file: string, patterns: RegExp[]): AuditEntry[] {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const hits: AuditEntry[] = [];
  lines.forEach((text, idx) => {
    for (const p of patterns) {
      if (p.test(text)) {
        hits.push({ file, line: idx + 1, text: text.trim() });
        break; // one hit per line
      }
    }
  });
  return hits;
}

/** Check if a file contains a pattern anywhere. */
function fileContains(file: string, pattern: RegExp): boolean {
  return pattern.test(readFileSync(file, 'utf-8'));
}

// ============================================================
// 1. Kernel Entry Verification
//    CLI entry points must NOT call business logic directly.
// ============================================================
function checkKernelEntry(): Result {
  const forbidden = [
    { pattern: /acquireJdData\s*\(/, label: 'acquireJdData()' },
    { pattern: /saveEvidence\s*\(/, label: 'saveEvidence()' },
    { pattern: /SignalFacade\.store\s*\(/, label: 'SignalFacade.store()' },
    { pattern: /\bnormalizeSignal\s*\(/, label: 'normalizeSignal()' },
    { pattern: /\bprocessDay\b/, label: 'processDay' },
    { pattern: /generateSignals\s*\(/, label: 'generateSignals() direct' },
    { pattern: /captureEvidence\s*\(/, label: 'captureEvidence() direct' },
  ];

  const hits: string[] = [];

  for (const file of ENTRY_FILES) {
    for (const { pattern, label } of forbidden) {
      if (fileContains(file, pattern)) {
        const found = scanFile(file, [pattern]);
        for (const f of found) {
          hits.push(`❌ ${file}:${f.line} → ${label} — ${f.text}`);
        }
      }
    }
  }

  // Verify the required kernel methods ARE called in CLI
  const requiredKernelCalls = [
    { pattern: /kernel\.execute\s*\(/, label: 'kernel.execute()' },
    { pattern: /kernel\.executeLiveCDP\s*\(/, label: 'kernel.executeLiveCDP()' },
    { pattern: /kernel\.executeImport\s*\(/, label: 'kernel.executeImport()' },
    { pattern: /createRuntimeKernel\s*\(/, label: 'createRuntimeKernel()' },
  ];

  for (const { pattern, label } of requiredKernelCalls) {
    for (const file of ENTRY_FILES) {
      if (fileContains(file, pattern)) {
        hits.push(`✅ ${file} → ${label}`);
      }
    }
  }

  // Also verify NO forbidden calls appear in ANY file under scripts/
  const strayHits: string[] = [];
  for (const file of ALL_SCRIPT_FILES) {
    if (ENTRY_FILES.includes(file)) continue; // already checked above
    for (const { pattern, label } of forbidden) {
      const found = scanFile(file, [pattern]);
      for (const f of found) {
        strayHits.push(`⚠️  ${f.file}:${f.line} → ${label} — ${f.text}`);
      }
    }
  }

  if (strayHits.length > 0) {
    hits.push('--- Stale scripts with legacy calls ---');
    hits.push(...strayHits);
  }

  const hasForbidden = hits.some((h) => h.startsWith('❌'));
  const hasStray = strayHits.length > 0;

  return {
    name: '1. Kernel Entry Verification',
    status: hasForbidden ? 'FAIL' : hasStray ? 'WARN' : 'PASS',
    evidence: hits,
  };
}

// ============================================================
// 2. Binding Runtime Participation
//    Planner + executor must be used in production paths.
// ============================================================
function checkBindingParticipation(): Result {
  const hits: string[] = [];

  // Check kernel executor uses planner + executor
  const executorFile = 'apps/ecommerce/runtime/kernel/runtime-executor.ts';
  const usesPlanner = fileContains(executorFile, /buildExecutionPlan\s*\(/);
  const usesExecutor = fileContains(executorFile, /executePlan\s*\(/);

  hits.push(usesPlanner
    ? `✅ ${executorFile} → buildExecutionPlan() used`
    : `❌ ${executorFile} → buildExecutionPlan() NOT used`);
  hits.push(usesExecutor
    ? `✅ ${executorFile} → executePlan() used`
    : `❌ ${executorFile} → executePlan() NOT used`);

  // Check CLI does NOT bypass planner/executor
  const cliFile = 'scripts/cli.ts';
  const cliHasDirectAcquire = fileContains(cliFile, /acquireJdData\s*\(/);
  const cliHasDirectSignal = fileContains(cliFile, /generateSignals\s*\(/);
  const cliHasDirectEvidence = fileContains(cliFile, /captureEvidence\s*\(/);

  if (cliHasDirectAcquire) hits.push(`❌ ${cliFile} → bypass: direct acquireJdData()`);
  else hits.push(`✅ ${cliFile} → no direct acquireJdData()`);

  if (cliHasDirectSignal) hits.push(`❌ ${cliFile} → bypass: direct generateSignals()`);
  else hits.push(`✅ ${cliFile} → no direct generateSignals()`);

  if (cliHasDirectEvidence) hits.push(`❌ ${cliFile} → bypass: direct captureEvidence()`);
  else hits.push(`✅ ${cliFile} → no direct captureEvidence()`);

  // Check kernel files that legitimately use acquireJdData
  const kernelUsesAcquire = fileContains(executorFile, /acquireJdData\s*\(/);
  hits.push(kernelUsesAcquire
    ? `✅ ${executorFile} → acquireJdData() inside kernel (legitimate)`
    : `⚠️  ${executorFile} → acquireJdData() NOT found (unexpected)`);

  const failed = hits.some((h) => h.startsWith('❌'));

  return {
    name: '2. Binding Runtime Participation',
    status: failed ? 'FAIL' : 'PASS',
    evidence: hits,
  };
}

// ============================================================
// 3. Blueprint Truthfulness
//    Runtime modules must derive config from blueprint, not hardcode.
// ============================================================
function checkBlueprintTruth(): Result {
  const hits: string[] = [];

  // Check signal-engine uses blueprint manifest fields
  const signalEngineFile = 'apps/ecommerce/runtime/kernel/runtime-signal-engine.ts';
  const usesSignalTypes = fileContains(signalEngineFile, /signalTypes/);
  const usesNormalizerSpec = fileContains(signalEngineFile, /normalizerSpec/);

  hits.push(usesSignalTypes
    ? `✅ signal-engine → parametrized by signalTypes (blueprint.manifest.signal_types)`
    : `❌ signal-engine → missing signalTypes reference`);
  hits.push(usesNormalizerSpec
    ? `✅ signal-engine → parametrized by normalizerSpec (blueprint.normalizer_plan)`
    : `❌ signal-engine → missing normalizerSpec reference`);

  // Check evidence-orchestrator uses blueprint capture_rules
  const evidenceFile = 'apps/ecommerce/runtime/kernel/runtime-evidence-orchestrator.ts';
  const usesCaptureRules = fileContains(evidenceFile, /capture_rules/);
  hits.push(usesCaptureRules
    ? `✅ evidence-orchestrator → parametrized by capture_rules (blueprint.evidence_strategy)`
    : `❌ evidence-orchestrator → missing capture_rules reference`);

  // Check normalizer-resolver uses blueprint normalizer_plan
  const normalizerFile = 'apps/ecommerce/runtime/kernel/runtime-normalizer-resolver.ts';
  const usesNormalizerPlan = fileContains(normalizerFile, /normalizer_plan/);
  hits.push(usesNormalizerPlan
    ? `✅ normalizer-resolver → uses blueprint.normalizer_plan`
    : `❌ normalizer-resolver → missing normalizer_plan reference`);

  // Check executor uses ALL blueprint fields
  const executorFile = 'apps/ecommerce/runtime/kernel/runtime-executor.ts';
  const executorUsesManifest = fileContains(executorFile, /manifest\.signal_types/);
  const executorUsesNormalizerPlan = fileContains(executorFile, /normalizer_plan/);
  const executorUsesEvidenceStrategy = fileContains(executorFile, /evidence_strategy/);

  hits.push(executorUsesManifest
    ? `✅ runtime-executor → uses blueprint.manifest.signal_types`
    : `❌ runtime-executor → missing manifest.signal_types`);
  hits.push(executorUsesNormalizerPlan
    ? `✅ runtime-executor → uses blueprint.normalizer_plan`
    : `❌ runtime-executor → missing normalizer_plan`);
  hits.push(executorUsesEvidenceStrategy
    ? `✅ runtime-executor → uses blueprint.evidence_strategy`
    : `❌ runtime-executor → missing evidence_strategy`);

  // Check for structural coupling (hardcoded JD field names in signal-engine)
  // This is expected — ParsedJdData is JD-specific by nature — but we track it.
  const hardcodedFields = ['parsed.summary.gmv', 'h.gmv', 'parsed.hourly_gmv'];
  const signalContent = readFileSync(signalEngineFile, 'utf-8');
  const foundHardcoded = hardcodedFields.filter((f) => signalContent.includes(f));
  if (foundHardcoded.length > 0) {
    hits.push(`ℹ️  signal-engine → structural JD coupling: ${foundHardcoded.join(', ')} (expected — ParsedJdData is JD-specific)`);
  }

  const failed = hits.some((h) => h.startsWith('❌'));

  return {
    name: '3. Blueprint Truthfulness',
    status: failed ? 'FAIL' : 'PASS',
    evidence: hits,
  };
}

// ============================================================
// 4. Final Verdict
// ============================================================
function finalVerdict(results: Result[]): { status: string; score: number } {
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;

  if (failCount === 0 && warnCount === 0) {
    return { status: 'TRUE FULLY CONVERGED ✅', score: 100 };
  }
  if (failCount === 0 && warnCount <= 1) {
    return { status: 'CONVERGED (minor warnings)', score: 90 };
  }
  if (failCount === 1) {
    return { status: 'PARTIAL — one dimension has gaps', score: 70 };
  }
  return { status: 'LEGACY-TAINTED — multiple dimensions fail', score: 40 };
}

// ============================================================
// MAIN
// ============================================================
function run() {
  const results = [
    checkKernelEntry(),
    checkBindingParticipation(),
    checkBlueprintTruth(),
  ];

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     P0005 TRUTH AUDIT (v2 — P0005.6.1)  ║');
  console.log('╚══════════════════════════════════════════╝\n');

  for (const r of results) {
    const icon = r.status === 'PASS' ? '🟢' : r.status === 'WARN' ? '🟡' : '🔴';
    console.log(`\n${icon} ${r.name}: ${r.status}`);
    for (const e of r.evidence) {
      console.log(`   ${e}`);
    }
  }

  const verdict = finalVerdict(results);

  console.log('\n═══════════════════════════════════════════');
  console.log(`  FINAL VERDICT: ${verdict.status}`);
  console.log(`  SCORE: ${verdict.score}/100`);
  console.log('═══════════════════════════════════════════\n');
}

run();

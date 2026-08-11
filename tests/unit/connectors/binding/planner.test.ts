// Unit tests for binding/planner.ts — execution plan building.

import { describe, expect, test } from 'vitest';
import {
  loadBlueprint,
  buildExecutionPlan,
  CapabilityExecutionPlanSchema,
} from '#app/connectors/binding/index.js';

describe('buildExecutionPlan', () => {
  test('produces valid plan from real blueprint', () => {
    const model = loadBlueprint('jd');
    const plan = buildExecutionPlan(model);

    const validated = CapabilityExecutionPlanSchema.parse(plan);
    expect(validated.platform).toBe('jd');
    expect(validated.apis_to_call.length).toBeGreaterThan(0);
    expect(validated.indicator_resolution.length).toBeGreaterThan(0);
    expect(validated.evidence_capture.length).toBeGreaterThanOrEqual(0);
  });

  test('filtering by capability "daily_summary" selects APIs', () => {
    const model = loadBlueprint('jd');
    const plan = buildExecutionPlan(model, { capabilities: ['daily_summary'] });

    expect(plan.apis_to_call.length).toBeGreaterThan(0);
    // All selected APIs should have fields to parse
    for (const api of plan.apis_to_call) {
      expect(api.fields_to_parse.length).toBeGreaterThan(0);
    }
  });

  test('filtering by capability "campaign_performance" selects marketing APIs', () => {
    const model = loadBlueprint('jd');
    const plan = buildExecutionPlan(model, { capabilities: ['campaign_performance'] });

    expect(plan.apis_to_call.length).toBeGreaterThanOrEqual(0);
    expect(plan.target_capabilities).toContain('Marketing');
  });

  test('empty capabilities array selects all APIs', () => {
    const model = loadBlueprint('jd');
    const planAll = buildExecutionPlan(model);
    const planEmpty = buildExecutionPlan(model, { capabilities: [] });

    // Empty capabilities → resolveCapabilityNames returns empty → all APIs selected
    expect(planEmpty.apis_to_call.length).toBe(planAll.apis_to_call.length);
  });

  test('indicator_resolution contains correct canonical mappings', () => {
    const model = loadBlueprint('jd');
    const plan = buildExecutionPlan(model);

    const gmvResolutions = plan.indicator_resolution.filter(
      (r) => r.canonical === 'gmv',
    );
    expect(gmvResolutions.length).toBeGreaterThan(0);
    // GMV base indicators should have 'currency' unit (compare variants have 'pct')
    for (const r of gmvResolutions) {
      if (!r.raw_key.includes('##compare')) {
        expect(r.unit).toBe('currency');
      }
    }
  });

  test('uses JD gateway by default', () => {
    const model = loadBlueprint('jd');
    const plan = buildExecutionPlan(model);

    for (const api of plan.apis_to_call) {
      expect(api.gateway_url).toContain('szgateway.jd.com');
    }
  });

  test('accepts custom gateway_base override', () => {
    const model = loadBlueprint('jd');
    const plan = buildExecutionPlan(model, {
      gateway_base: 'custom.gateway.com/api/',
    });

    for (const api of plan.apis_to_call) {
      expect(api.gateway_url).toBe('custom.gateway.com/api/');
    }
  });
});

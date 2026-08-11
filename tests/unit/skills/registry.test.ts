// Tests for skill registry — intent matching and skill resolution.
// P0006: Validates pattern matching, HermesAgent fallback, and skill resolution.

import { describe, test, expect } from 'vitest';
import { resolveSkill, listSkills } from '#app/skills/registry.js';

describe('Skill Registry', () => {
  test('listSkills returns all catalog entries', () => {
    const skills = listSkills();
    expect(skills.length).toBeGreaterThanOrEqual(4);
    expect(skills.find((s) => s.name === 'collect_data')).toBeDefined();
    expect(skills.find((s) => s.name === 'analyze_ranking')).toBeDefined();
    expect(skills.find((s) => s.name === 'query_signals')).toBeDefined();
    expect(skills.find((s) => s.name === 'general_question')).toBeDefined();
  });

  test('resolveSkill returns correct skill for known name', () => {
    const skill = resolveSkill('collect_data');
    expect(skill.name).toBe('collect_data');
    expect(skill.handler).toBe('kernel.execute');
  });

  test('resolveSkill falls back to general_question for unknown name', () => {
    const skill = resolveSkill('nonexistent_skill');
    expect(skill.name).toBe('general_question');
  });

  test('resolveSkill falls back for empty string', () => {
    const skill = resolveSkill('');
    expect(skill.name).toBe('general_question');
  });

  test('collect_data skill has kernel handler type', () => {
    const skill = resolveSkill('collect_data');
    expect(skill.handlerType).toBe('kernel');
    expect(['kernel.execute', 'kernel.executeLiveCDP', 'kernel.executeImport']).toContain(skill.handler);
  });

  test('analyze_ranking skill has orchestrator handler type', () => {
    const skill = resolveSkill('analyze_ranking');
    expect(skill.handlerType).toBe('orchestrator');
    expect(skill.handler).toBe('orchestrator.rank');
  });

  test('query_signals skill has facade handler type', () => {
    const skill = resolveSkill('query_signals');
    expect(skill.handlerType).toBe('facade');
  });
});

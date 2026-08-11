// Tests for skill definitions — validates the skill catalog structure.
// P0006: Skills are data, not code. These tests validate the data integrity.

import { describe, test, expect } from 'vitest';
import { SKILL_CATALOG, getSkillByName, skillListForPrompt } from '#app/skills/definitions.js';

describe('Skill Catalog', () => {
  test('every skill has required fields with valid values', () => {
    expect(SKILL_CATALOG.length).toBeGreaterThanOrEqual(5);

    for (const skill of SKILL_CATALOG) {
      expect(skill.name).toBeTruthy();
      expect(skill.displayName).toBeTruthy();
      expect(skill.description).toBeTruthy();
      expect(skill.intentPatterns.length).toBeGreaterThan(0);
      expect(['kernel', 'orchestrator', 'facade']).toContain(skill.handlerType);
      expect(skill.handler).toBeTruthy();
      expect(skill.responseTemplate).toBeTruthy();
    }
  });

  test('all skill names are unique', () => {
    const names = SKILL_CATALOG.map((s) => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  test('all skill handlers reference valid subsystems', () => {
    const validHandlers = [
      'kernel.execute',
      'kernel.executeLiveCDP',
      'kernel.executeImport',
      'orchestrator.rank',
      'facade.signals',
      'facade.evidence',
      'facade.memory',
      'facade.products',
      'bridge.discover',
    ];

    for (const skill of SKILL_CATALOG) {
      expect(validHandlers).toContain(skill.handler);
    }
  });

  test('getSkillByName returns correct skill or undefined', () => {
    expect(getSkillByName('collect_data')?.name).toBe('collect_data');
    expect(getSkillByName('nonexistent')).toBeUndefined();
  });

  test('skillListForPrompt includes all skill names', () => {
    const prompt = skillListForPrompt();
    for (const skill of SKILL_CATALOG) {
      expect(prompt).toContain(skill.name);
    }
  });
});

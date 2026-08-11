// Skill Registry — intent matching and handler dispatch.
// P0006: The registry bridges user intents (natural language) → skill handlers
// (Runtime Kernel, Orchestrator, or Facade operations).
//
// Two-phase intent matching:
//   1. Fast pattern matching against skill.intentPatterns (no LLM cost)
//   2. HermesAgent classification fallback for ambiguous or unmatched intents

import { SKILL_CATALOG, skillListForPrompt } from './definitions.js';
import type { SkillDefinition} from './definitions.js';
import type { HermesClient } from '#platform/runtime/hermes/types.js';
import { HermesOneShotRequestSchema } from '#platform/runtime/hermes/types.js';

// ---- Result Types ----

export interface SkillMatchResult {
  /** The matched skill */
  skill: SkillDefinition;
  /** How the match was made */
  method: 'pattern' | 'hermes';
  /** Confidence score (0-1) */
  confidence: number;
}

export interface SkillDispatchContext {
  platform?: string;
  shopId?: string;
  shopName?: string;
  date?: string;
  profile?: string;
}

export interface SkillDispatchResult {
  skill: SkillDefinition;
  success: boolean;
  /** Structured execution result from the handler */
  data: Record<string, unknown>;
  /** Error message if success is false */
  error?: string;
}

// ---- Intent Classification Prompt ----

const buildClassificationPrompt = (message: string): string => {
  const skills = skillListForPrompt();
  return [
    '你是一个意图分类器。根据用户消息，从以下技能列表中选择最匹配的一个技能。',
    '',
    '可用技能:',
    skills,
    '',
    '规则:',
    '- 只回复技能名称（如 collect_data），不要回复其他内容',
    '- 如果用户想获取/采集/拉取数据，选择 collect_data',
    '- 如果用户想看排名/榜单/哪个商品好，选择 analyze_ranking',
    '- 如果用户想查询具体数据/信号/指标，选择 query_signals',
    '- 如果用户想知道系统能获取什么数据/有什么能力/能分析什么，选择 discover_capability',
    '- 如果用户想分析流量/交易/商品/行业等具体业务问题，选择 discover_capability',
    '- 如果用户问系统能做什么或一般性问题，选择 general_question',
    '- 如果不确定，选择 general_question',
    '',
    `用户消息: ${message}`,
    '',
    '技能名称:',
  ].join('\n');
};

/** Parse the classification response from HermesAgent into a skill name. */
const parseClassification = (response: string): string => {
  // Extract the first line that matches a known skill name
  const cleaned = response.trim().toLowerCase();
  for (const skill of SKILL_CATALOG) {
    if (cleaned.includes(skill.name)) return skill.name;
  }
  // Fallback: try to find any skill name in the response
  const lines = cleaned.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const match = SKILL_CATALOG.find((s) => s.name === trimmed);
    if (match) return match.name;
  }
  return 'general_question';
};

// ---- Pattern Matching ----

/**
 * Fast pattern-based intent matching.
 * Checks user message against each skill's intentPatterns.
 * Returns the best match or null if no pattern matches.
 */
const matchByPattern = (message: string): SkillDefinition | null => {
  const lower = message.toLowerCase();
  let bestMatch: SkillDefinition | null = null;
  let bestScore = 0;

  for (const skill of SKILL_CATALOG) {
    for (const pattern of skill.intentPatterns) {
      const lowerPattern = pattern.toLowerCase();
      // Exact match or substring match
      if (lower === lowerPattern) {
        return skill; // Exact match — return immediately
      }
      if (lower.includes(lowerPattern)) {
        const score = lowerPattern.length / lower.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = skill;
        }
      }
    }
  }

  return bestMatch;
};

// ---- Registry API ----

/**
 * Match a user message to a skill.
 *
 * Phase 1: Fast pattern matching against intentPatterns.
 * Phase 2: HermesAgent classification for ambiguous or unmatched intents.
 *
 * @param message - User's natural language message
 * @param hermes - HermesClient for LLM classification (only called if pattern matching fails)
 * @returns The matched skill with method and confidence
 */
export const matchIntent = async (
  message: string,
  hermes: HermesClient,
): Promise<SkillMatchResult> => {
  // Phase 1: Pattern matching
  const patternMatch = matchByPattern(message);
  if (patternMatch) {
    return { skill: patternMatch, method: 'pattern', confidence: 0.85 };
  }

  // Phase 2: HermesAgent classification
  try {
    const prompt = buildClassificationPrompt(message);
    const result = await hermes.oneShot(
      HermesOneShotRequestSchema.parse({ prompt, safeMode: true }),
    );
    const skillName = parseClassification(result.stdout);
    const skill = SKILL_CATALOG.find((s) => s.name === skillName) ??
      SKILL_CATALOG.find((s) => s.name === 'general_question')!;
    return { skill, method: 'hermes', confidence: 0.7 };
  } catch {
    // Hermes unavailable — fallback to general_question
    const fallback = SKILL_CATALOG.find((s) => s.name === 'general_question')!;
    return { skill: fallback, method: 'pattern', confidence: 0.3 };
  }
};

/**
 * Build a response generation prompt by binding execution result data
 * into the skill's response template.
 */
export const buildResponsePrompt = (
  skill: SkillDefinition,
  dispatchResult: SkillDispatchResult,
  userMessage: string,
): string => {
  let prompt = skill.responseTemplate;

  // Bind known placeholders
  const bindings: Record<string, string> = {
    userMessage,
    ...(dispatchResult.data as Record<string, string>),
  };

  for (const [key, value] of Object.entries(bindings)) {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
  }

  return prompt;
};

/**
 * Generate a natural language response using HermesAgent.
 *
 * @param skill - The skill that was executed
 * @param dispatchResult - The result from skill execution
 * @param userMessage - The original user message
 * @param hermes - HermesClient for response generation
 */
export const generateResponse = async (
  skill: SkillDefinition,
  dispatchResult: SkillDispatchResult,
  userMessage: string,
  hermes: HermesClient,
): Promise<string> => {
  const prompt = buildResponsePrompt(skill, dispatchResult, userMessage);
  try {
    const result = await hermes.oneShot(
      HermesOneShotRequestSchema.parse({ prompt }),
    );
    return result.stdout.trim();
  } catch {
    // Hermes unavailable — return a structured summary
    if (!dispatchResult.success) {
      return `操作未能完成: ${dispatchResult.error ?? '未知错误'}`;
    }
    const summary = dispatchResult.data['summary'] as string | undefined;
    return summary ?? `${skill.displayName} 执行完成。`;
  }
};

/**
 * List all available skills for display purposes.
 */
export const listSkills = (): readonly SkillDefinition[] => SKILL_CATALOG;

/**
 * Get a skill definition by name, with fallback to general_question.
 */
export const resolveSkill = (name: string): SkillDefinition =>
  SKILL_CATALOG.find((s) => s.name === name) ??
  SKILL_CATALOG.find((s) => s.name === 'general_question')!;

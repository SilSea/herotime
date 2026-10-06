import { DEFAULT_COMBAT_RULES, DEFAULT_CONFIG, type CombatRules, type GameConfig } from "./config.js";

/** GameConfig numbers that MODIFY_RULE may change per player. */
export const GAME_RULE_KEYS = [
  "startEnergy",
  "energyPerTurn",
  "maxEnergy",
  "buyCost",
  "sellValue",
  "refreshCost",
  "boardSize",
  "handSize",
  "maxRank",
] as const satisfies readonly (keyof GameConfig)[];
type GameRuleKey = (typeof GAME_RULE_KEYS)[number];

export const COMBAT_RULE_KEYS = Object.keys(DEFAULT_COMBAT_RULES) as (keyof CombatRules)[];

/** Rules that do not exist in GameConfig/CombatRules. */
const EXTRA_RULES: Readonly<Record<string, number>> = { freeRefreshesPerTurn: 0 };

/** Anything that owns per-player rule overrides (PlayerState). */
export interface RuleHolder {
  rules: Record<string, number>;
}

export function isRule(rule: string): boolean {
  return (
    (GAME_RULE_KEYS as readonly string[]).includes(rule) ||
    (COMBAT_RULE_KEYS as readonly string[]).includes(rule) ||
    rule in EXTRA_RULES
  );
}

export function ruleDefault(rule: string, cfg: GameConfig = DEFAULT_CONFIG): number {
  if ((GAME_RULE_KEYS as readonly string[]).includes(rule)) return cfg[rule as GameRuleKey];
  if (rule in DEFAULT_COMBAT_RULES) return cfg.combatDefaults?.[rule as keyof CombatRules] ?? DEFAULT_COMBAT_RULES[rule as keyof CombatRules];
  const extra = EXTRA_RULES[rule];
  if (extra !== undefined) return extra;
  throw new Error(`unknown rule "${rule}"`);
}

/** The game config as this player sees it (their MODIFY_RULE overrides applied). */
export function withRules(holder: RuleHolder, cfg: GameConfig = DEFAULT_CONFIG): GameConfig {
  const out: GameConfig = { ...cfg };
  for (const key of GAME_RULE_KEYS) {
    const v = holder.rules[key];
    if (v !== undefined) out[key] = v;
  }
  return out;
}

export function combatRulesOf(holder: RuleHolder): Partial<CombatRules> {
  const out: Partial<CombatRules> = {};
  for (const key of COMBAT_RULE_KEYS) {
    const v = holder.rules[key];
    if (v !== undefined) out[key] = v;
  }
  return out;
}

export function ruleValue(holder: RuleHolder, rule: string, cfg: GameConfig = DEFAULT_CONFIG): number {
  return holder.rules[rule] ?? ruleDefault(rule, cfg);
}

export function modifyRule(
  holder: RuleHolder,
  rule: string,
  op: "SET" | "ADD" | "MUL",
  value: number,
  cfg: GameConfig = DEFAULT_CONFIG,
): void {
  const current = ruleValue(holder, rule, cfg); // throws for an unknown rule
  holder.rules[rule] = op === "SET" ? value : op === "ADD" ? current + value : current * value;
}

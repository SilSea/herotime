/** All tunable numbers from docs/RULES.md. Override per ContentVersion/lobby. */
export interface GameConfig {
  startEnergy: number;
  energyPerTurn: number;
  maxEnergy: number;
  buyCost: number;
  sellValue: number;
  refreshCost: number;
  /** upgradeBaseCost[i] = cost to go from rank i+1 to rank i+2. */
  upgradeBaseCost: readonly number[];
  maxRank: number;
  /** shopSize[i] = shop slots at rank i+1. */
  shopSize: readonly number[];
  boardSize: number;
  handSize: number;
  /** Copies of each card in the shared pool, by rank. */
  poolCopies: Readonly<Record<number, number>>;
  damageCap: number;
  damageCapUntilTurn: number;
  /** Safety valve so combat always terminates. */
  maxAttacksPerCombat: number;
  /** Combat rule defaults for this content (anything missing uses DEFAULT_COMBAT_RULES). */
  combatDefaults?: Partial<CombatRules>;
}

/**
 * Rule values that cards, relics and heroes may change with MODIFY_RULE.
 * The engine reads every one of these through a player's rules, never as a literal.
 */
export interface CombatRules {
  /** Distinct Sentai colors needed for Roll Call (Extra is a wildcard). */
  rollCallColors: number;
  /** Stat bonus every Sentai gets in a fight where Roll Call fires. */
  rollCallBuff: number;
  /** Adjacent GATTAI units needed to merge. */
  gattaiSize: number;
  /** The Giant enters once this many (or fewer) of your units are alive. */
  giantEntryThreshold: number;
  /** Share of your Sentai's total ATK/HP added to the Giant's base stats (1 = all of it). */
  giantSentaiScale: number;
  /** Stat multiplier when a KYODAIKA unit rises. */
  kyodaikaMultiplier: number;
}

/** Faction key that Roll Call and Giant scaling look at. */
export const SENTAI_FACTION = "sentai";

export const DEFAULT_COMBAT_RULES: CombatRules = {
  rollCallColors: 5,
  rollCallBuff: 1,
  gattaiSize: 3,
  giantEntryThreshold: 2,
  giantSentaiScale: 1,
  kyodaikaMultiplier: 2,
};

/** The game config a content set's rules produce: engine defaults with the set's numbers on top. */
export function configFromRules(rules: Readonly<Record<string, number | undefined>> = {}): GameConfig {
  const cfg: GameConfig = { ...DEFAULT_CONFIG };
  const combat: Partial<CombatRules> = {};
  for (const [k, v] of Object.entries(rules)) {
    if (v === undefined) continue;
    if (k in DEFAULT_COMBAT_RULES) (combat as Record<string, number>)[k] = v;
    else if (k in DEFAULT_CONFIG && typeof (DEFAULT_CONFIG as unknown as Record<string, unknown>)[k] === "number") (cfg as unknown as Record<string, number>)[k] = v;
  }
  if (Object.keys(combat).length > 0) cfg.combatDefaults = combat;
  return cfg;
}

export const DEFAULT_CONFIG: GameConfig = {
  startEnergy: 3,
  energyPerTurn: 1,
  maxEnergy: 10,
  buyCost: 3,
  sellValue: 1,
  refreshCost: 1,
  upgradeBaseCost: [5, 7, 8, 9, 11],
  maxRank: 6,
  shopSize: [3, 4, 4, 5, 5, 6],
  boardSize: 7,
  handSize: 10,
  poolCopies: { 1: 16, 2: 15, 3: 13, 4: 11, 5: 9, 6: 7 },
  damageCap: 15,
  damageCapUntilTurn: 8,
  maxAttacksPerCombat: 500,
};

/** No stat grows past this (chains of copies and own-stat buffs could otherwise run away). */
export const STAT_CAP = 999_999;
export const capStat = (n: number): number => Math.min(n, STAT_CAP);

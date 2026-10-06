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

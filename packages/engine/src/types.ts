import type { Effect, KeywordKey, SentaiColor } from "@herotime/shared";
import type { CombatRules } from "./config.js";

export type Keyword = KeywordKey;
export type Side = "A" | "B";

/** A unit as it enters combat (already includes recruit-phase buffs). */
export interface CombatUnitInput {
  cardKey: string;
  rank: number;
  atk: number;
  hp: number;
  keywords?: readonly Keyword[];
  effects?: readonly Effect[];
  factions?: readonly string[];
  colors?: readonly SentaiColor[];
  series?: string;
  golden?: boolean;
  /** Identifies the owned unit so permanent in-combat buffs can be written back. */
  sourceId?: string;
}

export interface CombatSideExtras {
  /** The Giant Robo in the player's Giant Slot (base stats; Sentai scaling is added in combat). */
  giant?: CombatUnitInput;
  /** Player-scope START_OF_COMBAT effects: relics and active Series Bonds. */
  playerEffects?: readonly Effect[];
  rules?: Partial<CombatRules>;
}

export type CombatEvent =
  | { type: "ATTACK"; attacker: string; target: string; damageToTarget: number; damageToAttacker: number }
  | { type: "BARRIER_POP"; unit: string }
  | { type: "REVIVE"; unit: string }
  | { type: "DEATH"; unit: string }
  | { type: "BUFF"; unit: string; atk: number; hp: number }
  | { type: "EFFECT_DAMAGE"; unit: string; amount: number }
  | { type: "KEYWORD"; unit: string; keyword: Keyword }
  | { type: "SUMMON"; unit: string; cardKey: string; side: Side }
  | { type: "TRANSFORM"; unit: string; into: string }
  | { type: "KYODAIKA"; unit: string }
  | { type: "GATTAI"; units: string[]; into: string }
  | { type: "ROLL_CALL"; side: Side }
  | { type: "GIANT_ENTER"; unit: string; side: Side };

export interface CombatSurvivor {
  uid: string;
  cardKey: string;
  rank: number;
  atk: number;
  hp: number;
  sourceId?: string;
}

export interface CombatResult {
  winner: Side | "DRAW";
  survivorsA: CombatSurvivor[];
  survivorsB: CombatSurvivor[];
  events: CombatEvent[];
  attacks: number;
  /** Whether Roll Call fired for each side (feeds the Gauge). */
  rollCall: Record<Side, boolean>;
  /** Permanent buffs earned in combat, keyed by CombatUnitInput.sourceId. */
  permanent: Record<Side, Record<string, { atk: number; hp: number }>>;
}

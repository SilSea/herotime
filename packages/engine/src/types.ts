import type { Action, Effect, KeywordKey, SentaiColor } from "@herotime/shared";
import type { CombatRules } from "./config.js";
import type { Unit } from "./content.js";

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
  /** Unit cards in the player's hand (keys): SUMMON_FROM_HAND summons copies of them. */
  hand?: readonly string[];
}

/**
 * Events carry the state they leave behind (hp, atk, keywords), so a client can replay a fight by
 * just applying them in order, without knowing any rule. Order inside one attack: BARRIER_POPs,
 * then ATTACK (with both hp values after the hit), then DEATH / REVIVE / KYODAIKA / Last Stand effects.
 */
export type CombatEvent =
  | { type: "ATTACK"; attacker: string; target: string; damageToTarget: number; damageToAttacker: number; targetHp: number; attackerHp: number }
  | { type: "BARRIER_POP"; unit: string }
  /** A fight effect earned a recruit action (Energy, a card, Gauge...) for the start of the next turn. */
  | { type: "REWARD"; side: Side; unit: string | null; action: Action["type"] }
  | { type: "REVIVE"; unit: string; hp: number }
  /** `returns`: it stays in its slot because Revive or Kyodaika brings it straight back. */
  | { type: "DEATH"; unit: string; returns: boolean }
  | { type: "BUFF"; unit: string; atk: number; hp: number }
  | { type: "EFFECT_DAMAGE"; unit: string; amount: number; hp: number }
  /** An effect set its hp to 0; a DEATH follows once the board settles. */
  | { type: "DESTROY"; unit: string }
  | { type: "KEYWORD"; unit: string; keyword: Keyword }
  | { type: "SUMMON"; unit: string; cardKey: string; side: Side; index: number; atk: number; hp: number; keywords: Keyword[] }
  | { type: "TRANSFORM"; unit: string; into: string; atk: number; hp: number; keywords: Keyword[] }
  | { type: "KYODAIKA"; unit: string; atk: number; hp: number }
  | { type: "GATTAI"; units: string[]; into: string; cardKey: string; atk: number; hp: number; keywords: Keyword[] }
  | { type: "ROLL_CALL"; side: Side }
  | { type: "GIANT_ENTER"; unit: string; side: Side; cardKey: string; atk: number; hp: number; keywords: Keyword[] };

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
  /** Recruit actions fight effects earned (Energy, cards, Gauge...): the player gets them at the start of the next turn. */
  rewards: Record<Side, FightReward[]>;
}

/** A recruit action earned in a fight, given at the start of the next turn. */
export interface FightReward {
  action: Action;
  /** Golden multiplier of the unit that earned it. */
  mult: number;
  /** The card that earned it. */
  from: string | null;
  /** COPY to the hand: the card to add. */
  copy?: Unit;
}

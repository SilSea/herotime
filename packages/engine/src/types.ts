export type Keyword = "GUARD" | "BARRIER" | "RAPID" | "LETHAL" | "REVIVE" | "RIDER_KICK";

export type Side = "A" | "B";

/** A unit as it enters combat (already includes buffs from the recruit phase). */
export interface CombatUnitInput {
  cardKey: string;
  rank: number;
  atk: number;
  hp: number;
  keywords?: readonly Keyword[];
}

export type CombatEvent =
  | { type: "ATTACK"; attacker: string; target: string; damageToTarget: number; damageToAttacker: number }
  | { type: "BARRIER_POP"; unit: string }
  | { type: "REVIVE"; unit: string }
  | { type: "DEATH"; unit: string };

export interface CombatSurvivor {
  uid: string;
  cardKey: string;
  rank: number;
  atk: number;
  hp: number;
}

export interface CombatResult {
  winner: Side | "DRAW";
  survivorsA: CombatSurvivor[];
  survivorsB: CombatSurvivor[];
  events: CombatEvent[];
  attacks: number;
}

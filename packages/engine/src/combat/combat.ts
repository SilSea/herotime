import { DEFAULT_CONFIG, type GameConfig } from "../config.js";
import { Rng } from "../rng/rng.js";
import type {
  CombatEvent,
  CombatResult,
  CombatSurvivor,
  CombatUnitInput,
  Keyword,
  Side,
} from "../types.js";

interface Fighter {
  uid: string;
  cardKey: string;
  rank: number;
  atk: number;
  hp: number;
  keywords: Set<Keyword>;
  barrier: boolean;
  revived: boolean;
  kicked: boolean;
}

function build(units: readonly CombatUnitInput[], side: Side): Fighter[] {
  return units.map((u, i) => {
    const keywords = new Set<Keyword>(u.keywords ?? []);
    return {
      uid: `${side}${i}`,
      cardKey: u.cardKey,
      rank: u.rank,
      atk: u.atk,
      hp: u.hp,
      keywords,
      barrier: keywords.has("BARRIER"),
      revived: false,
      kicked: false,
    };
  });
}

function survivors(list: readonly Fighter[]): CombatSurvivor[] {
  return list.map((f) => ({ uid: f.uid, cardKey: f.cardKey, rank: f.rank, atk: f.atk, hp: f.hp }));
}

/**
 * Deterministic auto-battle. Same (boards, seed) always yields the same result,
 * so the server can store just the seed and re-derive any replay.
 */
export function simulateCombat(
  boardA: readonly CombatUnitInput[],
  boardB: readonly CombatUnitInput[],
  seed: number,
  config: Pick<GameConfig, "maxAttacksPerCombat"> = DEFAULT_CONFIG,
): CombatResult {
  const rng = new Rng(seed);
  const lists: Record<Side, Fighter[]> = { A: build(boardA, "A"), B: build(boardB, "B") };
  const next: Record<Side, number> = { A: 0, B: 0 };
  const events: CombatEvent[] = [];
  let attacks = 0;

  let turn: Side =
    boardA.length > boardB.length ? "A" : boardB.length > boardA.length ? "B" : rng.int(2) === 0 ? "A" : "B";

  const damage = (unit: Fighter, amount: number, lethal: boolean): void => {
    if (amount <= 0) return;
    if (unit.barrier) {
      unit.barrier = false;
      events.push({ type: "BARRIER_POP", unit: unit.uid });
      return;
    }
    unit.hp = lethal ? 0 : unit.hp - amount;
  };

  const settleDeaths = (): void => {
    for (const side of ["A", "B"] as const) {
      for (const f of lists[side]) {
        if (f.hp > 0) continue;
        if (f.keywords.has("REVIVE") && !f.revived) {
          f.revived = true;
          f.hp = 1;
          events.push({ type: "REVIVE", unit: f.uid });
        } else {
          events.push({ type: "DEATH", unit: f.uid });
        }
      }
      lists[side] = lists[side].filter((f) => f.hp > 0);
    }
  };

  while (lists.A.length > 0 && lists.B.length > 0) {
    if (attacks >= config.maxAttacksPerCombat) {
      return { winner: "DRAW", survivorsA: survivors(lists.A), survivorsB: survivors(lists.B), events, attacks };
    }

    const foe: Side = turn === "A" ? "B" : "A";
    const order = lists[turn];
    const idx = next[turn] % order.length;
    const attacker = order[idx] as Fighter;
    const swings = attacker.keywords.has("RAPID") ? 2 : 1;

    for (let s = 0; s < swings && attacker.hp > 0 && lists[foe].length > 0; s++) {
      const enemies = lists[foe];
      const guards = enemies.filter((e) => e.keywords.has("GUARD"));
      const target = rng.pick(guards.length > 0 ? guards : enemies);

      const kick = attacker.keywords.has("RIDER_KICK") && !attacker.kicked;
      attacker.kicked = true;
      const out = attacker.atk * (kick ? 2 : 1);
      const back = target.atk;

      attacks++;
      events.push({
        type: "ATTACK",
        attacker: attacker.uid,
        target: target.uid,
        damageToTarget: out,
        damageToAttacker: back,
      });
      damage(target, out, attacker.keywords.has("LETHAL"));
      damage(attacker, back, target.keywords.has("LETHAL"));
      settleDeaths();
    }

    // Advance this side's pointer past the attacker, accounting for removals.
    const current = lists[turn];
    const alivePos = current.indexOf(attacker);
    next[turn] =
      alivePos >= 0 ? alivePos + 1 : order.slice(0, idx).filter((f) => current.includes(f)).length;

    turn = foe;
  }

  const winner: Side | "DRAW" = lists.A.length > 0 ? "A" : lists.B.length > 0 ? "B" : "DRAW";
  return { winner, survivorsA: survivors(lists.A), survivorsB: survivors(lists.B), events, attacks };
}

/** Damage the winner deals to the loser's hero: base rank + survivor ranks, capped early game. */
export function heroDamage(
  baseRank: number,
  survivorRanks: readonly number[],
  turn: number,
  config: Pick<GameConfig, "damageCap" | "damageCapUntilTurn"> = DEFAULT_CONFIG,
): number {
  const raw = baseRank + survivorRanks.reduce((sum, r) => sum + r, 0);
  return turn <= config.damageCapUntilTurn ? Math.min(raw, config.damageCap) : raw;
}

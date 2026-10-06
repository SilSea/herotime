import { describe, expect, it } from "vitest";
import type { CombatUnitInput, Keyword } from "../types.js";
import { heroDamage, simulateCombat } from "./combat.js";

const unit = (
  cardKey: string,
  atk: number,
  hp: number,
  keywords: Keyword[] = [],
  rank = 1,
): CombatUnitInput => ({ cardKey, rank, atk, hp, keywords });

describe("simulateCombat", () => {
  it("is deterministic for the same boards and seed", () => {
    const a = [unit("a1", 3, 4), unit("a2", 2, 5), unit("a3", 4, 2)];
    const b = [unit("b1", 2, 6), unit("b2", 5, 3), unit("b3", 1, 1)];
    expect(simulateCombat(a, b, 99)).toEqual(simulateCombat(a, b, 99));
  });

  it("A wins when B has no units", () => {
    const r = simulateCombat([unit("a", 1, 1)], [], 1);
    expect(r.winner).toBe("A");
    expect(r.attacks).toBe(0);
    expect(r.survivorsA).toHaveLength(1);
  });

  it("both empty is a draw", () => {
    expect(simulateCombat([], [], 1).winner).toBe("DRAW");
  });

  it("the side with more units attacks first", () => {
    const r = simulateCombat([unit("a1", 1, 9), unit("a2", 1, 9)], [unit("b1", 1, 9)], 5);
    const first = r.events.find((e) => e.type === "ATTACK");
    expect(first && first.type === "ATTACK" && first.attacker.startsWith("A")).toBe(true);
  });

  it("units trade damage both ways", () => {
    const r = simulateCombat([unit("a", 3, 3)], [unit("b", 2, 4)], 1);
    const attack = r.events.find((e) => e.type === "ATTACK");
    expect(attack?.type).toBe("ATTACK");
    if (attack?.type === "ATTACK") {
      // damage dealt equals the other side's ATK, in both directions
      const [dealt, taken] = attack.attacker === "A0" ? [3, 2] : [2, 3];
      expect(attack.damageToTarget).toBe(dealt);
      expect(attack.damageToAttacker).toBe(taken);
    }
  });

  describe("GUARD", () => {
    it("forces attackers to hit the Guard first", () => {
      // "plain" is sturdy so it survives B's opening swing; otherwise A would
      // have only the Guard left to pick and the test would prove nothing.
      const a = [unit("a", 5, 50)];
      const b = [unit("plain", 1, 50), unit("guard", 1, 3, ["GUARD"])];
      let sawAttack = false;
      for (let seed = 0; seed < 25; seed++) {
        const r = simulateCombat(a, b, seed);
        // B has more units so B opens; A's first swing is the one under test.
        const aAttack = r.events.find((e) => e.type === "ATTACK" && e.attacker === "A0");
        if (aAttack?.type === "ATTACK") {
          sawAttack = true;
          expect(aAttack.target).toBe("B1");
        }
      }
      expect(sawAttack).toBe(true);
    });
  });

  describe("BARRIER", () => {
    it("absorbs the first hit completely", () => {
      const r = simulateCombat([unit("a", 5, 10)], [unit("b", 1, 100, ["BARRIER"])], 3);
      const firstPop = r.events.findIndex((e) => e.type === "BARRIER_POP");
      expect(firstPop).toBeGreaterThanOrEqual(0);
      const b = [...r.survivorsB, ...r.survivorsA].find((s) => s.uid === "B0");
      // after the first exchange B should have lost HP only from the second hit onward
      expect(b?.hp).toBeLessThan(100);
    });

    it("pops once per unit", () => {
      const r = simulateCombat([unit("a", 1, 50)], [unit("b", 1, 50, ["BARRIER"])], 3);
      expect(r.events.filter((e) => e.type === "BARRIER_POP")).toHaveLength(1);
    });
  });

  describe("LETHAL", () => {
    it("kills any unit it damages", () => {
      const r = simulateCombat([unit("a", 1, 1, ["LETHAL"])], [unit("tank", 1, 999)], 7);
      expect(r.events.some((e) => e.type === "DEATH" && e.unit === "B0")).toBe(true);
    });

    it("does nothing against Barrier on the first hit", () => {
      const r = simulateCombat([unit("a", 1, 5, ["LETHAL"])], [unit("b", 0, 50, ["BARRIER"])], 7);
      expect(r.events.some((e) => e.type === "BARRIER_POP" && e.unit === "B0")).toBe(true);
      expect(r.winner).toBe("A"); // second hit is lethal
    });
  });

  describe("RAPID", () => {
    it("attacks twice in one turn", () => {
      const r = simulateCombat([unit("a", 1, 100, ["RAPID"])], [unit("b", 1, 100)], 1);
      const aAttacks = r.events.filter((e) => e.type === "ATTACK" && e.attacker === "A0");
      const bAttacks = r.events.filter((e) => e.type === "ATTACK" && e.attacker === "B0");
      // over a capped fight A swings about twice as often as B
      expect(aAttacks.length).toBeGreaterThan(bAttacks.length);
    });
  });

  describe("RIDER_KICK", () => {
    it("doubles damage on the first attack only", () => {
      const r = simulateCombat([unit("a", 3, 50, ["RIDER_KICK"])], [unit("b", 1, 50)], 4);
      const hits = r.events.filter((e) => e.type === "ATTACK" && e.attacker === "A0");
      expect(hits[0]?.type === "ATTACK" && hits[0].damageToTarget).toBe(6);
      expect(hits[1]?.type === "ATTACK" && hits[1].damageToTarget).toBe(3);
    });
  });

  describe("REVIVE", () => {
    it("returns with 1 HP exactly once", () => {
      const r = simulateCombat([unit("a", 10, 50)], [unit("b", 1, 1, ["REVIVE"])], 2);
      // dies (Last Stand would fire here), comes back once, then dies for good
      const story = r.events
        .filter((e) => (e.type === "DEATH" || e.type === "REVIVE") && e.unit === "B0")
        .map((e) => e.type);
      expect(story).toEqual(["DEATH", "REVIVE", "DEATH"]);
      expect(r.winner).toBe("A");
    });

    it("comes back with exactly 1 HP (one more hit finishes it)", () => {
      // Whoever swings first, B takes 3 (direct hit or counter): dies -> revives at 1 HP.
      // The next exchange finishes it. Reviving with more HP would need a third exchange.
      const r = simulateCombat([unit("a", 3, 50)], [unit("b", 0, 1, ["REVIVE"])], 2);
      expect(r.events.filter((e) => e.type === "ATTACK")).toHaveLength(2);
      expect(r.winner).toBe("A");
    });
  });

  it("terminates as a DRAW when nobody can deal damage", () => {
    const r = simulateCombat([unit("a", 0, 5)], [unit("b", 0, 5)], 1, { maxAttacksPerCombat: 50 });
    expect(r.winner).toBe("DRAW");
    expect(r.attacks).toBe(50);
  });

  it("always terminates on random boards (fuzz)", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const mk = (n: number, tag: string) =>
        Array.from({ length: n }, (_, i) =>
          unit(`${tag}${i}`, (seed * (i + 3)) % 6, 1 + ((seed + i * 7) % 8), ((seed + i) % 3 === 0 ? ["GUARD"] : []) as Keyword[]),
        );
      const r = simulateCombat(mk(1 + (seed % 7), "a"), mk(1 + ((seed >> 1) % 7), "b"), seed, { maxAttacksPerCombat: 400 });
      expect(["A", "B", "DRAW"]).toContain(r.winner);
      expect(r.attacks).toBeLessThanOrEqual(400);
    }
  });
});

describe("heroDamage", () => {
  it("is base rank plus survivor ranks", () => {
    expect(heroDamage(3, [2, 4], 5)).toBe(9);
  });

  it("caps at 15 through turn 8", () => {
    expect(heroDamage(6, [6, 6, 6, 6], 8)).toBe(15);
  });

  it("is uncapped after the cap turn", () => {
    expect(heroDamage(6, [6, 6, 6, 6], 9)).toBe(30);
  });
});

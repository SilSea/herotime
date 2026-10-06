import type { SentaiColor } from "@herotime/shared";
import { describe, expect, it } from "vitest";
import { card, content, effect, fighter as f } from "../testing.js";
import type { CombatEvent, CombatUnitInput } from "../types.js";
import { simulateCombat } from "./combat.js";

const PRE = { maxAttacksPerCombat: 0 };
const ofType = (events: CombatEvent[], type: CombatEvent["type"]): CombatEvent[] => events.filter((e) => e.type === type);

const ranger = (color: SentaiColor, atk = 1, hp = 1): CombatUnitInput =>
  f(`ranger_${color}`, atk, hp, { factions: ["sentai"], colors: [color] });
const squad = (...colors: SentaiColor[]): CombatUnitInput[] => colors.map((c) => ranger(c));
const FIVE: SentaiColor[] = ["RED", "BLUE", "YELLOW", "GREEN", "PINK"];

describe("Roll Call", () => {
  it("fires with 5 distinct colors: buffs every Sentai and reports it", () => {
    const r = simulateCombat(squad(...FIVE), [f("foe", 1, 1)], 1, PRE);
    expect(r.rollCall).toEqual({ A: true, B: false });
    expect(ofType(r.events, "ROLL_CALL")).toHaveLength(1);
    for (const s of r.survivorsA) expect(s).toMatchObject({ atk: 2, hp: 2 });
  });

  it("does not fire with 4 colors", () => {
    const r = simulateCombat(squad("RED", "BLUE", "YELLOW", "GREEN"), [f("foe", 1, 1)], 1, PRE);
    expect(r.rollCall.A).toBe(false);
    expect(r.survivorsA[0]).toMatchObject({ atk: 1, hp: 1 });
  });

  it("does not fire for 5 units sharing colors", () => {
    expect(simulateCombat(squad("RED", "RED", "RED", "BLUE", "BLUE"), [f("foe", 1, 1)], 1, PRE).rollCall.A).toBe(false);
  });

  it("an Extra Ranger fills the missing color", () => {
    const r = simulateCombat(squad("RED", "BLUE", "YELLOW", "GREEN", "EXTRA"), [f("foe", 1, 1)], 1, PRE);
    expect(r.rollCall.A).toBe(true);
  });

  it("honours rollCallColors (Team Spirit Banner makes 4 enough)", () => {
    const four = squad("RED", "BLUE", "YELLOW", "GREEN");
    const r = simulateCombat(four, [f("foe", 1, 1)], 1, { ...PRE, a: { rules: { rollCallColors: 4 } } });
    expect(r.rollCall.A).toBe(true);
  });

  it("does not buff non-Sentai units", () => {
    const r = simulateCombat([...squad(...FIVE), f("bystander", 1, 1)], [f("foe", 1, 1)], 1, PRE);
    expect(r.survivorsA.find((s) => s.cardKey === "bystander")).toMatchObject({ atk: 1, hp: 1 });
  });

  it("honours rollCallBuff", () => {
    const r = simulateCombat(squad(...FIVE), [f("foe", 1, 1)], 1, { ...PRE, a: { rules: { rollCallBuff: 3 } } });
    expect(r.survivorsA[0]).toMatchObject({ atk: 4, hp: 4 });
  });
});

describe("Giant Robo", () => {
  const giant = f("zyuoh_king", 10, 10, { factions: ["mecha"] });
  const sentai = (atk: number, hp: number) => f("s", atk, hp, { factions: ["sentai"] });

  it("enters at once when the board is at or under the threshold", () => {
    const r = simulateCombat([sentai(2, 2), sentai(4, 4)], [f("foe", 1, 1)], 1, { ...PRE, a: { giant } });
    expect(ofType(r.events, "GIANT_ENTER")).toMatchObject([{ type: "GIANT_ENTER", unit: "Ag", side: "A", cardKey: "zyuoh_king", atk: 13, hp: 13 }]);
    expect(r.survivorsA.map((s) => s.uid)).toEqual(["A0", "A1", "Ag"]);
  });

  it("scales with half of the Sentai's total ATK/HP", () => {
    // sentai total atk 2+4=6, hp 2+4=6 -> +3/+3
    const r = simulateCombat([sentai(2, 2), sentai(4, 4)], [f("foe", 1, 1)], 1, { ...PRE, a: { giant } });
    expect(r.survivorsA.find((s) => s.uid === "Ag")).toMatchObject({ atk: 13, hp: 13 });
  });

  it("scaling uses the giantSentaiScale rule", () => {
    const r = simulateCombat([sentai(2, 2), sentai(4, 4)], [f("foe", 1, 1)], 1, {
      ...PRE,
      a: { giant, rules: { giantSentaiScale: 1 } },
    });
    expect(r.survivorsA.find((s) => s.uid === "Ag")).toMatchObject({ atk: 16, hp: 16 });
  });

  it("scaling includes the Roll Call buff", () => {
    const r = simulateCombat([...squad(...FIVE)], [f("foe", 1, 1)], 1, {
      ...PRE,
      a: { giant, rules: { giantEntryThreshold: 9 } },
    });
    // each ranger 2/2 after Roll Call: total 10 -> +5
    expect(r.survivorsA.find((s) => s.uid === "Ag")).toMatchObject({ atk: 15, hp: 15 });
  });

  it("stays out while the board is above the threshold", () => {
    const r = simulateCombat([sentai(1, 1), sentai(1, 1), sentai(1, 1)], [f("foe", 1, 1)], 1, { ...PRE, a: { giant } });
    expect(ofType(r.events, "GIANT_ENTER")).toHaveLength(0);
  });

  it("enters mid-fight once units fall to the threshold, and only once", () => {
    const board = [sentai(1, 1), sentai(1, 1), sentai(1, 1)];
    const r = simulateCombat(board, [f("foe", 9, 50)], 1, { a: { giant } });
    expect(ofType(r.events, "GIANT_ENTER")).toHaveLength(1);
    const firstDeath = r.events.findIndex((e) => e.type === "DEATH");
    const entry = r.events.findIndex((e) => e.type === "GIANT_ENTER");
    expect(entry).toBeGreaterThan(firstDeath);
  });

  it("honours giantEntryThreshold (Mecha Gauge Core: 3)", () => {
    const board = [sentai(1, 1), sentai(1, 1), sentai(1, 1)];
    const r = simulateCombat(board, [f("foe", 1, 1)], 1, { ...PRE, a: { giant, rules: { giantEntryThreshold: 3 } } });
    expect(ofType(r.events, "GIANT_ENTER")).toHaveLength(1);
  });

  it("enters when an enemy rises as Kyodaika, even with a full board", () => {
    const board = [sentai(9, 99), sentai(9, 99), sentai(9, 99), sentai(9, 99)];
    const kaijin = f("kaijin", 1, 1, { keywords: ["KYODAIKA"] });
    const r = simulateCombat(board, [kaijin], 1, { a: { giant } });
    const kyodaika = r.events.findIndex((e) => e.type === "KYODAIKA");
    const entry = r.events.findIndex((e) => e.type === "GIANT_ENTER");
    expect(kyodaika).toBeGreaterThanOrEqual(0);
    expect(entry).toBeGreaterThan(kyodaika);
  });

  it("can come in even when the board has already been wiped out", () => {
    const r = simulateCombat([sentai(1, 1)], [f("foe", 9, 20)], 1, { a: { giant: f("g", 30, 30) } });
    expect(r.winner).toBe("A"); // lone sentai entered together with its giant, which won
  });

  it("does nothing for a side without a Giant", () => {
    const r = simulateCombat([sentai(1, 1)], [f("foe", 1, 1)], 1, PRE);
    expect(ofType(r.events, "GIANT_ENTER")).toHaveLength(0);
  });

  describe("FINAL_BLOW", () => {
    const blow = f("blow", 5, 99, { keywords: ["FINAL_BLOW"] });
    const giantHits = (r: ReturnType<typeof simulateCombat>) =>
      r.events
        .filter((e): e is Extract<CombatEvent, { type: "ATTACK" }> => e.type === "ATTACK" && e.attacker === "Ag")
        .map((e) => e.damageToTarget);

    it("doubles the first attack only", () => {
      // 0 v 1: the wall's side attacks first, so the cap of 6 leaves the giant 3 swings
      const r = simulateCombat([], [f("wall", 0, 999)], 1, { maxAttacksPerCombat: 6, a: { giant: blow } });
      expect(giantHits(r)).toEqual([10, 5, 5]);
    });

    it("hits a giant (or a risen Kyodaika) twice as hard again", () => {
      // both boards empty: the only possible target is the enemy's (huge) giant
      const r = simulateCombat([], [], 1, {
        maxAttacksPerCombat: 6,
        a: { giant: blow },
        b: { giant: f("bg", 0, 999) },
      });
      expect(giantHits(r)).toEqual([20, 10, 10]);
    });

    it("also doubles against a Kyodaika that already rose", () => {
      const kaijin = f("kaijin", 0, 1, { keywords: ["KYODAIKA"] });
      const r = simulateCombat([], [kaijin], 1, { maxAttacksPerCombat: 8, a: { giant: blow } });
      const rose = r.events.findIndex((e) => e.type === "KYODAIKA");
      expect(rose).toBeGreaterThanOrEqual(0);
      const afterRise = r.events
        .slice(rose)
        .filter((e): e is Extract<CombatEvent, { type: "ATTACK" }> => e.type === "ATTACK" && e.attacker === "Ag");
      // The giant's first swing lands after the rise: x2 (first hit) x2 (huge target).
      // Against a plain target the same swing is only 10 (see "doubles the first attack only").
      expect(afterRise[0]?.damageToTarget).toBe(20);
    });
  });
});

describe("attack pointer", () => {
  const attackers = (r: ReturnType<typeof simulateCombat>, side: "A" | "B") =>
    r.events
      .filter((e): e is Extract<CombatEvent, { type: "ATTACK" }> => e.type === "ATTACK" && e.attacker.startsWith(side))
      .map((e) => e.attacker);

  it("a unit dying left of the pointer does not make the next attacker get skipped", () => {
    // B (4 units) goes first. Each time A's sniper attacks it destroys B's leftmost unit,
    // which is always to the LEFT of B's pointer. B must still go b0, b1, b2, b3 in order.
    const sniper = f("sniper", 0, 999, {
      effects: [effect({ trigger: "ON_ATTACK", target: { selector: "LEFTMOST_ENEMY" }, actions: [{ type: "DESTROY" }] })],
    });
    const a = [sniper, f("a1", 0, 999), f("a2", 0, 999)];
    const b = [0, 1, 2, 3].map((i) => f(`b${i}`, 1, 99));
    const r = simulateCombat(a, b, 1, { maxAttacksPerCombat: 7 });
    expect(attackers(r, "B")).toEqual(["B0", "B1", "B2", "B3"]);
  });

  it("a Last Stand summon left of the pointer does not shift whose turn it is", () => {
    // A goes first (3 v 2): A0 attacks, pointer -> A1. B's sniper then destroys A0, whose
    // Last Stand summons a token into slot 0. A1 must still be next, not the token.
    const token = card("token", { atk: 0, hp: 99 });
    const a0 = f("a0", 0, 999, { effects: [effect({ trigger: "LAST_STAND", actions: [{ type: "SUMMON", cardKey: "token" }] })] });
    const sniper = f("sniper", 0, 999, {
      effects: [effect({ trigger: "ON_ATTACK", target: { selector: "LEFTMOST_ENEMY" }, actions: [{ type: "DESTROY" }] })],
    });
    const r = simulateCombat([a0, f("a1", 0, 999), f("a2", 0, 999)], [sniper, f("b1", 0, 999)], 1, {
      content: content({ cards: [token] }),
      maxAttacksPerCombat: 3,
    });
    expect(attackers(r, "A")).toEqual(["A0", "A1"]);
  });
});

describe("attack order stays fair as units die", () => {
  it("no living unit is skipped when earlier units die (fuzz)", () => {
    for (let seed = 1; seed <= 300; seed++) {
      // A's 100-ATK units wipe whatever they touch; B's 1/1s die the moment they strike.
      const a = [f("a0", 100, 400), f("a1", 100, 400), f("a2", 100, 400)];
      const b = Array.from({ length: 3 + (seed % 3) }, (_, i) => f(`b${i}`, 1, 1));
      const r = simulateCombat(a, b, seed);

      const dead = new Set<string>();
      const struck = new Set<string>();
      for (const e of r.events) {
        if (e.type === "DEATH") dead.add(e.unit);
        if (e.type === "ATTACK" && e.attacker.startsWith("B")) {
          const idx = Number(e.attacker.slice(1));
          // every lower-index B unit must already have struck or died before this one attacks
          for (let j = 0; j < idx; j++) {
            const id = `B${j}`;
            expect(struck.has(id) || dead.has(id)).toBe(true);
          }
          struck.add(e.attacker);
        }
      }
    }
  });
});

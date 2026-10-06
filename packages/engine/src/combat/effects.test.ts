import { describe, expect, it } from "vitest";
import { card, content, effect, fighter as f } from "../testing.js";
import type { CombatEvent, CombatUnitInput } from "../types.js";
import { simulateCombat } from "./combat.js";

/** Stop right after the pre-fight phase so tests can inspect start-of-combat results. */
const PRE = { maxAttacksPerCombat: 0 };
const types = (events: CombatEvent[], type: CombatEvent["type"]): CombatEvent[] =>
  events.filter((e) => e.type === type);

const token = card("token", { atk: 1, hp: 1, token: true });
const fx = {
  summon: (count = 1) => effect({ trigger: "LAST_STAND", actions: [{ type: "SUMMON", cardKey: "token", count }] }),
};

describe("LAST_STAND", () => {
  it("summons into the dead unit's slot", () => {
    const grunt = f("grunt", 1, 1, { effects: [fx.summon()] });
    // 3 v 1: A attacks first, grunt (A0) trades with the lone enemy and dies
    const r = simulateCombat([grunt, f("mid", 1, 50), f("end", 1, 50)], [f("foe", 9, 100)], 1, {
      content: content({ cards: [token] }),
      maxAttacksPerCombat: 1,
    });
    expect(r.survivorsA.map((s) => s.cardKey)).toEqual(["token", "mid", "end"]);
    expect(types(r.events, "SUMMON")).toHaveLength(1);
  });

  it("fires on every death, including the one before a Revive", () => {
    const u = f("phoenix", 1, 1, { keywords: ["REVIVE"], effects: [fx.summon()] });
    const r = simulateCombat([u], [f("foe", 9, 100)], 3, { content: content({ cards: [token] }) });
    expect(types(r.events, "SUMMON")).toHaveLength(2);
    expect(types(r.events, "REVIVE")).toHaveLength(1);
  });

  it("a unit that comes back (Revive) gets its summons on its right", () => {
    const phoenix = f("phoenix", 1, 1, { keywords: ["REVIVE"], effects: [fx.summon()] });
    const r = simulateCombat([phoenix, f("mid", 1, 50), f("end", 1, 50)], [f("foe", 9, 100)], 1, {
      content: content({ cards: [token] }),
      maxAttacksPerCombat: 1,
    });
    expect(r.survivorsA.map((s) => s.cardKey)).toEqual(["phoenix", "token", "mid", "end"]);
  });

  it("a golden unit doubles the summon count", () => {
    const u = f("grunt", 1, 1, { golden: true, effects: [fx.summon()] });
    const r = simulateCombat([u], [f("foe", 9, 100)], 3, {
      content: content({ cards: [token] }),
      maxAttacksPerCombat: 1,
    });
    expect(types(r.events, "SUMMON")).toHaveLength(2);
  });

  it("respects the board limit", () => {
    const board = [f("grunt", 1, 1, { effects: [fx.summon(5)] }), ...Array.from({ length: 6 }, (_, i) => f(`x${i}`, 1, 50))];
    const r = simulateCombat(board, [f("foe", 9, 100)], 1, {
      content: content({ cards: [token] }),
      maxAttacksPerCombat: 1,
    });
    expect(types(r.events, "SUMMON")).toHaveLength(1); // 6 alive + 1 = 7, then full
  });

  it("needs content to summon", () => {
    const u = f("grunt", 1, 1, { effects: [fx.summon()] });
    expect(() => simulateCombat([u], [f("foe", 9, 100)], 1)).toThrow(/needs content/);
  });
});

describe("START_OF_COMBAT", () => {
  const teamUp = (n: number) =>
    effect({
      trigger: "START_OF_COMBAT",
      condition: { type: "TEAM_UP_COLORS_GTE", value: n },
      actions: [{ type: "BUFF", atk: 2, hp: 2 }],
    });

  it("applies when the Team-Up condition holds", () => {
    const red = f("red", 1, 1, { colors: ["RED"], effects: [teamUp(2)] });
    const r = simulateCombat([red, f("blue", 1, 1, { colors: ["BLUE"] })], [f("foe", 1, 1)], 1, PRE);
    expect(r.survivorsA[0]).toMatchObject({ atk: 3, hp: 3 });
  });

  it("does nothing when it does not", () => {
    const red = f("red", 1, 1, { colors: ["RED"], effects: [teamUp(2)] });
    const r = simulateCombat([red, f("pink", 1, 1, { colors: ["RED"] })], [f("foe", 1, 1)], 1, PRE);
    expect(r.survivorsA[0]).toMatchObject({ atk: 1, hp: 1 });
  });

  it("an Extra Ranger counts as a wildcard color", () => {
    const red = f("red", 1, 1, { colors: ["RED"], effects: [teamUp(2)] });
    const r = simulateCombat([red, f("extra", 1, 1, { colors: ["EXTRA"] })], [f("foe", 1, 1)], 1, PRE);
    expect(r.survivorsA[0]).toMatchObject({ atk: 3 });
  });

  it("filters ALL_FRIENDLY by faction", () => {
    const lead = f("lead", 1, 1, {
      effects: [
        effect({
          trigger: "START_OF_COMBAT",
          target: { selector: "ALL_FRIENDLY", faction: "rider" },
          actions: [{ type: "BUFF", atk: 1 }],
        }),
      ],
    });
    const r = simulateCombat(
      [lead, f("rider1", 1, 1, { factions: ["rider"] }), f("mecha1", 1, 1, { factions: ["mecha"] })],
      [f("foe", 1, 1)],
      1,
      PRE,
    );
    expect(r.survivorsA.map((s) => s.atk)).toEqual([1, 2, 1]);
  });

  it("RANDOM_FRIENDLY never picks the source and is deterministic", () => {
    const lead = f("lead", 1, 9, {
      effects: [effect({ trigger: "START_OF_COMBAT", target: { selector: "RANDOM_FRIENDLY" }, actions: [{ type: "BUFF", atk: 5 }] })],
    });
    const board = [lead, f("a", 1, 9), f("b", 1, 9), f("c", 1, 9)];
    for (let seed = 0; seed < 20; seed++) {
      const r = simulateCombat(board, [f("foe", 1, 9)], seed, PRE);
      expect(r.survivorsA[0]?.atk).toBe(1);
      expect(r.survivorsA.filter((s) => s.atk === 6)).toHaveLength(1);
      expect(simulateCombat(board, [f("foe", 1, 9)], seed, PRE)).toEqual(r);
    }
  });

  it("a golden unit scales the buff (default x2, or goldenMultiplier)", () => {
    const buff = (extra: object = {}) =>
      effect({ trigger: "START_OF_COMBAT", actions: [{ type: "BUFF", atk: 1, hp: 1 }], ...extra });
    const run = (fx: ReturnType<typeof buff>) =>
      simulateCombat([f("g", 1, 1, { golden: true, effects: [fx] })], [f("foe", 1, 1)], 1, PRE).survivorsA[0];
    expect(run(buff())).toMatchObject({ atk: 3, hp: 3 });
    expect(run(buff({ goldenMultiplier: 3 }))).toMatchObject({ atk: 4, hp: 4 });
  });

  it("player-scope effects (relics, series bonds) buff only their own side", () => {
    const relic = effect({
      scope: "PLAYER",
      trigger: "START_OF_COMBAT",
      target: { selector: "ALL_FRIENDLY" },
      actions: [{ type: "BUFF", atk: 1, hp: 1 }],
    });
    const r = simulateCombat([f("a", 1, 1)], [f("b", 1, 1)], 1, { ...PRE, a: { playerEffects: [relic] } });
    expect(r.survivorsA[0]).toMatchObject({ atk: 2, hp: 2 });
    expect(r.survivorsB[0]).toMatchObject({ atk: 1, hp: 1 });
  });

  it("ignores player effects with other triggers", () => {
    const relic = effect({
      scope: "PLAYER",
      trigger: "ON_TURN_START",
      target: { selector: "ALL_FRIENDLY" },
      actions: [{ type: "BUFF", atk: 9 }],
    });
    const r = simulateCombat([f("a", 1, 1)], [f("b", 1, 1)], 1, { ...PRE, a: { playerEffects: [relic] } });
    expect(r.survivorsA[0]?.atk).toBe(1);
  });
});

describe("other triggers and actions", () => {
  it("AVENGE fires every N friendly deaths", () => {
    const assassin = f("assassin", 0, 9, {
      effects: [
        effect({
          trigger: "START_OF_COMBAT",
          target: { selector: "ALL_FRIENDLY", faction: "fodder" },
          actions: [{ type: "DESTROY" }],
        }),
      ],
    });
    const avenger = f("avenger", 1, 9, {
      effects: [effect({ trigger: "AVENGE", every: 2, actions: [{ type: "BUFF", atk: 5 }] })],
    });
    const fodder = (i: number) => f(`fodder${i}`, 1, 1, { factions: ["fodder"] });
    const run = (n: number) =>
      simulateCombat([assassin, avenger, ...Array.from({ length: n }, (_, i) => fodder(i))], [f("foe", 1, 9)], 1, PRE)
        .survivorsA.find((s) => s.cardKey === "avenger")?.atk;
    expect(run(1)).toBe(1); // 1 death: not yet
    expect(run(2)).toBe(6); // 2 deaths: once
    expect(run(3)).toBe(6); // 3 deaths: still once
    expect(run(4)).toBe(11); // 4 deaths: twice
  });

  it("AFTER_DAMAGED fires for a unit that survives a hit, not one that dies", () => {
    const fx = effect({ trigger: "AFTER_DAMAGED", actions: [{ type: "BUFF", atk: 1 }] });
    const tough = simulateCombat([f("tough", 0, 10, { effects: [fx] })], [f("foe", 3, 50)], 1, { maxAttacksPerCombat: 1 });
    expect(tough.survivorsA[0]).toMatchObject({ atk: 1, hp: 7 });
    const frail = simulateCombat([f("frail", 0, 2, { effects: [fx] })], [f("foe", 3, 50)], 1, { maxAttacksPerCombat: 1 });
    expect(frail.survivorsA).toHaveLength(0);
  });

  it("AFTER_DAMAGED does not fire when a Barrier absorbed the hit", () => {
    const fx = effect({ trigger: "AFTER_DAMAGED", actions: [{ type: "BUFF", atk: 1 }] });
    const r = simulateCombat([f("shielded", 0, 10, { keywords: ["BARRIER"], effects: [fx] })], [f("foe", 3, 50)], 1, {
      maxAttacksPerCombat: 1,
    });
    expect(types(r.events, "BARRIER_POP")).toHaveLength(1);
    expect(r.survivorsA[0]).toMatchObject({ atk: 0, hp: 10 });
  });

  it("ON_ATTACK fires each time the unit attacks", () => {
    const fx = effect({ trigger: "ON_ATTACK", actions: [{ type: "BUFF", atk: 1 }] });
    const r = simulateCombat([f("a", 1, 99, { effects: [fx] }), f("pad", 1, 99)], [f("foe", 0, 999)], 1, {
      maxAttacksPerCombat: 1,
    });
    expect(r.survivorsA[0]?.atk).toBe(2);
  });

  it("BUFF permanent is reported back by sourceId; temporary is not", () => {
    const mk = (permanent: boolean) =>
      simulateCombat(
        [f("a", 1, 1, { sourceId: "board:0", effects: [effect({ trigger: "START_OF_COMBAT", actions: [{ type: "BUFF", atk: 2, hp: 1, permanent }] })] })],
        [f("foe", 1, 1)],
        1,
        PRE,
      );
    expect(mk(true).permanent.A).toEqual({ "board:0": { atk: 2, hp: 1 } });
    expect(mk(false).permanent.A).toEqual({});
    expect(mk(true).permanent.B).toEqual({});
  });

  it("GIVE_KEYWORD BARRIER grants a fresh barrier", () => {
    const fx = effect({ trigger: "START_OF_COMBAT", actions: [{ type: "GIVE_KEYWORD", keyword: "BARRIER" }] });
    const r = simulateCombat([f("a", 1, 5, { effects: [fx] })], [f("foe", 4, 50)], 1, { maxAttacksPerCombat: 1 });
    expect(types(r.events, "BARRIER_POP")).toHaveLength(1);
    expect(r.survivorsA[0]?.hp).toBe(5); // the first hit was absorbed (A0 is hit once)
  });

  it("DESTROY kills the target", () => {
    const fx = effect({ trigger: "START_OF_COMBAT", target: { selector: "LEFTMOST_ENEMY" }, actions: [{ type: "DESTROY" }] });
    const r = simulateCombat([f("a", 1, 5, { effects: [fx] })], [f("e1", 1, 99), f("e2", 1, 99)], 1, PRE);
    expect(r.survivorsB.map((s) => s.cardKey)).toEqual(["e2"]);
  });

  it("TRANSFORM swaps the unit for another card, keeping Golden scaling", () => {
    const big = card("big", { atk: 5, hp: 5 });
    const fx = effect({ trigger: "START_OF_COMBAT", actions: [{ type: "TRANSFORM", into: "big" }] });
    const run = (golden: boolean) =>
      simulateCombat([f("small", 1, 1, { golden, effects: [fx] })], [f("foe", 1, 1)], 1, {
        ...PRE,
        content: content({ cards: [big] }),
      }).survivorsA[0];
    expect(run(false)).toMatchObject({ cardKey: "big", atk: 5, hp: 5 });
    expect(run(true)).toMatchObject({ cardKey: "big", atk: 10, hp: 10 });
  });

  it("rejects non-combat actions", () => {
    const fx = effect({ trigger: "START_OF_COMBAT", actions: [{ type: "GAIN_ENERGY", amount: 1 }] });
    expect(() => simulateCombat([f("a", 1, 1, { effects: [fx] })], [f("foe", 1, 1)], 1)).toThrow(/not valid during combat/);
  });

  it("is deterministic with effects in play", () => {
    const fx = effect({ trigger: "START_OF_COMBAT", target: { selector: "RANDOM_ENEMY" }, actions: [{ type: "DAMAGE", amount: 2 }] });
    const a = [f("a1", 2, 5, { effects: [fx] }), f("a2", 3, 4)];
    const b = [f("b1", 2, 5), f("b2", 3, 4), f("b3", 1, 9)];
    expect(simulateCombat(a, b, 77)).toEqual(simulateCombat(a, b, 77));
  });
});

describe("KYODAIKA", () => {
  const kyo = (over: Partial<CombatUnitInput> = {}) => f("kaijin", 2, 3, { keywords: ["KYODAIKA", "GUARD"], ...over });

  it("rises once at double stats with no keywords", () => {
    const r = simulateCombat([kyo()], [f("foe", 10, 100)], 1, { maxAttacksPerCombat: 1 });
    expect(types(r.events, "KYODAIKA")).toHaveLength(1);
    expect(r.survivorsA[0]).toMatchObject({ atk: 4, hp: 6 });
  });

  it("loses its keywords when it rises (Guard no longer protects the team)", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const r = simulateCombat([kyo(), f("plain", 1, 999)], [f("foe", 1, 999)], seed, { maxAttacksPerCombat: 12 });
      const rose = r.events.findIndex((e) => e.type === "KYODAIKA");
      for (const e of r.events.slice(rose)) {
        if (e.type === "ATTACK" && e.attacker.startsWith("B")) seen.add(e.target);
      }
    }
    expect(seen.has("A1")).toBe(true); // the plain unit becomes targetable once the Guard is gone
  });

  it("dies for good the second time", () => {
    const r = simulateCombat([kyo()], [f("foe", 10, 100)], 1);
    expect(types(r.events, "KYODAIKA")).toHaveLength(1);
    expect(types(r.events, "DEATH").filter((e) => e.type === "DEATH" && e.unit === "A0")).toHaveLength(2);
    expect(r.winner).toBe("B");
  });

  it("scales with the kyodaikaMultiplier rule", () => {
    const r = simulateCombat([kyo()], [f("foe", 10, 100)], 1, { maxAttacksPerCombat: 1, a: { rules: { kyodaikaMultiplier: 3 } } });
    expect(r.survivorsA[0]).toMatchObject({ atk: 6, hp: 9 });
  });

  it("doubles max HP, not the damaged value", () => {
    // 5 HP unit hit down to 1 HP; it should return at 2 x 5, not 2 x 1
    const r = simulateCombat([f("k", 1, 5, { keywords: ["KYODAIKA"] })], [f("foe", 5, 100)], 1, { maxAttacksPerCombat: 1 });
    expect(r.survivorsA[0]).toMatchObject({ hp: 10 });
  });
});

describe("GATTAI", () => {
  const g = (name: string, atk = 1, hp = 2) => f(name, atk, hp, { keywords: ["GATTAI"] });
  const merged = (board: CombatUnitInput[], rules = {}) =>
    simulateCombat(board, [f("foe", 1, 1)], 1, { ...PRE, a: { rules } });

  it("merges 3 adjacent into one with summed stats", () => {
    const r = merged([g("g1"), g("g2"), g("g3"), f("solo", 1, 1)]);
    expect(r.survivorsA.map((s) => s.cardKey)).toEqual(["g1", "solo"]);
    expect(r.survivorsA[0]).toMatchObject({ atk: 3, hp: 6 });
    expect(types(r.events, "GATTAI")).toHaveLength(1);
  });

  it("does not merge a run that is too short or broken up", () => {
    expect(merged([g("g1"), g("g2")]).survivorsA).toHaveLength(2);
    expect(merged([g("g1"), g("g2"), f("wall", 1, 1), g("g3")]).survivorsA).toHaveLength(4);
  });

  it("honours the gattaiSize rule", () => {
    const r = merged([g("g1"), g("g2")], { gattaiSize: 2 });
    expect(r.survivorsA).toHaveLength(1);
    expect(r.survivorsA[0]).toMatchObject({ atk: 2, hp: 4 });
  });

  it("merges the whole run, and separate runs independently", () => {
    const r = merged([g("a1"), g("a2"), g("a3"), g("a4"), f("wall", 1, 1), g("b1"), g("b2"), g("b3")]);
    expect(r.survivorsA).toHaveLength(3);
    expect(r.survivorsA[0]).toMatchObject({ atk: 4, hp: 8 });
    expect(r.survivorsA[2]).toMatchObject({ atk: 3, hp: 6 });
  });

  it("the merged unit inherits Guard from any member", () => {
    const board = [f("wall", 1, 99), f("g1", 1, 5, { keywords: ["GATTAI", "GUARD"] }), g("g2"), g("g3")];
    for (let seed = 1; seed <= 15; seed++) {
      const r = simulateCombat(board, [f("foe", 1, 999)], seed, { maxAttacksPerCombat: 6 });
      const foeHits = r.events.filter((e) => e.type === "ATTACK" && e.attacker.startsWith("B"));
      expect(foeHits.length).toBeGreaterThan(0);
      for (const h of foeHits) expect(h.type === "ATTACK" && h.target).toBe("Am0"); // the merged unit, never "wall"
    }
  });
});

describe("runaway content", () => {
  // Every friendly death makes the avenger destroy itself; its Last Stand summons another one: forever.
  const ouro = card("ouro", {
    effects: [
      effect({ trigger: "LAST_STAND", actions: [{ type: "SUMMON", cardKey: "ouro" }] }),
      effect({ trigger: "AVENGE", actions: [{ type: "DESTROY" }] }),
    ],
  });
  const loopWorld = content({ cards: [ouro] });
  const ouroInput = f("ouro", 1, 1, { effects: ouro.effects });

  it("ends as a draw instead of throwing", () => {
    // a second unit that dies at start kicks the chain off
    const killer = f("killer", 0, 1, {
      effects: [effect({ trigger: "START_OF_COMBAT", actions: [{ type: "DESTROY" }] })],
    });
    let result: ReturnType<typeof simulateCombat> | undefined;
    expect(() => {
      result = simulateCombat([killer, ouroInput], [f("foe", 1, 1)], 1, { content: loopWorld });
    }).not.toThrow();
    expect(result?.winner).toBe("DRAW");
  });

  it("an aborted fight stops fighting: no attacks happen after the chain starts", () => {
    const killer = f("killer", 0, 1, {
      effects: [effect({ trigger: "START_OF_COMBAT", actions: [{ type: "DESTROY" }] })],
    });
    const r = simulateCombat([killer, ouroInput], [f("foe", 1, 1)], 1, { content: loopWorld });
    expect(r.attacks).toBe(0);
  });
});

describe("events describe the state they leave behind (so a client can replay without rules)", () => {
  const find = <T extends CombatEvent["type"]>(events: CombatEvent[], type: T) =>
    events.find((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

  it("ATTACK reports both hp values after the hit, including a barrier-absorbed one", () => {
    const r = simulateCombat([f("a", 3, 10)], [f("b", 2, 9, { keywords: ["BARRIER"] })], 1, { maxAttacksPerCombat: 1 });
    const hit = find(r.events, "ATTACK");
    const [aIsAttacker] = [hit?.attacker === "A0"];
    // the shielded unit lost no hp from the first hit; the other took the counter-damage
    expect(aIsAttacker ? hit?.targetHp : hit?.attackerHp).toBe(9);
    expect(aIsAttacker ? hit?.attackerHp : hit?.targetHp).toBe(8); // the unshielded unit took the other side's 2 damage
    expect(r.events.findIndex((e) => e.type === "BARRIER_POP")).toBeLessThan(r.events.findIndex((e) => e.type === "ATTACK"));
  });

  it("SUMMON, TRANSFORM, KYODAIKA, REVIVE and GATTAI carry stats", () => {
    const tok = card("tok", { atk: 2, hp: 3, keywords: ["GUARD"] });
    const big = card("big", { atk: 6, hp: 7, keywords: ["RAPID"] });
    const w = content({ cards: [tok, big] });

    const summonTok = effect({ trigger: "LAST_STAND", actions: [{ type: "SUMMON", cardKey: "tok" }] });
    const s = simulateCombat([f("g", 1, 1, { effects: [summonTok] })], [f("foe", 9, 99)], 1, { content: content({ cards: [tok] }), maxAttacksPerCombat: 1 });
    expect(find(s.events, "SUMMON")).toMatchObject({ cardKey: "tok", atk: 2, hp: 3, keywords: ["GUARD"] });

    const tr = simulateCombat([f("a", 1, 1, { effects: [effect({ trigger: "START_OF_COMBAT", actions: [{ type: "TRANSFORM", into: "big" }] })] })], [f("foe", 1, 1)], 1, { ...PRE, content: w });
    expect(find(tr.events, "TRANSFORM")).toMatchObject({ into: "big", atk: 6, hp: 7, keywords: ["RAPID"] });

    const k = simulateCombat([f("k", 2, 3, { keywords: ["KYODAIKA"] })], [f("foe", 10, 100)], 1, { maxAttacksPerCombat: 1 });
    expect(find(k.events, "KYODAIKA")).toMatchObject({ atk: 4, hp: 6 });

    const rv = simulateCombat([f("p", 1, 1, { keywords: ["REVIVE"] })], [f("foe", 9, 100)], 3, { maxAttacksPerCombat: 1 });
    expect(find(rv.events, "REVIVE")).toMatchObject({ hp: 1 });

    const gt = simulateCombat([f("g1", 1, 2, { keywords: ["GATTAI"] }), f("g2", 2, 3, { keywords: ["GATTAI"] }), f("g3", 3, 4, { keywords: ["GATTAI", "GUARD"] })], [f("foe", 1, 1)], 1, PRE);
    expect(find(gt.events, "GATTAI")).toMatchObject({ units: ["A0", "A1", "A2"], cardKey: "g1", atk: 6, hp: 9, keywords: ["GUARD"] });
  });

  it("EFFECT_DAMAGE reports the hp left, and 0 dealt through a barrier", () => {
    const fxd = effect({ trigger: "START_OF_COMBAT", target: { selector: "LEFTMOST_ENEMY" }, actions: [{ type: "DAMAGE", amount: 3 }] });
    const plain = simulateCombat([f("a", 1, 9, { effects: [fxd] })], [f("b", 1, 10)], 1, PRE);
    expect(find(plain.events, "EFFECT_DAMAGE")).toMatchObject({ unit: "B0", amount: 3, hp: 7 });
    const shield = simulateCombat([f("a", 1, 9, { effects: [fxd] })], [f("b", 1, 10, { keywords: ["BARRIER"] })], 1, PRE);
    expect(find(shield.events, "EFFECT_DAMAGE")).toMatchObject({ unit: "B0", amount: 0, hp: 10 });
  });
});

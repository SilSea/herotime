import { fuzzWorld, randomSide, Rng, simulateCombat, type CombatEvent, type CombatRecord } from "@herotime/engine";
import { describe, expect, it } from "vitest";
import { applyEvent, buildSteps, describe as describeEvent, initialState, pickDelay, replayAll, standing, stepWeight, type Fighter, type ReplayState } from "../src/replay.js";

const unit = (cardKey: string, atk: number, hp: number, keywords: string[] = []) => ({ cardKey, rank: 1, atk, hp, keywords: keywords as never });
const names = (k: string): string => k.toUpperCase();

function record(a: ReturnType<typeof unit>[], b: ReturnType<typeof unit>[], events: CombatEvent[] = []): CombatRecord {
  return { boardA: a, boardB: b, result: { events } } as unknown as CombatRecord;
}
const ids = (fs: Fighter[]) => fs.map((f) => f.uid);

describe("replay equals the engine's own result", () => {
  it("on 3,000 random fights with random effects, keywords, Giants and Gattai", () => {
    const gen = new Rng(777);
    const problems: string[] = [];
    let withDeaths = 0;
    let withSummons = 0;
    for (let i = 0; i < 3000; i++) {
      const a = randomSide(gen, "a");
      const b = randomSide(gen, "b");
      const seed = gen.int(1_000_000);
      const result = simulateCombat(a.board, b.board, seed, { content: fuzzWorld, maxAttacksPerCombat: 120, a: a.extras, b: b.extras });
      const rec = { boardA: a.board, boardB: b.board, result } as unknown as CombatRecord;
      const state = replayAll(rec);
      for (const side of ["A", "B"] as const) {
        const got = standing(state, side).map((f) => [f.uid, f.cardKey, f.atk, f.hp]);
        const want = (side === "A" ? result.survivorsA : result.survivorsB).map((s) => [s.uid, s.cardKey, s.atk, s.hp]);
        if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`#${i} seed=${seed} side ${side}: replay ${JSON.stringify(got)} vs engine ${JSON.stringify(want)}`);
      }
      if (result.events.some((e) => e.type === "DEATH")) withDeaths++;
      if (result.events.some((e) => e.type === "SUMMON")) withSummons++;
    }
    expect(problems.slice(0, 5)).toEqual([]);
    expect(withDeaths).toBeGreaterThan(2000); // the fights really are eventful
    expect(withSummons).toBeGreaterThan(100);
  }, 120_000);
});

describe("applyEvent", () => {
  const start = (): ReplayState => initialState(record([unit("a1", 3, 5), unit("a2", 2, 4, ["BARRIER"])], [unit("b1", 4, 6)]));

  it("builds the opening lineup with positional uids and barrier from keywords", () => {
    const s = start();
    expect(ids(s.A)).toEqual(["A0", "A1"]);
    expect(ids(s.B)).toEqual(["B0"]);
    expect(s.A[1]).toMatchObject({ barrier: true, ghost: false, huge: false });
    expect(s.A[0]?.barrier).toBe(false);
  });

  it("never mutates the state it is given", () => {
    const s = start();
    const frozen = JSON.stringify(s);
    applyEvent(s, { type: "BUFF", unit: "A0", atk: 1, hp: 1 });
    applyEvent(s, { type: "DEATH", unit: "A0", returns: false });
    applyEvent(s, { type: "SUMMON", unit: "As0", cardKey: "t", side: "A", index: 0, atk: 1, hp: 1, keywords: [] });
    expect(JSON.stringify(s)).toBe(frozen);
  });

  it("ATTACK sets both hp values, on either side", () => {
    const s = applyEvent(start(), { type: "ATTACK", attacker: "B0", target: "A0", damageToTarget: 4, damageToAttacker: 3, targetHp: 1, attackerHp: 3 });
    expect(s.A[0]?.hp).toBe(1);
    expect(s.B[0]?.hp).toBe(3);
  });

  it("BARRIER_POP, BUFF, EFFECT_DAMAGE and KEYWORD change one unit only", () => {
    let s = start();
    s = applyEvent(s, { type: "BARRIER_POP", unit: "A1" });
    expect(s.A[1]?.barrier).toBe(false);
    s = applyEvent(s, { type: "BUFF", unit: "A0", atk: 2, hp: -1 });
    expect(s.A[0]).toMatchObject({ atk: 5, hp: 4 });
    s = applyEvent(s, { type: "EFFECT_DAMAGE", unit: "B0", amount: 2, hp: 4 });
    expect(s.B[0]?.hp).toBe(4);
    s = applyEvent(s, { type: "KEYWORD", unit: "A0", keyword: "BARRIER" });
    expect(s.A[0]).toMatchObject({ barrier: true });
    expect(s.A[0]?.keywords).toContain("BARRIER");
    s = applyEvent(s, { type: "KEYWORD", unit: "A0", keyword: "BARRIER" }); // no duplicates
    expect(s.A[0]?.keywords.filter((k) => k === "BARRIER")).toHaveLength(1);
    expect(s.A[1]).toMatchObject({ atk: 2 });
  });

  it("DEATH removes a unit, unless it is about to return", () => {
    const gone = applyEvent(start(), { type: "DEATH", unit: "A0", returns: false });
    expect(ids(gone.A)).toEqual(["A1"]);
    const ghost = applyEvent(start(), { type: "DEATH", unit: "A0", returns: true });
    expect(ids(ghost.A)).toEqual(["A0", "A1"]);
    expect(ghost.A[0]?.ghost).toBe(true);
    expect(standing(ghost, "A").map((f) => f.uid)).toEqual(["A1"]); // a ghost is not standing
  });

  it("REVIVE and KYODAIKA bring a ghost back in its own slot", () => {
    const dead = applyEvent(start(), { type: "DEATH", unit: "A0", returns: true });
    const revived = applyEvent(dead, { type: "REVIVE", unit: "A0", hp: 1 });
    expect(revived.A[0]).toMatchObject({ ghost: false, hp: 1, atk: 3 });
    const risen = applyEvent(dead, { type: "KYODAIKA", unit: "A0", atk: 6, hp: 10 });
    expect(risen.A[0]).toMatchObject({ ghost: false, atk: 6, hp: 10, huge: true, keywords: [], barrier: false });
  });

  it("SUMMON goes into the slot the engine chose", () => {
    const s = applyEvent(start(), { type: "SUMMON", unit: "As0", cardKey: "tok", side: "A", index: 1, atk: 1, hp: 1, keywords: ["GUARD"] });
    expect(ids(s.A)).toEqual(["A0", "As0", "A1"]);
    expect(s.A[1]).toMatchObject({ cardKey: "tok", keywords: ["GUARD"] });
  });

  it("TRANSFORM swaps the card and stats", () => {
    const s = applyEvent(start(), { type: "TRANSFORM", unit: "A0", into: "big", atk: 9, hp: 9, keywords: ["BARRIER"] });
    expect(s.A[0]).toMatchObject({ cardKey: "big", atk: 9, hp: 9, barrier: true });
  });

  it("GATTAI replaces the merged units with one, in the first one's place", () => {
    const s0 = initialState(record([unit("x", 1, 1), unit("g1", 1, 2), unit("g2", 1, 2), unit("g3", 1, 2), unit("y", 1, 1)], []));
    const s = applyEvent(s0, { type: "GATTAI", units: ["A1", "A2", "A3"], into: "Am0", cardKey: "g1", atk: 3, hp: 6, keywords: [] });
    expect(ids(s.A)).toEqual(["A0", "Am0", "A4"]);
    expect(s.A[1]).toMatchObject({ atk: 3, hp: 6 });
  });

  it("GIANT_ENTER appends a huge fighter on that side", () => {
    const s = applyEvent(start(), { type: "GIANT_ENTER", unit: "Bg", side: "B", cardKey: "king", atk: 8, hp: 8, keywords: ["FINAL_BLOW"] });
    expect(ids(s.B)).toEqual(["B0", "Bg"]);
    expect(s.B[1]).toMatchObject({ huge: true, cardKey: "king" });
  });

  it("ROLL_CALL changes nothing", () => {
    const s = start();
    expect(applyEvent(s, { type: "ROLL_CALL", side: "A" })).toBe(s);
  });
});

describe("steps and log text", () => {
  const rec = record([unit("red", 3, 5)], [unit("foe", 2, 3)], [
    { type: "ATTACK", attacker: "A0", target: "B0", damageToTarget: 3, damageToAttacker: 2, targetHp: 0, attackerHp: 3 },
    { type: "DEATH", unit: "B0", returns: false },
  ]);

  it("one step per event, each holding the state after it", () => {
    const { initial, steps } = buildSteps(rec, names);
    expect(steps).toHaveLength(2);
    expect(initial.B).toHaveLength(1);
    expect(steps[0]?.state.B[0]?.hp).toBe(0);
    expect(steps[1]?.state.B).toHaveLength(0);
    expect(steps[0]?.focus).toEqual(["A0", "B0"]);
  });

  it("writes readable log lines using card names", () => {
    const { steps } = buildSteps(rec, names);
    expect(steps[0]?.text).toBe("RED hits FOE for 3 and takes 2");
    expect(steps[1]?.text).toBe("FOE falls");
  });

  it("describes every event type without leftovers", () => {
    const base = initialState(record([unit("a", 1, 1)], [unit("b", 1, 1)]));
    const events: CombatEvent[] = [
      { type: "BARRIER_POP", unit: "A0" },
      { type: "BUFF", unit: "A0", atk: 2, hp: -1 },
      { type: "EFFECT_DAMAGE", unit: "A0", amount: 2, hp: 1 },
      { type: "EFFECT_DAMAGE", unit: "A0", amount: 0, hp: 1 },
      { type: "DESTROY", unit: "A0" },
      { type: "KEYWORD", unit: "A0", keyword: "GUARD" },
      { type: "SUMMON", unit: "As0", cardKey: "tok", side: "A", index: 0, atk: 1, hp: 1, keywords: [] },
      { type: "TRANSFORM", unit: "A0", into: "big", atk: 5, hp: 5, keywords: [] },
      { type: "DEATH", unit: "A0", returns: false },
      { type: "REVIVE", unit: "A0", hp: 1 },
      { type: "KYODAIKA", unit: "A0", atk: 4, hp: 4 },
      { type: "GATTAI", units: ["A0", "A1"], into: "Am0", cardKey: "m", atk: 3, hp: 3, keywords: [] },
      { type: "ROLL_CALL", side: "A" },
      { type: "GIANT_ENTER", unit: "Ag", side: "A", cardKey: "king", atk: 8, hp: 8, keywords: [] },
    ];
    for (const e of events) {
      const t = describeEvent(e, base, names);
      expect(t, e.type).not.toMatch(/undefined|NaN|\[object/);
      expect(t.length, e.type).toBeGreaterThan(3);
    }
    const text = (type: string, extra: object = {}) => describeEvent(events.find((e) => e.type === type && Object.entries(extra).every(([k, v]) => (e as never)[k] === v)) as CombatEvent, base, names);
    expect(text("BUFF")).toBe("A gets +2/-1");
    expect(text("EFFECT_DAMAGE", { amount: 0 })).toBe("A is not hurt");
    expect(text("DESTROY")).toBe("A is destroyed");
  });
});

describe("fight rewards in the log", () => {
  it("say who earned what for next turn, and change nothing on the field", () => {
    const rec = record([unit("miner", 1, 5)], [unit("foe", 2, 3)], [{ type: "REWARD", side: "A", unit: "A0", action: "GAIN_ENERGY" }]);
    const { initial, steps } = buildSteps(rec, names);
    expect(steps[0]?.state).toEqual(initial);
    expect(steps[0]?.text).toMatch(/earns Energy for next turn/);
    expect(steps[0]?.focus).toEqual(["A0"]);
  });
});

describe("pacing", () => {
  const steps = (n: number) => buildSteps(record([unit("a", 1, 1)], [unit("b", 1, 1)], Array.from({ length: n }, () => ({ type: "BUFF", unit: "A0", atk: 0, hp: 0 }) as CombatEvent)), names).steps;

  it("quick events weigh less than attacks", () => {
    expect(stepWeight({ type: "BARRIER_POP", unit: "A0" })).toBeLessThan(stepWeight({ type: "ATTACK", attacker: "A0", target: "B0", damageToTarget: 1, damageToAttacker: 1, targetHp: 1, attackerHp: 1 }));
    expect(stepWeight({ type: "ROLL_CALL", side: "A" })).toBeGreaterThan(1);
  });

  it("fits the budget when it can, and stays within the bounds when it cannot", () => {
    const s = steps(40); // 40 buffs x 0.35 = 14 weight units
    expect(pickDelay(s, 7000)).toBeCloseTo(500, 0);
    expect(pickDelay(s, 100)).toBe(60); // never faster than the minimum
    expect(pickDelay(s, 1_000_000)).toBe(650); // never slower than the maximum
    expect(pickDelay([], 5000)).toBe(650);
  });
});

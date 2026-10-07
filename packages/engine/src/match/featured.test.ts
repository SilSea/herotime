import { describe, expect, it } from "vitest";
import { card, content } from "../testing.js";
import { Match } from "./match.js";
import type { Entrant } from "./types.js";

const T0 = 1_000_000;
const humans = (n: number): Entrant[] => Array.from({ length: n }, (_, i) => ({ id: `h${i}`, name: `Human ${i}`, isBot: false }));

// Five rider series in one franchise, two sentai series in another, and one series with no franchise.
const RIDER = ["r1", "r2", "r3", "r4", "r5"];
const world = content({
  series: [
    ...RIDER.map((k) => ({ key: k, name: k, franchise: "kamen-rider", bonds: [] })),
    { key: "s1", name: "s1", franchise: "super-sentai", bonds: [] },
    { key: "s2", name: "s2", franchise: "super-sentai", bonds: [] },
    { key: "orig", name: "orig", bonds: [] },
  ],
  cards: [...RIDER, "s1", "s2", "orig"].map((s) => card(`${s}_unit`, { rank: 1, atk: 1, hp: 1, series: s })).concat([card("plain", { rank: 1, atk: 1, hp: 1 })]),
  heroes: [{ key: "h", name: "Hero", armor: 0, text: "", textTh: "" }],
} as never);

const start = (seed: number, featured?: number) =>
  Match.create({ content: world, seed, entrants: humans(2), now: T0, config: featured === undefined ? {} : { featuredSeriesPerFranchise: featured } });

describe("Featured Series", () => {
  it("a franchise with more series than the limit uses only that many; the others stay out of the pool", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = start(seed);
      const series = m.view("h0").series ?? [];
      const riders = series.filter((s) => RIDER.includes(s));
      expect(riders).toHaveLength(3);
      // small franchises and series without a franchise are always in
      expect(series).toEqual(expect.arrayContaining(["s1", "s2", "orig"]));
      for (const r of RIDER) expect(m.env.pool.count(`${r}_unit`) > 0).toBe(riders.includes(r));
      expect(m.env.pool.count("plain")).toBeGreaterThan(0);
    }
  });

  it("the pick changes from match to match", () => {
    const picks = new Set(Array.from({ length: 20 }, (_, i) => (start(i + 1).view("h0").series ?? []).join(",")));
    expect(picks.size).toBeGreaterThan(1);
  });

  it("0 keeps every series", () => {
    const m = start(1, 0);
    expect(m.view("h0").series).toBeUndefined();
    for (const r of RIDER) expect(m.env.pool.count(`${r}_unit`)).toBeGreaterThan(0);
  });
});

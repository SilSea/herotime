import { FactionDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";
import { describe, expect, it } from "vitest";
import { Content, type ContentData } from "../content.js";
import { runEffect } from "../game/effects.js";
import { offerRelics } from "../game/session.js";
import { newPlayer } from "../shop/economy.js";
import { card, content, effect } from "../testing.js";
import { Match } from "./match.js";
import type { Entrant } from "./types.js";

const f = (key: string) => FactionDef.parse({ key, name: key });
const relic = (key: string, over: Record<string, unknown> = {}) =>
  RelicDef.parse({ key, name: key, tier: "LESSER", cost: 2, ...over });

/** 3 factions, a multi-faction card, neutral cards, and series whose giants depend on the factions. */
function world(): Content {
  return content({
    factions: [f("rider"), f("sentai"), f("mecha")],
    series: [SeriesDef.parse({ key: "sk", name: "SK" }), SeriesDef.parse({ key: "rk", name: "RK" })],
    cards: [
      card("n1", { rank: 1 }),
      card("n2", { rank: 2 }),
      card("r1", { rank: 1, factions: ["rider"], series: "rk" }),
      card("r2", { rank: 2, factions: ["rider"], series: "rk" }),
      card("s1", { rank: 1, factions: ["sentai"], series: "sk" }),
      card("s2", { rank: 2, factions: ["sentai"], series: "sk" }),
      card("m1", { rank: 1, factions: ["mecha"] }),
      card("rm", { rank: 2, factions: ["rider", "mecha"] }),
      card("tok", { token: true, factions: ["sentai"] }),
      card("g_sk", { kind: "GIANT", series: "sk", rank: 6 }),
      card("g_rk", { kind: "GIANT", series: "rk", rank: 6 }),
      card("g_free", { kind: "GIANT", rank: 6 }),
    ],
    relics: [
      relic("rel_rider", { factions: ["rider"] }),
      relic("rel_sentai", { factions: ["sentai"] }),
      relic("rel_sk", { series: "sk" }),
      relic("rel_rk", { series: "rk" }),
      relic("rel_free", { cost: 0 }),
      relic("rel_plain"),
    ],
    heroes: [HeroDef.parse({ key: "h1", name: "h1" }), HeroDef.parse({ key: "h2", name: "h2" })],
  });
}

const humans: Entrant[] = [
  { id: "a", name: "A", isBot: false },
  { id: "b", name: "B", isBot: false },
];
const create = (config: Record<string, unknown> = {}, seed = 1, w: Content = world()) =>
  Match.create({ content: w, seed, entrants: humans, now: 0, config });
const poolKeys = (m: Match): string[] => [...m.env.content.cards.keys()].filter((k) => m.env.pool.has(k)).sort();

describe("content validation of factions", () => {
  const legacy = (cards: ReturnType<typeof card>[]) => new Content({ cards });

  it("content that declares no factions accepts any faction name", () => {
    expect(() => legacy([card("a", { factions: ["whatever"] })])).not.toThrow();
  });

  it("once factions are declared, unknown names on cards, relics and filters are reported", () => {
    const data = (over: ContentData): ContentData => ({ factions: [f("rider")], cards: [card("ok", { factions: ["rider"] })], ...over });
    expect(() => new Content(data({}))).not.toThrow();
    expect(() => new Content(data({ cards: [card("x", { factions: ["ghost"] })] }))).toThrow(/card "x" references unknown faction "ghost"/);
    expect(() => new Content(data({ relics: [relic("r", { factions: ["ghost"] })] }))).toThrow(/relic "r" references unknown faction "ghost"/);

    const byTarget = effect({ trigger: "START_OF_COMBAT", target: { selector: "ALL_FRIENDLY", faction: "ghost" }, actions: [{ type: "BUFF", atk: 1 }] });
    expect(() => new Content(data({ cards: [card("t", { effects: [byTarget] })] }))).toThrow(/unknown faction "ghost"/);

    const byCondition = effect({ trigger: "START_OF_COMBAT", condition: { type: "FACTION_COUNT_GTE", faction: "ghost", value: 1 }, actions: [{ type: "BUFF", atk: 1 }] });
    expect(() => new Content(data({ cards: [card("c", { effects: [byCondition] })] }))).toThrow(/unknown faction "ghost"/);
  });

  it("duplicate faction keys are rejected", () => {
    expect(() => new Content({ factions: [f("a"), f("a")], cards: [] })).toThrow(/duplicate faction key: a/);
  });
});

describe("which factions a match uses", () => {
  it("fixedFactions picks exactly those", () => {
    const m = create({ fixedFactions: ["rider", "mecha"] });
    expect([...(m.env.activeFactions ?? [])].sort()).toEqual(["mecha", "rider"]);
    expect(m.view("a").factions).toEqual(["mecha", "rider"]);
  });

  it("rejects an unknown fixed faction", () => {
    expect(() => create({ fixedFactions: ["ghost"] })).toThrow(/unknown faction in fixedFactions: ghost/);
  });

  it("factionsPerMatch picks that many at random, the same ones for the same seed", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const m = create({ factionsPerMatch: 2 }, seed);
      expect(m.env.activeFactions?.size).toBe(2);
      expect([...(create({ factionsPerMatch: 2 }, seed).env.activeFactions ?? [])].sort()).toEqual([...(m.env.activeFactions ?? [])].sort());
    }
  });

  it("different seeds give variety: every faction shows up somewhere", () => {
    const seen = new Set<string>();
    const combos = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const active = [...(create({ factionsPerMatch: 2 }, seed).env.activeFactions ?? [])].sort();
      active.forEach((x) => seen.add(x));
      combos.add(active.join("+"));
    }
    expect([...seen].sort()).toEqual(["mecha", "rider", "sentai"]);
    expect(combos.size).toBe(3); // all three pairs occur
  });

  it("only draws factions that have units in the tavern (a faction with no cards yet never empties the tavern)", () => {
    const w = content({
      factions: [f("rider"), f("sentai"), f("mecha"), f("kaiju")],
      cards: [card("r1", { rank: 1, factions: ["rider"] }), card("r2", { rank: 2, factions: ["rider"] }), card("tok", { token: true, factions: ["sentai"] })],
      heroes: [HeroDef.parse({ key: "h1", name: "h1" }), HeroDef.parse({ key: "h2", name: "h2" })],
    });
    for (let seed = 1; seed <= 20; seed++) expect([...(create({ factionsPerMatch: 2 }, seed, w).env.activeFactions ?? [])]).toEqual(["rider"]);
  });

  it("0, or at least as many as exist, means all of them", () => {
    for (const n of [0, 3, 7]) expect(create({ factionsPerMatch: n }).env.activeFactions?.size).toBe(3);
  });

  it("the default is 5 per match (so all 3 here)", () => {
    expect(create().env.activeFactions?.size).toBe(3);
  });

  it("content without factions is unrestricted and exposes none", () => {
    const m = create({}, 1, content({ cards: [card("a", { factions: ["x"] })], heroes: [HeroDef.parse({ key: "h1", name: "h1" }), HeroDef.parse({ key: "h2", name: "h2" })] }));
    expect(m.env.activeFactions).toBeUndefined();
    expect(m.env.activeSeries).toBeUndefined();
    expect(m.view("a").factions).toEqual([]);
    expect(poolKeys(m)).toEqual(["a"]);
  });
});

describe("the shop pool follows the factions", () => {
  it("includes neutral cards and the chosen factions only (tokens never)", () => {
    expect(poolKeys(create({ fixedFactions: ["rider"] }))).toEqual(["n1", "n2", "r1", "r2", "rm"]);
    expect(poolKeys(create({ fixedFactions: ["sentai"] }))).toEqual(["n1", "n2", "s1", "s2"]);
    expect(poolKeys(create({ fixedFactions: ["mecha"] }))).toEqual(["m1", "n1", "n2", "rm"]);
  });

  it("a multi-faction card is in if any of its factions is", () => {
    expect(poolKeys(create({ fixedFactions: ["rider"] }))).toContain("rm");
    expect(poolKeys(create({ fixedFactions: ["mecha"] }))).toContain("rm");
    expect(poolKeys(create({ fixedFactions: ["sentai"] }))).not.toContain("rm");
  });

  it("shops only ever show active cards", () => {
    for (const seed of [1, 2, 3]) {
      const m = create({ fixedFactions: ["sentai"] }, seed);
      m.dispatch("a", { type: "CHOOSE_HERO", index: 0 }, 0);
      m.dispatch("b", { type: "CHOOSE_HERO", index: 0 }, 0);
      for (const id of ["a", "b"]) for (const k of m.player(id).state.shop) expect(["n1", "n2", "s1", "s2"]).toContain(k);
    }
  });

  it("active series are exactly those with a pooled card", () => {
    expect([...(create({ fixedFactions: ["rider"] }).env.activeSeries ?? [])]).toEqual(["rk"]);
    expect([...(create({ fixedFactions: ["sentai"] }).env.activeSeries ?? [])]).toEqual(["sk"]);
    expect([...(create({ fixedFactions: ["mecha"] }).env.activeSeries ?? [])]).toEqual([]);
  });
});

describe("relic offers follow the factions", () => {
  const offered = (config: Record<string, unknown>, seeds = 25): Set<string> => {
    const all = new Set<string>();
    for (let seed = 1; seed <= seeds; seed++) {
      const m = create(config, seed);
      offerRelics(newPlayer(), "LESSER", m.env).forEach((k) => all.add(k));
    }
    return all;
  };

  it("rider-only: no sentai relic, no relic of an inactive series", () => {
    const got = offered({ fixedFactions: ["rider"] });
    expect(got).toContain("rel_rider");
    expect(got).toContain("rel_rk");
    for (const gone of ["rel_sentai", "rel_sk"]) expect(got).not.toContain(gone);
  });

  it("sentai-only: no rider relic", () => {
    const got = offered({ fixedFactions: ["sentai"] });
    expect(got).toContain("rel_sentai");
    expect(got).toContain("rel_sk");
    for (const gone of ["rel_rider", "rel_rk"]) expect(got).not.toContain(gone);
  });

  it("unrestricted relics are always eligible", () => {
    const got = offered({ fixedFactions: ["mecha"] });
    expect(got).toContain("rel_plain");
    expect(got).toContain("rel_free");
  });
});

describe("giants follow the active series", () => {
  const giantOptions = (config: Record<string, unknown>, seed = 1): string[] => {
    const m = create(config, seed);
    const p = newPlayer();
    runEffect(effect({ scope: "PLAYER", trigger: "ON_USE", actions: [{ type: "DISCOVER_GIANT" }] }), null, p, m.env);
    return [...(p.discovers[0]?.options ?? [])].sort();
  };

  it("offers series-free giants and those of active series only", () => {
    expect(giantOptions({ fixedFactions: ["rider"] })).toEqual(["g_free", "g_rk"]);
    expect(giantOptions({ fixedFactions: ["sentai"] })).toEqual(["g_free", "g_sk"]);
    expect(giantOptions({ fixedFactions: ["mecha"] })).toEqual(["g_free"]);
  });

  it("offers all three when every faction is on", () => {
    expect(giantOptions({ fixedFactions: ["rider", "sentai", "mecha"] })).toEqual(["g_free", "g_rk", "g_sk"]);
  });
});

describe("whole matches with each faction on its own", () => {
  it("bots-only matches finish for every faction and for the random default", () => {
    for (const config of [{ fixedFactions: ["rider"] }, { fixedFactions: ["sentai"] }, { fixedFactions: ["mecha"] }, { factionsPerMatch: 2 }]) {
      const entrants: Entrant[] = Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, name: `B${i}`, isBot: true }));
      const m = Match.create({ content: world(), seed: 7, entrants, now: 0, config: { ...config, maxTurns: 6 } });
      for (let guard = 0; guard < 200 && m.phase !== "ENDED"; guard++) m.tick((m.deadline as number) + 1);
      expect(m.phase).toBe("ENDED");
    }
  });
});

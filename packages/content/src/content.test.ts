import { Content, Match, type Entrant } from "@herotime/engine";
import { describe, expect, it } from "vitest";
import { CONTENT_SETS, getContentSet, type ContentSetData } from "./index.js";

const build = (s: ContentSetData): Content => new Content(s);
const entries = Object.entries(CONTENT_SETS);

describe("content registry", () => {
  it("knows its sets and refuses an unknown one with the available names", () => {
    expect(Object.keys(CONTENT_SETS)).toContain("prototype");
    expect(getContentSet("prototype")).toBe(CONTENT_SETS.prototype);
    expect(() => getContentSet("nope")).toThrow(/unknown content set "nope" \(available: .*prototype/);
  });
});

describe.each(entries)("content set: %s", (_name, set) => {
  const content = build(set);
  const shop = [...content.cards.values()].filter((c) => c.kind === "UNIT" && !c.token);

  it("passes the engine's cross-reference validation", () => {
    expect(content.validate()).toEqual([]);
  });

  it("keys and display names are unique", () => {
    const names = set.cards.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    const heroNames = set.heroes.map((h) => h.name);
    expect(new Set(heroNames).size).toBe(heroNames.length);
  });

  it("declares its factions, and every shop unit and relic uses declared ones", () => {
    expect(set.factions.length).toBeGreaterThanOrEqual(2);
    const known = new Set(set.factions.map((f) => f.key));
    for (const c of set.cards) for (const f of c.factions) expect(known.has(f), `${c.key}: ${f}`).toBe(true);
    for (const r of set.relics) for (const f of r.factions) expect(known.has(f), `${r.key}: ${f}`).toBe(true);
  });

  it("every faction has a full ladder: a unit at every rank 1 to 6", () => {
    for (const f of set.factions) {
      const ranks = new Set(shop.filter((c) => c.factions.includes(f.key)).map((c) => c.rank));
      expect([...ranks].sort(), `faction ${f.key}`).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("stats are in a believable band for their rank (catches typos like 1/100)", () => {
    for (const c of shop) {
      const total = c.atk + c.hp;
      expect(total, `${c.key} ${c.atk}/${c.hp} at rank ${c.rank}`).toBeLessThanOrEqual(5 + 4 * c.rank);
      expect(total, `${c.key} ${c.atk}/${c.hp} at rank ${c.rank}`).toBeGreaterThanOrEqual(c.rank + 1);
    }
  });

  it("any 5 of the factions leave a healthy shop at every rank", () => {
    const keys = set.factions.map((f) => f.key);
    const subsets: string[][] = [];
    const pick = (start: number, acc: string[]): void => {
      if (acc.length === Math.min(5, keys.length)) return void subsets.push([...acc]);
      for (let i = start; i < keys.length; i++) pick(i + 1, [...acc, keys[i] as string]);
    };
    pick(0, []);
    for (const subset of subsets) {
      for (let rank = 1; rank <= 6; rank++) {
        const inPlay = shop.filter((c) => c.rank === rank && (c.factions.length === 0 || c.factions.some((f) => subset.includes(f))));
        expect(inPlay.length, `rank ${rank} with ${subset.join("+")}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("has enough heroes, relics of both tiers and a free relic in each tier", () => {
    expect(set.heroes.length).toBeGreaterThanOrEqual(6);
    for (const tier of ["LESSER", "GREATER"] as const) {
      const of = set.relics.filter((r) => r.tier === tier);
      expect(of.length, tier).toBeGreaterThanOrEqual(6);
      expect(of.some((r) => r.cost === 0), `${tier} needs a free relic for timeouts`).toBe(true);
    }
  });

  it("has Giants to find, and Gear for the gauges to hand out", () => {
    expect([...content.cards.values()].filter((c) => c.kind === "GIANT").length).toBeGreaterThanOrEqual(2);
    for (const g of set.gauges) {
      for (const t of g.thresholds) {
        for (const a of t.reward) if (a.type === "ADD_TO_HAND") expect(content.card(a.cardKey).kind).toBe("GEAR");
      }
    }
  });

  it("every card, relic and hero has rules text with no template leftovers", () => {
    const texts = [...set.cards.filter((c) => c.effects.length > 0 || c.henshin), ...set.relics].map((x) => `${x.key}: ${x.text}`);
    for (const t of texts) {
      expect(t, t).not.toMatch(/undefined|\[object|NaN/);
      expect(t.split(": ")[1], t).not.toBe("");
    }
    for (const h of set.heroes.filter((h) => h.power)) expect(h.text, h.key).not.toBe("");
  });

  it("is JSON-serialisable and survives a round trip into the engine", () => {
    const copy = JSON.parse(JSON.stringify(set)) as ContentSetData;
    expect(() => build(copy)).not.toThrow();
  });
});

/** A real match, played to the end by bots, on the real content. Catches interactions no unit test imagined. */
describe.each(entries)("playing %s with bots", (_name, set) => {
  const content = build(set);
  const total = (m: Match): Map<string, number> => {
    const t = new Map<string, number>();
    const add = (k: string, n: number): void => void t.set(k, (t.get(k) ?? 0) + n);
    for (const key of m.env.content.cards.keys()) if (m.env.pool.has(key)) add(key, m.env.pool.count(key));
    for (const p of m.players) {
      for (const k of p.state.shop) add(k, 1);
      // a combined Gattai form holds its parts' copies
      for (const u of [...p.state.hand, ...p.state.board]) for (const c of m.env.content.pooledCopies(u)) if (m.env.pool.has(c.key)) add(c.key, c.copies);
      for (const d of p.state.discovers) if (d.destination === "HAND") for (const k of d.options) add(k, 1);
    }
    return t;
  };

  it("finishes 60 random matches with valid placements and no card leaked or invented", () => {
    const problems: string[] = [];
    let longest = 0;
    let withHenshin = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const n = 4 + (seed % 5);
      const entrants: Entrant[] = Array.from({ length: n }, (_, i) => ({ id: `b${i}`, name: `B${i}`, isBot: true }));
      const m = Match.create({ content, seed, entrants, now: 0, config: { maxTurns: 14 } });
      const start = total(m);
      let guard = 0;
      while (m.phase !== "ENDED" && guard++ < 400) m.tick((m.deadline as number) + 1);
      if (m.phase !== "ENDED") problems.push(`seed ${seed}: did not finish`);
      const placements = m.players.map((p) => p.placement).sort((a, b) => (a as number) - (b as number));
      if (JSON.stringify(placements) !== JSON.stringify(Array.from({ length: n }, (_, i) => i + 1))) problems.push(`seed ${seed}: placements ${placements}`);
      const end = total(m);
      for (const [k, v] of start) if (end.get(k) !== v) problems.push(`seed ${seed}: ${k} ${end.get(k)} vs ${v}`);
      longest = Math.max(longest, m.turn);
      if (m.players.some((p) => p.state.board.some((u) => u.key === "rider_form" || u.key === "super_form"))) withHenshin++;
    }
    expect(problems.slice(0, 8)).toEqual([]);
    expect(longest).toBeGreaterThan(8);
    void withHenshin;
  }, 240_000);

  it("works when a single faction is forced (a dedicated test for each)", () => {
    for (const f of set.factions) {
      const entrants: Entrant[] = Array.from({ length: 4 }, (_, i) => ({ id: `b${i}`, name: `B${i}`, isBot: true }));
      const m = Match.create({ content, seed: 11, entrants, now: 0, config: { fixedFactions: [f.key], maxTurns: 8 } });
      let guard = 0;
      while (m.phase !== "ENDED" && guard++ < 300) m.tick((m.deadline as number) + 1);
      expect(m.phase, `faction ${f.key}`).toBe("ENDED");
    }
  }, 120_000);
});

describe("production set", () => {
  const set = getContentSet("production");
  const content = build(set);
  const shop = [...content.cards.values()].filter((c) => c.kind === "UNIT" && !c.token);

  it("ships the seven launch series and the first Anime series", () => {
    expect(set.series.map((s) => s.key).sort()).toEqual(["den_o", "gokaiger", "himmapan", "kyoryuger", "ooo", "shinkenger", "star_blade", "w"]);
  });

  it("every series names its universe and franchise; Shonen is an Anime faction with a full rank 1-6 curve", () => {
    for (const s of set.series) {
      expect(s.universe, s.key).toMatch(/^(tokusatsu|anime)$/);
      expect(s.franchise, s.key).toBeTruthy();
    }
    expect(set.series.find((s) => s.key === "star_blade")?.universe).toBe("anime");
    const ranks = new Set(shop.filter((c) => c.factions.includes("shonen")).map((c) => c.rank));
    expect([...ranks].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("every series has enough units for its 4-unit bond to be reachable", () => {
    for (const s of set.series) {
      expect(shop.filter((c) => c.series === s.key).length, s.key).toBeGreaterThanOrEqual(4);
      expect(s.bonds.length, `${s.key} bonds`).toBeGreaterThanOrEqual(2);
    }
  });

  it("each Sentai series has a Giant to call, and all five colours exist across the squads", () => {
    const giants = [...content.cards.values()].filter((c) => c.kind === "GIANT").map((c) => c.series);
    for (const key of ["gokaiger", "kyoryuger", "shinkenger", "himmapan"]) expect(giants, key).toContain(key);
    const colours = new Set(shop.flatMap((c) => c.colors));
    for (const c of ["RED", "BLUE", "YELLOW", "GREEN", "PINK", "EXTRA"]) expect(colours.has(c as never), c).toBe(true);
  });

  it("is a larger set than the prototype", () => {
    expect(shop.length).toBeGreaterThan(getContentSet("prototype").cards.filter((c) => c.kind === "UNIT" && !c.token).length);
  });
});

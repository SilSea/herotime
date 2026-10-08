import { describe, expect, it } from "vitest";
import { simulate, summonedTokens } from "../src/content/simulate.js";
import { starterContent } from "./fakes.js";

describe("simulate", () => {
  const content = starterContent();
  const quick = { matches: 6, seed: 5, match: { maxTurns: 8 } };

  it("plays the matches it was asked for and summarises every hero that was picked", () => {
    const r = simulate(content, quick);
    expect(r.matches).toBe(6);
    expect(r.expected).toBe(4.5);
    expect(r.avgTurns).toBeGreaterThan(1);
    expect(r.heroes.reduce((n, h) => n + h.count, 0)).toBe(6 * 8);
    for (const h of r.heroes) expect(content.heroes.has(h.key)).toBe(true);
  });

  it("every placement average sits between 1 and 8, rows are best-first, and names are resolved", () => {
    const r = simulate(content, quick);
    for (const row of [...r.heroes, ...r.cards, ...r.factions]) {
      expect(row.avgPlacement).toBeGreaterThanOrEqual(1);
      expect(row.avgPlacement).toBeLessThanOrEqual(8);
      expect(row.name).not.toBe("");
    }
    const sorted = [...r.cards].sort((a, b) => a.avgPlacement - b.avgPlacement || b.count - a.count);
    expect(r.cards.map((c) => c.key)).toEqual(sorted.map((c) => c.key));
    expect(r.cards.some((c) => c.name !== c.key)).toBe(true);
  });

  it("reports relics held at the end, and can start the first bot of every match with a relic", () => {
    const relic = [...content.relics.keys()][0] as string;
    const r = simulate(content, { ...quick, relic });
    expect(r.forced).toMatchObject({ key: relic, count: 6 });
    expect(r.forced?.avgPlacement).toBeGreaterThanOrEqual(1);
    expect(r.relics.find((x) => x.key === relic)?.count).toBeGreaterThanOrEqual(6);
    for (const row of r.relics) expect(content.relics.has(row.key)).toBe(true);
    expect(simulate(content, quick).forced).toBeUndefined();
    expect(() => simulate(content, { ...quick, relic: "nope" })).toThrow(/unknown relic/);
  });

  it("is deterministic for a seed, and different seeds differ", () => {
    const a = simulate(content, quick);
    expect(simulate(content, quick)).toEqual(a);
    expect(simulate(content, { ...quick, seed: 99 })).not.toEqual(a);
  });

  it("never lists tokens, gear or giants as unused, and stops when its time budget is spent", () => {
    const r = simulate(content, { ...quick, matches: 50, budgetMs: 0 });
    expect(r.matches).toBeLessThan(50);
    for (const key of r.neverUsed) {
      const c = content.card(key);
      expect(c.kind === "UNIT" && !c.token).toBe(true);
    }
  });
});

describe("summonedTokens", () => {
  it("lists tokens that only come from SUMMON, not the forms a unit turns into", async () => {
    const { Content } = await import("@herotime/engine");
    const { CardDef } = await import("@herotime/shared");
    const card = (key: string, o: Record<string, unknown> = {}) => CardDef.parse({ key, name: key, rank: 1, atk: 1, hp: 1, ...o });
    const content = new Content({
      cards: [
        card("caller", { effects: [{ scope: "UNIT", trigger: "ON_PLAY", actions: [{ type: "SUMMON", cardKey: "pup" }] }] }),
        card("pup", { token: true }),
        card("civ", { henshin: { afterTurns: 1, into: "hero_form" } }),
        card("hero_form", { token: true, effects: [{ scope: "UNIT", trigger: "LAST_STAND", actions: [{ type: "SUMMON", cardKey: "hero_form" }] }] }),
        card("pup_shop", { effects: [{ scope: "UNIT", trigger: "ON_PLAY", actions: [{ type: "SUMMON", cardKey: "civ" }] }] }),
      ],
    });
    expect([...summonedTokens(content)]).toEqual(["pup"]);
  });
});

describe("simulate margins", () => {
  it("gives every row a ± range and accounts for every final board", () => {
    const r = simulate(starterContent(), { matches: 6, seed: 5, match: { maxTurns: 8 } });
    for (const row of [...r.factions, ...r.heroes, ...r.cards]) {
      expect(row.margin).toBeGreaterThanOrEqual(0);
      expect(row.margin).toBeLessThanOrEqual(8);
    }
    expect(r.factions.reduce((n, f) => n + f.count, 0) + r.unassigned).toBe(6 * 8);
  });
});

describe("never used", () => {
  it("does not list a card whose Henshin form was seen, or a card of a faction that is off", async () => {
    const { Content } = await import("@herotime/engine");
    const { CardDef, FactionDef, HeroDef } = await import("@herotime/shared");
    const card = (key: string, o: Record<string, unknown> = {}) => CardDef.parse({ key, name: key, rank: 1, atk: 1, hp: 1, ...o });
    const content = new Content({
      factions: [FactionDef.parse({ key: "on", name: "On" }), FactionDef.parse({ key: "off", name: "Off", enabled: false })],
      heroes: [HeroDef.parse({ key: "h", name: "h" })],
      cards: [card("civ", { factions: ["on"], henshin: { afterTurns: 1, into: "form" } }), card("form", { factions: ["on"], token: true, atk: 5, hp: 5 }), card("ghost", { factions: ["off"] })],
    });
    const r = simulate(content, { matches: 2, seed: 1, match: { maxTurns: 6 } });
    expect(r.neverUsed).not.toContain("ghost");
    if (r.cards.some((c) => c.key === "form")) expect(r.neverUsed).not.toContain("civ");
  });
});

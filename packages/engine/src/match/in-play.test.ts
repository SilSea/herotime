import { FactionDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";
import { describe, expect, it } from "vitest";
import { Content, type ContentData } from "../content.js";
import { makeEnv } from "../game/env.js";
import { offerRelics } from "../game/session.js";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card } from "../testing.js";
import { Match } from "./match.js";
import type { Entrant } from "./types.js";

// Factions, heroes and relics the admin switched off (enabled: false) never come up in a match.
const f = (key: string, over: Record<string, unknown> = {}) => FactionDef.parse({ key, name: key, ...over });
const hero = (key: string, over: Record<string, unknown> = {}) => HeroDef.parse({ key, name: key, ...over });
const relic = (key: string, over: Record<string, unknown> = {}) => RelicDef.parse({ key, name: key, tier: "LESSER", cost: 0, ...over });

const data = (over: Partial<ContentData> = {}): ContentData => ({
  factions: [f("rider"), f("sentai", { enabled: false }), f("mecha")],
  series: [SeriesDef.parse({ key: "zz", name: "ZZ" })],
  cards: [card("n1"), card("r1", { factions: ["rider"] }), card("s1", { factions: ["sentai"] }), card("sm", { factions: ["sentai", "mecha"] }), card("m1", { factions: ["mecha"] })],
  heroes: [hero("h_on"), hero("h_off", { enabled: false }), hero("h_on2", { series: "zz" })],
  ...over,
});
const humans: Entrant[] = [
  { id: "a", name: "A", isBot: false },
  { id: "b", name: "B", isBot: false },
];
const create = (config: Record<string, unknown>, seed: number) =>
  Match.create({ content: new Content(data()), seed, entrants: humans, now: 0, config: { factionsPerMatch: 0, heroChoices: 3, ...config } });

describe("switching factions, heroes and relics off", () => {
  it("a faction that is off is never picked, so its own cards stay out of the tavern", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = create({}, seed);
      expect([...(m.env.activeFactions ?? [])].sort()).toEqual(["mecha", "rider"]);
      expect(m.env.pool.has("s1")).toBe(false);
      expect(m.env.pool.has("sm")).toBe(true); // also mecha
      expect(m.env.pool.has("n1")).toBe(true); // neutral
    }
  });

  it("asking for a faction that is off leaves it out; asking only for those falls back to the ones in play", () => {
    expect([...(create({ fixedFactions: ["rider", "sentai"] }, 1).env.activeFactions ?? [])]).toEqual(["rider"]);
    expect([...(create({ fixedFactions: ["sentai"] }, 1).env.activeFactions ?? [])].sort()).toEqual(["mecha", "rider"]);
  });

  it("a hero that is off is never offered", () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const p of create({}, seed).players) expect(p.heroOptions.sort()).toEqual(["h_on", "h_on2"]);
    }
  });

  it("a relic that is off is never offered", () => {
    const content = new Content(data({ relics: [relic("r_on"), relic("r_off", { enabled: false }), relic("r_on2")] }));
    for (let seed = 1; seed <= 20; seed++) {
      const env = makeEnv({ content, pool: new Pool([{ key: "n1", rank: 1 }]), rng: new Rng(seed) });
      expect(offerRelics(newPlayer(), "LESSER", env).sort()).toEqual(["r_on", "r_on2"]);
    }
  });

  it("content with every hero or every faction off is reported", () => {
    expect(() => new Content(data({ heroes: [hero("h", { enabled: false })] }))).toThrow(/every hero is switched off/);
    const allOff = data().factions?.map((x) => ({ ...x, enabled: false }));
    expect(() => new Content(data({ factions: allOff }))).toThrow(/every faction is switched off/);
  });

  it("a hero's series must exist", () => {
    expect(() => new Content(data({ heroes: [hero("h", { series: "nope" })] }))).toThrow(/hero "h".*nope/);
  });
});

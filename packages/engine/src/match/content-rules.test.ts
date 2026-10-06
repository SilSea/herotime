import { describe, expect, it } from "vitest";
import { configFromRules, DEFAULT_COMBAT_RULES, DEFAULT_CONFIG } from "../config.js";
import { Content } from "../content.js";
import { prepareCombat } from "../game/session.js";
import { modifyRule } from "../rules.js";
import { buildWorld } from "../testing-world.js";
import { Match } from "./match.js";

const base = buildWorld();
const withRules = (rules: Record<string, number>): Content =>
  new Content({
    factions: [...base.factions.values()],
    series: [...base.series.values()],
    cards: [...base.cards.values()],
    gauges: [...base.gauges.values()],
    relics: [...base.relics.values()],
    heroes: [...base.heroes.values()],
    rules,
  });

const start = (content: Content) => {
  const m = Match.create({ content, seed: 1, entrants: [{ id: "a", name: "A", isBot: false }, { id: "b", name: "B", isBot: false }], now: 0 });
  for (const id of ["a", "b"]) m.dispatch(id, { type: "CHOOSE_HERO", index: 0 }, 0);
  return m;
};

describe("configFromRules", () => {
  it("puts game numbers in the config and combat numbers in its combat defaults, ignoring unknown keys", () => {
    const cfg = configFromRules({ buyCost: 2, boardSize: 8, giantSentaiScale: 0.5, gattaiSize: 2, nonsense: 9 });
    expect(cfg.buyCost).toBe(2);
    expect(cfg.boardSize).toBe(8);
    expect(cfg.combatDefaults).toEqual({ giantSentaiScale: 0.5, gattaiSize: 2 });
    expect((cfg as unknown as Record<string, unknown>).nonsense).toBeUndefined();
    expect(cfg.refreshCost).toBe(DEFAULT_CONFIG.refreshCost);
  });
  it("no rules: the engine defaults", () => {
    expect(configFromRules()).toEqual(DEFAULT_CONFIG);
  });
});

describe("a content set's rules apply to its matches", () => {
  it("prices and limits come from the content", () => {
    const m = start(withRules({ buyCost: 2, startEnergy: 5, boardSize: 8 }));
    const me = m.view("a").me;
    expect(me.limits.buyCost).toBe(2);
    expect(me.limits.boardSize).toBe(8);
    expect(me.state.energy).toBe(5);
  });

  it("combat rules reach the fight, and a player's own relic still overrides them", () => {
    const m = start(withRules({ giantSentaiScale: 0.5, rollCallColors: 4 }));
    const p = m.player("a").state;
    const env = (m as unknown as { env: Parameters<typeof prepareCombat>[1] }).env;
    expect(prepareCombat(p, env).extras.rules).toMatchObject({ giantSentaiScale: 0.5, rollCallColors: 4 });
    modifyRule(p, "rollCallColors", "ADD", -1, env.cfg); // e.g. a relic: one colour fewer than this content's 4
    expect(p.rules.rollCallColors).toBe(3);
    expect(prepareCombat(p, env).extras.rules).toMatchObject({ giantSentaiScale: 0.5, rollCallColors: 3 });
  });

  it("without rules nothing changes", () => {
    const m = start(base);
    expect(m.view("a").me.limits.buyCost).toBe(DEFAULT_CONFIG.buyCost);
    expect(DEFAULT_COMBAT_RULES.giantSentaiScale).toBe(1);
  });
});

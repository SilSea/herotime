import { FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";
import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import { withRules } from "../rules.js";
import { Rng } from "../rng/rng.js";
import { newPlayer, type PlayerState, type Unit } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect, fighter } from "../testing.js";
import type { CombatResult } from "../types.js";
import { makeEnv, type GameEnv } from "./env.js";
import { applyCombatOutcome, beginTurn, combatOptions, endTurn, grantRelic, playUnit, prepareCombat, sellUnit, useGear, useHeroPower, assignHero } from "./session.js";

/**
 * Every action, trigger, target and condition the card DSL offers, each on a test card that is then played
 * through the real session code (Deploy, Gear, turn start / end, selling, fights). Each case checks that
 * something visible happened, so an effect that silently does nothing shows up here.
 */

type Raw = Record<string, unknown>;
const u = (key: string, o: Partial<Unit> = {}): Unit => ({ key, golden: false, ...o });

/** The fixed cast every test card plays against. */
const BASE = [
  card("pup", { rank: 1, atk: 2, hp: 3, factions: ["beast"] }),
  card("cat", { rank: 1, atk: 3, hp: 2, factions: ["beast"], colors: ["RED"] }),
  card("owl", { rank: 2, atk: 2, hp: 2 }),
  card("bat", { rank: 2, atk: 1, hp: 1 }),
  card("elk", { rank: 2, atk: 4, hp: 4 }),
  card("cub", { rank: 1, atk: 1, hp: 1, token: true }),
  card("form", { rank: 1, atk: 5, hp: 5, token: true }),
  card("ult", { rank: 1, atk: 8, hp: 8, token: true }),
  card("robo", { kind: "GIANT", rank: 6, atk: 10, hp: 10, token: true }),
  card("kit", { kind: "GEAR", rank: 1, atk: 0, hp: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] }),
];
const POOLED = ["pup", "cat", "owl", "bat", "elk"];

interface World {
  e: GameEnv;
  p: PlayerState;
}

/** A world holding `extra` cards; the player has 5 Energy, rank 1 and an empty board. */
function world(extra: Raw[], data: Raw = {}): World {
  const cards = [...BASE, ...extra.map((c) => card(String(c.key), c))];
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const c = content({
    factions: [FactionDef.parse({ key: "beast", name: "Beast", color: "#888" })],
    cards,
    gauges: [GaugeDef.parse({ key: "g", name: "G", max: 10 })],
    relics: list(data.relics).map((r) => RelicDef.parse(r)),
    heroes: list(data.heroes).map((h) => HeroDef.parse(h)),
    series: list(data.series).map((x) => SeriesDef.parse(x)),
  });
  const pool = new Pool(cards.filter((x) => POOLED.includes(x.key)).map((x) => ({ key: x.key, rank: x.rank })));
  // The tavern Gear a match offers (RANDOM_CARD draws from it), as Match builds it.
  const gear = cards.filter((x) => x.kind === "GEAR" && !x.token).map((x) => ({ key: x.key, rank: x.rank }));
  const e = makeEnv({ content: c, pool, rng: new Rng(7), gear });
  const p = newPlayer();
  p.energy = 5;
  return { e, p };
}

/** A unit card "x" with one effect. */
const unitX = (fx: Raw, over: Raw = {}): Raw => ({ key: "x", rank: 1, atk: 2, hp: 2, effects: [fx], ...over });

/** Deploy "x" (leftmost) next to pup and cat, with a hand and a tavern to act on. */
function deploy(fx: Raw, setup: (w: World) => void = () => undefined, over: Raw = {}, extra: Raw[] = []): World {
  const w = world([unitX({ scope: "UNIT", trigger: "ON_PLAY", ...fx }, over), ...extra]);
  w.p.board = [u("pup"), u("cat")];
  w.p.hand = [u("x"), u("owl"), u("kit")];
  w.p.shop = ["elk", "bat"];
  setup(w);
  playUnit(w.p, 0, 0, w.e);
  return w;
}

/** Fight with "x" leftmost on our side (plus pup), against a sturdy enemy; returns the result and the world. */
function fight(fx: Raw, enemy = [fighter("bat", 1, 30), fighter("bat", 1, 30)], over: Raw = {}, extra: Raw[] = [], setup: (w: World) => void = () => undefined): World & { r: CombatResult } {
  const w = world([unitX({ scope: "UNIT", ...fx }, over), ...extra]);
  w.p.board = [u("x"), u("pup")];
  w.p.hand = [u("owl")];
  setup(w);
  const mine = prepareCombat(w.p, w.e);
  const r = simulateCombat(mine.units, enemy, 3, { ...combatOptions(w.e), a: mine.extras, maxAttacksPerCombat: 6 });
  return { ...w, r };
}

const keys = (units: readonly Unit[]): string[] => units.map((x) => x.key);
const bonus = (x: Unit | undefined): [number, number] => [x?.bonusAtk ?? 0, x?.bonusHp ?? 0];

// ---------------------------------------------------------------- actions in the tavern (Deploy)

describe("every action, on Deploy", () => {
  const cases: [string, Raw, (w: World) => void, ((w: World) => void)?, Raw?, Raw[]?][] = [
    ["BUFF", { target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 2 }] }, ({ p }) => expect(p.board.map(bonus)).toEqual([[1, 2], [1, 2], [1, 2]])],
    ["BUFF fromSelf", { target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 0, hp: 0, fromSelf: true }] }, ({ p }) => expect(p.board.map(bonus)).toEqual([[0, 0], [2, 2], [2, 2]])],
    ["GIVE_KEYWORD", { target: { selector: "RIGHTMOST_FRIENDLY" }, actions: [{ type: "GIVE_KEYWORD", keyword: "BARRIER" }] }, ({ p }) => expect(p.board[2]?.keywords).toEqual(["BARRIER"])],
    ["SUMMON", { actions: [{ type: "SUMMON", cardKey: "cub", count: 2 }] }, ({ p }) => expect(keys(p.board)).toEqual(["x", "cub", "cub", "pup", "cat"])],
    ["DESTROY", { target: { selector: "RIGHTMOST_FRIENDLY" }, actions: [{ type: "DESTROY" }] }, ({ p }) => expect(keys(p.board)).toEqual(["x", "pup"])],
    ["TRANSFORM", { target: { selector: "RIGHTMOST_FRIENDLY" }, actions: [{ type: "TRANSFORM", into: "form" }] }, ({ p }) => expect(keys(p.board)).toEqual(["x", "pup", "form"])],
    ["COPY to board", { target: { selector: "RIGHTMOST_FRIENDLY" }, actions: [{ type: "COPY", to: "BOARD" }] }, ({ p }) => expect(keys(p.board)).toEqual(["x", "pup", "cat", "cat"])],
    ["COPY to hand", { target: { selector: "RIGHTMOST_FRIENDLY" }, actions: [{ type: "COPY", to: "HAND" }] }, ({ p }) => expect(keys(p.hand)).toContain("cat")],
    ["CONSUME_ALLIES", { target: { selector: "SELF" }, actions: [{ type: "CONSUME_ALLIES" }] }, ({ p }) => {
      expect(keys(p.board)).toEqual(["x"]);
      expect(bonus(p.board[0])).toEqual([5, 5]);
    }],
    ["GAIN_ENERGY", { actions: [{ type: "GAIN_ENERGY", amount: 2 }] }, ({ p }) => expect(p.energy).toBe(7)],
    ["GAUGE_ADD", { actions: [{ type: "GAUGE_ADD", gauge: "g", amount: 3 }] }, ({ p }) => expect(p.gauges.g).toBe(3)],
    ["MODIFY_RULE", { actions: [{ type: "MODIFY_RULE", rule: "handSize", op: "ADD", value: 1 }] }, ({ p, e }) => expect(withRules(p, e.cfg).handSize).toBe(e.cfg.handSize + 1)],
    ["ADD_TO_HAND", { actions: [{ type: "ADD_TO_HAND", cardKey: "owl" }] }, ({ p }) => expect(keys(p.hand)).toEqual(["owl", "kit", "owl"])],
    ["DISCOVER_UNIT", { actions: [{ type: "DISCOVER_UNIT" }] }, ({ p }) => expect(p.discovers[0]?.options.length).toBeGreaterThan(0)],
    ["DISCOVER_GIANT", { actions: [{ type: "DISCOVER_GIANT" }] }, ({ p }) => expect(p.discovers[0]).toMatchObject({ destination: "GIANT", options: ["robo"] })],
    ["SUPER_GATTAI", { actions: [{ type: "SUPER_GATTAI", atk: 3, hp: 3 }] }, ({ p }) => expect(p.superGattai).toEqual({ atk: 3, hp: 3 }), ({ p }) => void (p.giant = u("robo"))],
    ["RANDOM_CARD gear", { actions: [{ type: "RANDOM_CARD", cardKind: "GEAR" }] }, ({ p }) => expect(keys(p.hand)).toEqual(["owl", "kit", "kit"])],
    ["RANDOM_CARD unit", { actions: [{ type: "RANDOM_CARD", cardKind: "UNIT" }] }, ({ p }) => expect(p.hand).toHaveLength(3)],
    ["ULTIMATE_FORM", { target: { selector: "SELF" }, actions: [{ type: "ULTIMATE_FORM" }] }, ({ p }) => expect(p.board[0]?.key).toBe("ult"), undefined, { ultimateInto: "ult" }],
    ["BUFF_SHOP", { actions: [{ type: "BUFF_SHOP", atk: 1, hp: 1 }] }, ({ p }) => expect(p.shopBonus).toEqual({ atk: 1, hp: 1 })],
    ["BUFF_GEAR", { actions: [{ type: "BUFF_GEAR", atk: 1, hp: 1 }] }, ({ p }) => expect(p.gearBonus).toEqual({ atk: 1, hp: 1 })],
    ["DEVOUR_SHOP", { target: { selector: "SELF" }, actions: [{ type: "DEVOUR_SHOP", choose: "STRONGEST" }] }, ({ p }) => {
      expect(p.shop).toEqual(["bat"]);
      expect(bonus(p.board[0])).toEqual([4, 4]);
    }],
    ["DISCARD", { actions: [{ type: "DISCARD", count: 1, pick: "LEFTMOST", cardKind: "ANY" }] }, ({ p }) => expect(keys(p.hand)).toEqual(["kit"])],
    ["SUMMON_FROM_HAND", { actions: [{ type: "SUMMON_FROM_HAND", count: 1 }] }, ({ p }) => {
      expect(keys(p.board)).toContain("owl");
      expect(keys(p.hand)).toEqual(["kit"]);
    }],
  ];
  it.each(cases)("%s", (_name, fx, check, setup, over) => {
    const w = deploy(fx, setup, over ?? {});
    check(w);
  });
});

// ---------------------------------------------------------------- actions in a fight

describe("every action, at the start of combat", () => {
  const ev = (r: CombatResult, type: string) => r.events.filter((x) => x.type === type);
  const fx = (actions: Raw[], selector?: string): Raw => ({ trigger: "START_OF_COMBAT", ...(selector ? { target: { selector } } : {}), actions });
  const cases: [string, Raw, (w: World & { r: CombatResult }) => void][] = [
    ["BUFF", fx([{ type: "BUFF", atk: 2, hp: 2 }], "ALL_FRIENDLY"), ({ r }) => expect(ev(r, "BUFF").length).toBeGreaterThanOrEqual(2)],
    ["BUFF permanent", fx([{ type: "BUFF", atk: 2, hp: 2, permanent: true }], "SELF"), (w) => {
      applyCombatOutcome(w.p, w.r, "A", w.e);
      expect(bonus(w.p.board[0])).toEqual([2, 2]);
    }],
    ["GIVE_KEYWORD", fx([{ type: "GIVE_KEYWORD", keyword: "GUARD" }], "SELF"), ({ r }) => expect(ev(r, "KEYWORD")).toHaveLength(1)],
    ["SUMMON", fx([{ type: "SUMMON", cardKey: "cub", count: 1 }]), ({ r }) => expect(ev(r, "SUMMON")).toHaveLength(1)],
    ["DAMAGE", fx([{ type: "DAMAGE", amount: 3 }], "ALL_ENEMY"), ({ r }) => expect(ev(r, "EFFECT_DAMAGE")).toHaveLength(2)],
    ["DESTROY", fx([{ type: "DESTROY" }], "LEFTMOST_ENEMY"), ({ r }) => expect(ev(r, "DESTROY")).toHaveLength(1)],
    ["TRANSFORM", fx([{ type: "TRANSFORM", into: "form" }], "SELF"), ({ r }) => expect(ev(r, "TRANSFORM")).toHaveLength(1)],
    ["COPY to board", fx([{ type: "COPY", to: "BOARD" }], "RIGHTMOST_FRIENDLY"), ({ r }) => expect(ev(r, "SUMMON")).toHaveLength(1)],
    ["COPY of an enemy", fx([{ type: "COPY", to: "BOARD" }], "LEFTMOST_ENEMY"), ({ r }) => expect(ev(r, "SUMMON")).toHaveLength(1)],
    ["CONSUME_ALLIES", fx([{ type: "CONSUME_ALLIES" }], "SELF"), ({ r }) => {
      expect(ev(r, "DESTROY")).toHaveLength(1);
      expect(ev(r, "BUFF")).toHaveLength(1);
    }],
    ["SUMMON_FROM_HAND", fx([{ type: "SUMMON_FROM_HAND", count: 1 }]), ({ r }) => expect(ev(r, "SUMMON").map((x) => (x as { cardKey: string }).cardKey)).toEqual(["owl"])],
  ];
  it.each(cases)("%s", (_name, f, check) => check(fight(f)));

  // Recruit actions a fight effect earns: they arrive at the start of the next turn.
  const rewards: [string, Raw, (w: World) => void][] = [
    ["GAIN_ENERGY", { type: "GAIN_ENERGY", amount: 2 }, ({ p, e }) => expect(p.energy).toBe(Math.min(e.cfg.maxEnergy, 4 + 2))],
    ["ADD_TO_HAND", { type: "ADD_TO_HAND", cardKey: "elk" }, ({ p }) => expect(keys(p.hand)).toContain("elk")],
    ["RANDOM_CARD", { type: "RANDOM_CARD", cardKind: "GEAR" }, ({ p }) => expect(keys(p.hand)).toContain("kit")],
    ["DISCOVER_UNIT", { type: "DISCOVER_UNIT" }, ({ p }) => expect(p.discovers).toHaveLength(1)],
    ["GAUGE_ADD", { type: "GAUGE_ADD", gauge: "g", amount: 2 }, ({ p }) => expect(p.gauges.g).toBe(2)],
    ["BUFF_SHOP", { type: "BUFF_SHOP", atk: 1, hp: 1 }, ({ p }) => expect(p.shopBonus).toEqual({ atk: 1, hp: 1 })],
    ["BUFF_GEAR", { type: "BUFF_GEAR", atk: 1, hp: 1 }, ({ p }) => expect(p.gearBonus).toEqual({ atk: 1, hp: 1 })],
    ["COPY to hand", { type: "COPY", to: "HAND" }, ({ p }) => expect(keys(p.hand)).toContain("pup")],
  ];
  it.each(rewards)("reward %s arrives next turn", (_name, action, check) => {
    const w = fight({ trigger: "START_OF_COMBAT", ...(action.type === "COPY" ? { target: { selector: "RIGHTMOST_FRIENDLY" } } : {}), actions: [action] });
    expect(w.r.events.some((x) => x.type === "REWARD")).toBe(true);
    applyCombatOutcome(w.p, w.r, "A", w.e);
    beginTurn(w.p, 2, w.e);
    check(w);
  });
});

// ---------------------------------------------------------------- every trigger

describe("every trigger fires", () => {
  const energy = [{ type: "GAIN_ENERGY", amount: 1 }];

  it("ON_PLAY (Deploy)", () => {
    const w = deploy({ actions: energy });
    expect(w.p.energy).toBe(6);
  });

  it("END_OF_TURN", () => {
    const w = world([unitX({ scope: "UNIT", trigger: "END_OF_TURN", actions: energy })]);
    w.p.board = [u("x")];
    endTurn(w.p, w.e);
    expect(w.p.energy).toBe(6);
  });

  it("HENSHIN (runs the card that transforms)", () => {
    const w = world([unitX({ scope: "UNIT", trigger: "HENSHIN", actions: energy }, { henshin: { afterTurns: 1, into: "form" } })]);
    w.p.board = [u("x")];
    endTurn(w.p, w.e);
    expect(keys(w.p.board)).toEqual(["form"]);
    expect(w.p.energy).toBe(6);
  });

  it("ON_TURN_START (a unit on the board)", () => {
    const w = world([unitX({ scope: "UNIT", trigger: "ON_TURN_START", actions: energy })]);
    w.p.board = [u("x")];
    beginTurn(w.p, 3, w.e);
    expect(w.p.energy).toBe(w.e.cfg.startEnergy + 2 + 1);
  });

  it("ALLY_SUMMONED (tavern)", () => {
    const w = world([unitX({ scope: "UNIT", trigger: "ALLY_SUMMONED", target: { selector: "SUMMONED" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] }), { key: "caller", effects: [{ scope: "UNIT", trigger: "ON_PLAY", actions: [{ type: "SUMMON", cardKey: "cub" }] }] }]);
    w.p.board = [u("x")];
    w.p.hand = [u("caller")];
    playUnit(w.p, 0, 1, w.e);
    expect(bonus(w.p.board.find((x) => x.key === "cub"))).toEqual([1, 1]);
  });

  it("ON_SELL", () => {
    const w = world([unitX({ scope: "UNIT", trigger: "ON_SELL", actions: [{ type: "ADD_TO_HAND", cardKey: "owl" }] })]);
    w.p.board = [u("x")];
    sellUnit(w.p, "board", 0, w.e);
    expect(keys(w.p.hand)).toEqual(["owl"]);
  });

  it("ON_DISCARD", () => {
    const w = world([unitX({ scope: "UNIT", trigger: "ON_DISCARD", actions: energy }), { key: "dropper", effects: [{ scope: "UNIT", trigger: "ON_PLAY", actions: [{ type: "DISCARD", count: 1, pick: "LEFTMOST", cardKind: "ANY" }] }] }]);
    w.p.hand = [u("dropper"), u("x")];
    playUnit(w.p, 0, 0, w.e);
    expect(w.p.hand).toEqual([]);
    expect(w.p.energy).toBe(6);
  });

  const fightReward = (r: CombatResult): number => r.events.filter((x) => x.type === "REWARD").length;
  it("START_OF_COMBAT", () => expect(fightReward(fight({ trigger: "START_OF_COMBAT", actions: energy }).r)).toBe(1));
  it("ON_ATTACK", () => expect(fightReward(fight({ trigger: "ON_ATTACK", actions: energy }, [fighter("bat", 1, 30)]).r)).toBeGreaterThan(0));
  it("AFTER_DAMAGED", () => expect(fightReward(fight({ trigger: "AFTER_DAMAGED", actions: energy }, [fighter("bat", 1, 30)], { hp: 20 }).r)).toBeGreaterThan(0));
  it("LAST_STAND", () => expect(fightReward(fight({ trigger: "LAST_STAND", actions: energy }, [fighter("bat", 9, 30)], { hp: 1 }).r)).toBe(1));
  it("AVENGE", () => {
    const w = fight({ trigger: "AVENGE", every: 1, actions: energy }, [fighter("bat", 9, 30)], { hp: 30 }, [], (wd) => void (wd.p.board = [u("pup"), u("x")]));
    expect(fightReward(w.r)).toBeGreaterThan(0);
  });
  it("ALLY_SUMMONED (fight)", () => {
    const w = fight({ trigger: "ALLY_SUMMONED", target: { selector: "SUMMONED" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] }, [fighter("bat", 9, 30)], { hp: 30 }, [
      { key: "egg", hp: 1, effects: [{ scope: "UNIT", trigger: "LAST_STAND", actions: [{ type: "SUMMON", cardKey: "cub" }] }] },
    ], (wd) => void (wd.p.board = [u("egg"), u("x")]));
    const summoned = w.r.events.find((x) => x.type === "SUMMON") as { unit: string } | undefined;
    expect(summoned).toBeDefined();
    expect(w.r.events.some((x) => x.type === "BUFF" && x.unit === summoned?.unit)).toBe(true);
  });

  it("ON_ACQUIRE and ON_TURN_START (relic)", () => {
    const w = world([], {
      relics: [{ key: "rel", name: "Rel", tier: "LESSER", cost: 0, effects: [
        { scope: "PLAYER", trigger: "ON_ACQUIRE", actions: [{ type: "GAUGE_ADD", gauge: "g", amount: 1 }] },
        { scope: "PLAYER", trigger: "ON_TURN_START", actions: [{ type: "GAUGE_ADD", gauge: "g", amount: 2 }] },
      ] }],
    });
    grantRelic(w.p, "rel", w.e);
    expect(w.p.gauges.g).toBe(1);
    beginTurn(w.p, 2, w.e);
    expect(w.p.gauges.g).toBe(3);
  });

  it("ON_USE (hero power)", () => {
    const w = world([], { heroes: [{ key: "h", name: "H", power: { mode: "ACTIVE", cost: 1, effects: [{ scope: "PLAYER", trigger: "ON_USE", actions: [{ type: "GAUGE_ADD", gauge: "g", amount: 2 }] }] } }] });
    assignHero(w.p, "h", w.e);
    useHeroPower(w.p, w.e);
    expect(w.p.gauges.g).toBe(2);
    expect(w.p.energy).toBe(4);
  });
});

// ---------------------------------------------------------------- every target, every condition, Gear

describe("every friendly target in the tavern", () => {
  const buffWith = (selector: string, extra: Raw = {}) => deploy({ target: { selector, ...extra }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] }, (w) => void (w.p.board = [u("pup"), u("cat"), u("pup")]));
  const got = (w: World): string[] => w.p.board.filter((x) => x.bonusAtk).map((x) => x.key);
  it.each([
    ["SELF", ["x"]],
    ["ADJACENT", ["pup"]],
    ["LEFTMOST_FRIENDLY", ["x"]], // x was placed leftmost
    ["RIGHTMOST_FRIENDLY", ["pup"]],
    ["ALL_FRIENDLY", ["x", "pup", "cat", "pup"]],
    ["CHOSEN_FRIENDLY", ["x"]], // outside Gear: the leftmost match
  ])("%s", (selector, expected) => {
    const w = buffWith(selector);
    expect(got(w)).toEqual(expected);
  });
  it("RANDOM_FRIENDLY picks another unit", () => {
    const w = buffWith("RANDOM_FRIENDLY");
    expect(got(w)).toHaveLength(1);
    expect(got(w)).not.toContain("x");
  });
  it("GIANT_SLOT", () => {
    const w = deploy({ target: { selector: "GIANT_SLOT" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] }, (wd) => void (wd.p.giant = u("robo")));
    expect(bonus(w.p.giant)).toEqual([1, 1]);
  });
  it("a faction filter and a card filter", () => {
    expect(got(buffWith("ALL_FRIENDLY", { faction: "beast" }))).toEqual(["pup", "cat", "pup"]);
    expect(got(buffWith("ALL_FRIENDLY", { cards: ["cat"] }))).toEqual(["cat"]);
  });
});

describe("every enemy target in a fight", () => {
  const dmg = (selector: string) => fight({ trigger: "START_OF_COMBAT", target: { selector }, actions: [{ type: "DAMAGE", amount: 1 }] }, [fighter("bat", 1, 30), fighter("bat", 1, 30), fighter("bat", 1, 30)]);
  const hits = (r: CombatResult) => r.events.filter((x) => x.type === "EFFECT_DAMAGE").length;
  it.each([["LEFTMOST_ENEMY", 1], ["RANDOM_ENEMY", 1], ["ALL_ENEMY", 3]])("%s", (selector, n) => expect(hits(dmg(selector as string).r)).toBe(n));
});

describe("every condition", () => {
  const cond = (condition: Raw, setup: (w: World) => void) => deploy({ condition, actions: [{ type: "GAIN_ENERGY", amount: 1 }] }, setup).p.energy;
  it("TEAM_UP_COLORS_GTE", () => {
    expect(cond({ type: "TEAM_UP_COLORS_GTE", value: 1 }, () => undefined)).toBe(6); // cat is RED
    expect(cond({ type: "TEAM_UP_COLORS_GTE", value: 2 }, () => undefined)).toBe(5);
  });
  it("FACTION_COUNT_GTE", () => {
    expect(cond({ type: "FACTION_COUNT_GTE", faction: "beast", value: 2 }, () => undefined)).toBe(6);
    expect(cond({ type: "FACTION_COUNT_GTE", faction: "beast", value: 3 }, () => undefined)).toBe(5);
  });
  it("ENERGY_GTE", () => {
    expect(cond({ type: "ENERGY_GTE", value: 5 }, () => undefined)).toBe(6);
    expect(cond({ type: "ENERGY_GTE", value: 6 }, () => undefined)).toBe(5);
  });
  it("HAS_CARD", () => {
    expect(cond({ type: "HAS_CARD", cards: ["cat"] }, () => undefined)).toBe(6);
    expect(cond({ type: "HAS_CARD", cards: ["elk"] }, () => undefined)).toBe(5);
  });
  it("SERIES_COUNT_GTE", () => {
    const w = world([unitX({ scope: "UNIT", trigger: "ON_PLAY", condition: { type: "SERIES_COUNT_GTE", series: "s1", value: 1 }, actions: [{ type: "GAIN_ENERGY", amount: 1 }] }, { series: "s1" })], {
      series: [{ key: "s1", name: "S1", franchise: "f" }],
    });
    w.p.hand = [u("x")];
    playUnit(w.p, 0, 0, w.e);
    expect(w.p.energy).toBe(6);
  });
});

describe("Gear on a chosen unit", () => {
  it("buffs the unit it was used on, with the Gear bonus", () => {
    const w = world([]);
    w.p.board = [u("pup"), u("cat")];
    w.p.hand = [u("kit")];
    w.p.gearBonus = { atk: 1, hp: 0 };
    useGear(w.p, 0, w.e, 1);
    expect(w.p.board.map(bonus)).toEqual([[0, 0], [2, 1]]);
  });
});

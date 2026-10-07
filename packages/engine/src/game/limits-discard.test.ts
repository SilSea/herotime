import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect, fighter } from "../testing.js";
import { runTrigger } from "./effects.js";
import { makeEnv } from "./env.js";
import { beginTurn } from "./session.js";

const world = content({
  factions: [{ key: "kaijin", name: "Kaijin", color: "#888", text: "", textTh: "" }],
  cards: [
    card("small", { rank: 1, atk: 1, hp: 1 }),
    card("big", { rank: 5, atk: 9, hp: 9, factions: ["kaijin"] }),
    // eats a tavern unit at the end of each turn, but only once per turn and only rank 2 or lower
    card("eater", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "END_OF_TURN", target: { selector: "SELF" }, limit: { times: 1, per: "TURN" }, actions: [{ type: "DEVOUR_SHOP", maxRank: 2 }] })] }),
    card("restless", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_DISCARD", repeat: 2, actions: [{ type: "GAIN_ENERGY", amount: 1 }] })] }),
    card("thrower", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_PLAY", actions: [{ type: "DISCARD", count: 1, pick: "LEFTMOST", cardKind: "UNIT" }] })] }),
    card("charm", { kind: "GEAR", rank: 1, cost: 1, token: true, effects: [effect({ scope: "PLAYER", trigger: "ON_DISCARD", actions: [{ type: "GAIN_ENERGY", amount: 3 }] })] }),
  ],
});
const env = () => makeEnv({ content: world, pool: new Pool(["small", "big", "eater", "restless", "thrower"].map((key) => ({ key, rank: key === "big" ? 5 : 1 }))), rng: new Rng(2) });

describe("limited effects", () => {
  it("once per turn: a second firing in the same turn does nothing; a new turn allows it again", () => {
    const e = env();
    const p = newPlayer();
    const eater = { key: "eater", golden: false };
    p.board = [eater];
    p.shop = ["small", "small", "big"];
    const fire = () => runTrigger(world.card("eater").effects, "END_OF_TURN", "UNIT", eater, p, e);
    fire();
    fire();
    expect(p.shop.filter((k) => k === "small")).toHaveLength(1); // ate only one
    expect(eater).toMatchObject({ bonusAtk: 1, bonusHp: 1 });
    beginTurn(p, 2, e);
    p.shop = ["small", "big"];
    fire();
    expect(p.shop).toEqual(["big"]); // the rank 5 unit is never eaten (maxRank 2)
    fire();
    expect(p.shop).toEqual(["big"]);
  });

  it("per game: the count never resets", () => {
    const e = env();
    const p = newPlayer();
    const fx = [effect({ scope: "PLAYER", trigger: "ON_TURN_START", limit: { times: 2, per: "GAME" }, actions: [{ type: "GAIN_ENERGY", amount: 1 }] })];
    for (let t = 0; t < 4; t++) runTrigger(fx, "ON_TURN_START", "PLAYER", null, p, e, { kind: "relic", key: "r" });
    expect(p.energy).toBe(2);
  });

  it("in a fight the limit counts per fight", () => {
    const hawk = fighter("hawk", 1, 30, { effects: [effect({ trigger: "ON_ATTACK", target: { selector: "SELF" }, limit: { times: 1, per: "TURN" }, actions: [{ type: "BUFF", atk: 1, hp: 0 }] })] });
    const r = simulateCombat([hawk], [fighter("foe", 0, 30)], 1);
    expect(r.events.filter((ev) => ev.type === "BUFF")).toHaveLength(1);
  });
});

describe("devour picks", () => {
  const eat = (choose: string) => {
    const e = env();
    const p = newPlayer();
    const me = { key: "small", golden: false };
    p.board = [me];
    p.shop = ["small", "big", "small"];
    runTrigger([effect({ trigger: "END_OF_TURN", target: { selector: "SELF" }, actions: [{ type: "DEVOUR_SHOP", choose }] })], "END_OF_TURN", "UNIT", me, p, e);
    return p.shop;
  };
  it("eats the strongest or the weakest tavern unit when asked", () => {
    expect(eat("STRONGEST")).toEqual(["small", "small"]);
    expect(eat("WEAKEST")).toEqual(["big", "small"]);
  });
});

describe("discard", () => {
  it("throws a card away from the hand; that card's 'when discarded' effect runs (here twice)", () => {
    const e = env();
    const p = newPlayer();
    p.hand = [{ key: "restless", golden: false }, { key: "small", golden: false }];
    runTrigger(world.card("thrower").effects, "ON_PLAY", "UNIT", { key: "thrower", golden: false }, p, e);
    expect(p.hand.map((u) => u.key)).toEqual(["small"]);
    expect(p.energy).toBe(2);
  });

  it("a discarded gear runs its player effects; UNIT-only discard leaves gear alone", () => {
    const e = env();
    const p = newPlayer();
    p.hand = [{ key: "charm", golden: false }];
    runTrigger(world.card("thrower").effects, "ON_PLAY", "UNIT", { key: "thrower", golden: false }, p, e);
    expect(p.hand.map((u) => u.key)).toEqual(["charm"]); // the thrower only discards units
    runTrigger([effect({ scope: "PLAYER", trigger: "ON_TURN_START", actions: [{ type: "DISCARD", count: 1, cardKind: "GEAR" }] })], "ON_TURN_START", "PLAYER", null, p, e);
    expect(p.hand).toEqual([]);
    expect(p.energy).toBe(3);
  });
});

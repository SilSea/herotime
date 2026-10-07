import { beforeEach, describe, expect, it } from "vitest";
import type { Unit } from "../content.js";
import { Rng } from "../rng/rng.js";
import { newPlayer, refresh, startTurn, toggleFreeze, type PlayerState } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect } from "../testing.js";
import { makeEnv, type GameEnv } from "./env.js";
import { buyGear, gearTargets, pickDiscover, useGear } from "./session.js";

const u = (key: string): Unit => ({ key, golden: false });
const gear = (key: string, rank: number, effects: Record<string, unknown>[]) =>
  card(key, { kind: "GEAR", rank, cost: 1, effects: effects.map((e) => effect({ scope: "PLAYER", trigger: "ON_PLAY", ...e })) });

const world = content({
  factions: [
    { key: "rider", name: "Rider", color: "#e53935", text: "", textTh: "" },
    { key: "grunt", name: "Grunt", color: "#795548", text: "", textTh: "" },
  ],
  cards: [
    card("rider_a", { rank: 1, atk: 2, hp: 2, factions: ["rider"] }),
    card("rider_b", { rank: 1, atk: 3, hp: 3, factions: ["rider"] }),
    card("rider_c", { rank: 2, atk: 4, hp: 4, factions: ["rider"] }),
    card("rider_high", { rank: 4, atk: 6, hp: 6, factions: ["rider"] }),
    card("grunt_a", { rank: 1, atk: 2, hp: 1, factions: ["grunt"] }),
    gear("blade", 1, [{ target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "BUFF", atk: 3, hp: 0 }] }]),
    gear("venom", 1, [{ target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "GIVE_KEYWORD", keyword: "LETHAL" }] }]),
    gear("driver", 1, [{ target: { selector: "CHOSEN_FRIENDLY", faction: "rider" }, actions: [{ type: "BUFF", atk: 2, hp: 2 }] }]),
    card("oath", { kind: "GEAR", rank: 1, cost: 3, costType: "HEALTH", effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "BUFF", atk: 3, hp: 3 }] })] }),
    gear("call", 1, [{ actions: [{ type: "DISCOVER_UNIT", faction: "rider" }] }]),
  ],
});

let env: GameEnv;
let p: PlayerState;

beforeEach(() => {
  const units = [...world.cards.values()].filter((c) => c.kind === "UNIT").map((c) => ({ key: c.key, rank: c.rank }));
  env = makeEnv({ content: world, pool: new Pool(units), rng: new Rng(3), gear: [{ key: "blade", rank: 1 }] });
  p = newPlayer();
  p.energy = 10;
});

describe("gear on a chosen unit", () => {
  it("goes on the unit the player picks", () => {
    p.board = [u("rider_a"), u("grunt_a"), u("rider_b")];
    p.hand = [u("blade")];
    useGear(p, 0, env, 1);
    expect(p.board[1]?.bonusAtk).toBe(3);
    expect(p.board[0]?.bonusAtk).toBeUndefined();
    expect(p.board[1]?.buffs).toEqual([{ kind: "gear", key: "blade", atk: 3, hp: 0 }]);
  });

  it("gives a keyword to the chosen unit", () => {
    p.board = [u("rider_a"), u("grunt_a")];
    p.hand = [u("venom")];
    useGear(p, 0, env, 1);
    expect(p.board[1]?.keywords).toEqual(["LETHAL"]);
    expect(p.board[0]?.keywords).toBeUndefined();
  });

  it("needs a pick when more than one unit qualifies, and keeps the card when refused", () => {
    p.board = [u("rider_a"), u("grunt_a")];
    p.hand = [u("blade")];
    expect(() => useGear(p, 0, env)).toThrow(/choose a unit/);
    expect(p.hand).toHaveLength(1);
  });

  it("only goes on units that pass its filter", () => {
    p.board = [u("grunt_a"), u("rider_a"), u("rider_b")];
    p.hand = [u("driver")];
    expect(gearTargets(p, "driver", env)).toEqual([1, 2]);
    expect(() => useGear(p, 0, env, 0)).toThrow(/cannot go on that unit/);
    useGear(p, 0, env, 2);
    expect(p.board[2]?.bonusAtk).toBe(2);
  });

  it("picks the only qualifying unit by itself, and refuses with none", () => {
    p.board = [u("grunt_a"), u("rider_a")];
    p.hand = [u("driver"), u("driver")];
    useGear(p, 0, env);
    expect(p.board[1]?.bonusHp).toBe(2);
    p.board = [u("grunt_a")];
    expect(() => useGear(p, 0, env)).toThrow(/no unit/);
  });

  it("targets nobody in particular when it has no chosen-target effect", () => {
    expect(gearTargets(p, "call", env)).toBeNull();
  });
});

describe("gear that brings a unit of one faction", () => {
  it("Discovers up to 3 different units of that faction, at most the player's rank", () => {
    p.rank = 2;
    p.hand = [u("call")];
    useGear(p, 0, env);
    const offer = p.discovers[0];
    expect(offer?.destination).toBe("HAND");
    expect(new Set(offer?.options)).toEqual(new Set(["rider_a", "rider_b", "rider_c"]));
    pickDiscover(p, 0, env);
    expect(p.hand).toHaveLength(1);
    expect(world.card(p.hand[0]?.key ?? "").factions).toEqual(["rider"]);
  });

  it("takes the offered cards from the pool and gives back the ones not picked", () => {
    p.rank = 2;
    p.hand = [u("call")];
    const before = env.pool.count("rider_a") + env.pool.count("rider_b") + env.pool.count("rider_c");
    useGear(p, 0, env);
    expect(env.pool.count("rider_a") + env.pool.count("rider_b") + env.pool.count("rider_c")).toBe(before - 3);
    pickDiscover(p, 0, env);
    expect(env.pool.count("rider_a") + env.pool.count("rider_b") + env.pool.count("rider_c")).toBe(before - 1);
  });
});

describe("the tavern always has a Gear", () => {
  it("after every refresh", () => {
    for (let i = 0; i < 20; i++) {
      p.energy = 10;
      refresh(p, env.pool, env.rng, env.cfg, env.gear);
      expect(p.shopGear).toBe("blade");
    }
  });

  it("restocks a bought Gear when the tavern was frozen", () => {
    startTurn(p, 1, env.pool, env.rng, env.cfg, env.gear);
    buyGear(p, env);
    expect(p.shopGear).toBeNull();
    toggleFreeze(p);
    startTurn(p, 2, env.pool, env.rng, env.cfg, env.gear);
    expect(p.shopGear).toBe("blade");
  });
});

describe("gear priced in Health", () => {
  it("is paid through the Health callback, not Energy", () => {
    p.shopGear = "oath";
    let paid = 0;
    buyGear(p, env, (n) => (paid += n));
    expect(paid).toBe(3);
    expect(p.energy).toBe(10);
    expect(p.hand.map((x) => x.key)).toEqual(["oath"]);
  });

  it("cannot be bought without a way to pay Health", () => {
    p.shopGear = "oath";
    expect(() => buyGear(p, env)).toThrow(/costs Health/);
    expect(p.hand).toEqual([]);
  });
});

describe("a frozen tavern", () => {
  it("keeps its cards and fills the slots that were bought", () => {
    startTurn(p, 1, env.pool, env.rng, env.cfg, env.gear);
    const size = p.shop.length;
    const kept = p.shop.slice(1);
    p.shop.splice(0, 1); // bought one
    toggleFreeze(p);
    startTurn(p, 2, env.pool, env.rng, env.cfg, env.gear);
    expect(p.shop).toHaveLength(size);
    expect(p.shop.slice(0, kept.length)).toEqual(kept);
  });
});

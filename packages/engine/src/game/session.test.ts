import { beforeEach, describe, expect, it } from "vitest";
import type { Unit } from "../content.js";
import { Rng } from "../rng/rng.js";
import { newPlayer, RuleError, refresh, type PlayerState } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect } from "../testing.js";
import { buildEnv } from "../testing-world.js";
import { makeEnv, type GameEnv } from "./env.js";
import {
  assignHero,
  beginTurn,
  buyUnit,
  endTurn,
  pickDiscover,
  playUnit,
  sellUnit,
  useGear,
  useHeroPower,
} from "./session.js";

const u = (key: string, golden = false): Unit => ({ key, golden });
const keys = (units: Unit[]): string[] => units.map((x) => x.key + (x.golden ? "*" : ""));

let env: GameEnv;
let p: PlayerState;

beforeEach(() => {
  env = buildEnv();
  p = newPlayer();
  p.energy = 10;
});

describe("beginTurn", () => {
  it("fills energy and rolls the shop", () => {
    beginTurn(p, 1, env);
    expect(p.energy).toBe(3);
    expect(p.shop.length).toBeGreaterThan(0);
  });

  it("runs player-scope ON_TURN_START effects of relics", () => {
    p.relics = ["coupon"]; // +1 energy at turn start
    beginTurn(p, 1, env);
    expect(p.energy).toBe(4);
  });

  it("applies a passive hero rule: one free refresh each turn", () => {
    assignHero(p, "time_traveler", env);
    beginTurn(p, 1, env);
    const energy = p.energy;
    refresh(p, env.pool, env.rng, env.cfg);
    expect(p.energy).toBe(energy); // free
    refresh(p, env.pool, env.rng, env.cfg);
    expect(p.energy).toBe(energy - 1); // second one costs
    beginTurn(p, 2, env);
    const e2 = p.energy;
    refresh(p, env.pool, env.rng, env.cfg);
    expect(p.energy).toBe(e2); // free again
  });
});

describe("buyUnit", () => {
  it("merges immediately when the purchase completes a triple", () => {
    p.hand = [u("grunt"), u("grunt")];
    p.shop = ["grunt"];
    const res = buyUnit(p, 0, env);
    expect(res).toHaveLength(1);
    expect(keys(p.hand)).toEqual(["grunt*"]);
    expect(p.discovers).toHaveLength(1);
  });
});

describe("playUnit", () => {
  it("runs Deploy (ON_PLAY) effects on the new unit", () => {
    p.board = [u("grunt"), u("drone")];
    p.hand = [u("shield_bearer")];
    playUnit(p, 0, 1, env);
    expect(keys(p.board)).toEqual(["grunt", "shield_bearer", "drone"]);
    expect(p.board[0]?.keywords).toEqual(["GUARD"]);
    expect(p.board[2]?.keywords).toEqual(["GUARD"]);
    expect(p.board[1]?.keywords).toBeUndefined();
  });

  it("an adjacent-only effect does nothing at the edge with no neighbor", () => {
    p.hand = [u("shield_bearer")];
    expect(() => playUnit(p, 0, 0, env)).not.toThrow();
  });

  it("playing the third copy merges a triple across board and hand", () => {
    p.board = [u("grunt"), u("grunt")];
    p.hand = [u("grunt")];
    playUnit(p, 0, 2, env);
    expect(keys(p.board)).toEqual(["grunt*"]);
  });

  it("refuses gear and giants as units", () => {
    p.hand = [u("kyodai_gattai"), u("king_giant")];
    expect(() => playUnit(p, 0, 0, env)).toThrow(/use it instead/);
    expect(() => playUnit(p, 1, 0, env)).toThrow(/not a unit/);
    expect(p.hand).toHaveLength(2);
  });

  it("rejects a bad hand slot", () => {
    expect(() => playUnit(p, 3, 0, env)).toThrow(RuleError);
  });
});

describe("useGear", () => {
  it("consumes the card and queues a Giant offer", () => {
    p.hand = [u("kyodai_gattai")];
    useGear(p, 0, env);
    expect(p.hand).toEqual([]);
    expect(p.discovers).toHaveLength(1);
    expect(p.discovers[0]?.destination).toBe("GIANT");
    expect(p.discovers[0]?.options).toHaveLength(3);
  });

  it("always offers the giant of the series with the most units on the board", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const e = buildEnv(undefined, seed);
      const pl = newPlayer();
      pl.board = [u("w_a"), u("w_b"), u("kyoryu_a")];
      pl.hand = [u("kyodai_gattai")];
      useGear(pl, 0, e);
      expect(pl.discovers[0]?.options).toContain("w_giant");
    }
  });

  it("picking a Giant puts it in the Giant Slot without touching hand or pool", () => {
    p.hand = [u("kyodai_gattai")];
    p.board = [u("w_a"), u("w_b")];
    useGear(p, 0, env);
    const total = [...env.content.cards.values()].reduce((n, c) => n + env.pool.count(c.key), 0);
    pickDiscover(p, 0, env);
    expect(p.giant?.key).toBe("w_giant");
    expect(p.hand).toEqual([]);
    expect([...env.content.cards.values()].reduce((n, c) => n + env.pool.count(c.key), 0)).toBe(total);
  });

  it("refuses non-gear", () => {
    p.hand = [u("grunt")];
    expect(() => useGear(p, 0, env)).toThrow(/not gear/);
    expect(p.hand).toHaveLength(1);
  });
});

describe("sellUnit", () => {
  it("refuses to sell gear that can be used", () => {
    p.hand = [u("kyodai_gattai")];
    expect(() => sellUnit(p, "hand", 0, env)).toThrow(/gear cannot be sold while it can be used/);
    expect(p.hand).toHaveLength(1);
  });

  it("selling a token pays energy but returns nothing to the pool", () => {
    p.board = [u("rider_form")];
    p.energy = 0;
    sellUnit(p, "board", 0, env);
    expect(p.energy).toBe(1);
    expect(env.pool.has("rider_form")).toBe(false);
  });

  it("selling a normal unit returns it to the pool", () => {
    p.board = [u("grunt")];
    const before = env.pool.count("grunt");
    sellUnit(p, "board", 0, env);
    expect(env.pool.count("grunt")).toBe(before + 1);
  });
});

describe("endTurn", () => {
  it("END_OF_TURN: Cafe Owner buffs another unit while energy is left", () => {
    p.board = [u("cafe"), u("grunt")];
    p.energy = 3;
    endTurn(p, env);
    expect(p.board[1]).toMatchObject({ bonusAtk: 1, bonusHp: 1 });
    expect(p.board[0]?.bonusAtk).toBeUndefined();
  });

  it("does nothing when the ENERGY_GTE condition fails", () => {
    p.board = [u("cafe"), u("grunt")];
    p.energy = 0;
    endTurn(p, env);
    expect(p.board[1]?.bonusAtk).toBeUndefined();
  });

  it("a golden unit doubles the buff", () => {
    p.board = [u("cafe", true), u("grunt")];
    endTurn(p, env);
    expect(p.board[1]).toMatchObject({ bonusAtk: 2, bonusHp: 2 });
  });

  it("counts turns on the board", () => {
    p.board = [u("grunt")];
    endTurn(p, env);
    endTurn(p, env);
    expect(p.board[0]?.turns).toBe(2);
  });

  describe("Henshin(N)", () => {
    it("transforms after N end-of-turns, not before", () => {
      p.board = [u("rookie")];
      endTurn(p, env);
      expect(p.board[0]?.key).toBe("rookie");
      endTurn(p, env);
      expect(p.board[0]?.key).toBe("rider_form");
      expect(p.board[0]?.turns).toBe(0);
    });

    it("fires the new form's HENSHIN effect and keeps golden + bonuses", () => {
      p.board = [{ key: "rookie", golden: true, bonusAtk: 3 }];
      endTurn(p, env);
      endTurn(p, env);
      const form = p.board[0] as Unit;
      expect(form.golden).toBe(true);
      expect(form.bonusAtk).toBe(3 + 2); // carried 3, HENSHIN buff +1 doubled for golden
      expect(env.content.stats(form).atk).toBe(4 * 2 + 5);
    });

    it("feeds the Rider Gauge and pays the repeating threshold", () => {
      p.board = [u("rookie"), u("rookie")];
      p.energy = 0;
      endTurn(p, env);
      endTurn(p, env); // both henshin: gauge +2, threshold at 2 pays 2 energy and resets
      expect(p.energy).toBe(2);
      expect(p.gauges.rider).toBe(0);
    });

    it("does not transform units without Henshin", () => {
      p.board = [u("grunt")];
      for (let i = 0; i < 5; i++) endTurn(p, env);
      expect(p.board[0]?.key).toBe("grunt");
    });
  });

  it("survives an effect removing a unit that has not acted yet", () => {
    const world = content({
      cards: [
        card("assassin", {
          effects: [effect({ trigger: "END_OF_TURN", target: { selector: "RIGHTMOST_FRIENDLY" }, actions: [{ type: "DESTROY" }] })],
        }),
        // GAIN_ENERGY needs no target, so it would still pay out if a dead unit were allowed to act
        card("victim", {
          effects: [effect({ trigger: "END_OF_TURN", actions: [{ type: "GAIN_ENERGY", amount: 5 }] })],
        }),
      ],
    });
    const e = makeEnv({ content: world, pool: new Pool([{ key: "victim", rank: 1 }]), rng: new Rng(1) });
    const pl = newPlayer();
    pl.energy = 0;
    pl.board = [u("assassin"), u("victim")];
    const before = e.pool.count("victim");
    expect(() => endTurn(pl, e)).not.toThrow();
    expect(keys(pl.board)).toEqual(["assassin"]);
    expect(pl.energy).toBe(0); // the victim was destroyed before its own effect could run
    expect(e.pool.count("victim")).toBe(before + 1);
  });
});

describe("hero", () => {
  it("assignHero rejects an unknown hero", () => {
    expect(() => assignHero(p, "nobody", env)).toThrow(/unknown hero/);
    expect(p.hero).toBeUndefined();
  });

  it("a hero without a power has nothing to use", () => {
    assignHero(p, "blank", env);
    expect(() => useHeroPower(p, env)).toThrow(/no hero power/);
  });

  it("ACTIVE: pays the cost, applies the effect, once per turn, resets next turn", () => {
    assignHero(p, "red_leader", env);
    p.board = [u("grunt"), u("scout")];
    p.energy = 5;
    useHeroPower(p, env);
    expect(p.energy).toBe(3);
    expect(p.board[0]).toMatchObject({ bonusAtk: 2, bonusHp: 2 });
    expect(() => useHeroPower(p, env)).toThrow(/already used this turn/);
    beginTurn(p, 2, env);
    p.energy = 5;
    expect(() => useHeroPower(p, env)).not.toThrow();
  });

  it("an unaffordable power changes nothing", () => {
    assignHero(p, "red_leader", env);
    p.board = [u("grunt")];
    p.energy = 1;
    expect(() => useHeroPower(p, env)).toThrow(/not enough energy/);
    expect(p.heroPowerUsed).toBe(false);
    expect(p.board[0]?.bonusAtk).toBeUndefined();
    expect(p.energy).toBe(1);
  });

  it("ONCE: usable a single time per game even across turns", () => {
    assignHero(p, "prof_belt", env);
    useHeroPower(p, env);
    expect(keys(p.hand)).toEqual(["scout"]);
    beginTurn(p, 2, env);
    expect(() => useHeroPower(p, env)).toThrow(/already used this game/);
  });

  it("PASSIVE: cannot be activated", () => {
    assignHero(p, "time_traveler", env);
    expect(() => useHeroPower(p, env)).toThrow(/passive/);
  });
});

describe("Discover through the session", () => {
  it("a Discover pick that completes a triple merges right away", () => {
    p.hand = [u("grunt"), u("grunt")];
    p.discovers = [{ options: ["grunt", "scout"], destination: "HAND" }];
    const res = pickDiscover(p, 0, env);
    expect(res).toHaveLength(1);
    expect(keys(p.hand)).toEqual(["grunt*"]);
  });
});

describe("Henshin into a pooled card", () => {
  const world = content({
    cards: [
      card("larva", { henshin: { afterTurns: 1, into: "adult" } }),
      card("adult", { rank: 2, atk: 3, hp: 3 }),
    ],
  });
  const mk = () => makeEnv({ content: world, pool: new Pool([{ key: "larva", rank: 1 }, { key: "adult", rank: 2 }]), rng: new Rng(1) });

  it("moves the pool copy to the new form", () => {
    const e = mk();
    const pl = newPlayer();
    pl.board = [u("larva")];
    e.pool.take("larva");
    const [l, a] = [e.pool.count("larva"), e.pool.count("adult")];
    endTurn(pl, e);
    expect(pl.board[0]?.key).toBe("adult");
    expect(e.pool.count("larva")).toBe(l + 1);
    expect(e.pool.count("adult")).toBe(a - 1);
  });

  it("waits and retries next turn when the pool has no copy of the new form", () => {
    const e = mk();
    const pl = newPlayer();
    pl.board = [u("larva")];
    e.pool.take("adult", e.pool.count("adult")); // drain
    endTurn(pl, e);
    expect(pl.board[0]?.key).toBe("larva");
    e.pool.give("adult");
    endTurn(pl, e);
    expect(pl.board[0]?.key).toBe("adult");
  });
});

import { describe, expect, it } from "vitest";
import { buildWorld } from "../testing-world.js";
import { card, content, fighter } from "../testing.js";
import { Match } from "../match/match.js";
import { combineGattai, gattaiGroupAt, prepareCombat, sellUnit } from "../game/session.js";
import { makeEnv } from "../game/env.js";
import { Pool } from "../shop/pool.js";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { simulateCombat } from "./combat.js";

// A small world: a core that becomes "Mega Form", two plain parts, a core without a form, and the form itself.
const world = content({
  cards: [
    card("core", { atk: 2, hp: 2, keywords: ["GATTAI"], gattaiInto: "mega" }),
    card("part", { atk: 1, hp: 2, keywords: ["GATTAI"] }),
    card("shield", { atk: 1, hp: 3, keywords: ["GATTAI", "GUARD"] }),
    card("plain_core", { atk: 3, hp: 3, keywords: ["GATTAI"] }),
    card("wall", { atk: 1, hp: 5 }),
    card("mega", { rank: 4, atk: 4, hp: 4, token: true, keywords: ["RAPID"], factions: [] }),
  ],
  heroes: [],
});
const f = (key: string, atk: number, hp: number, kw: string[] = ["GATTAI"]) => fighter(key, atk, hp, { keywords: kw as never });

describe("Gattai into a form card, in combat", () => {
  const fight = (board: ReturnType<typeof f>[]) => simulateCombat(board, [f("foe", 1, 1, [])], 1, { content: world, maxAttacksPerCombat: 1 });

  it("the leftmost core decides: the group becomes its form with the form's stats plus the parts'", () => {
    const r = fight([f("core", 2, 2), f("part", 1, 2), f("part", 1, 2)]);
    const g = r.events.find((e) => e.type === "GATTAI");
    expect(g).toMatchObject({ cardKey: "mega", atk: 4 + 4, hp: 4 + 6 });
    expect(g && g.type === "GATTAI" && [...g.keywords].sort()).toEqual(["RAPID"]);
  });

  it("moving another unit to the left changes the result", () => {
    const r = fight([f("part", 1, 2), f("core", 2, 2), f("part", 1, 2)]);
    const g = r.events.find((e) => e.type === "GATTAI");
    expect(g).toMatchObject({ cardKey: "part", atk: 4, hp: 6 }); // a plain part leads: the old merge, under its face
  });

  it("keeps the parts' keywords (Guard here) on the form", () => {
    const r = fight([f("core", 2, 2), f("shield", 1, 3, ["GATTAI", "GUARD"]), f("part", 1, 2)]);
    const g = r.events.find((e) => e.type === "GATTAI");
    expect(g && g.type === "GATTAI" && [...g.keywords].sort()).toEqual(["GUARD", "RAPID"]);
  });

  it("too few parts: nothing merges, form or not", () => {
    const r = fight([f("core", 2, 2), f("part", 1, 2), f("wall", 1, 5, [])]);
    expect(r.events.some((e) => e.type === "GATTAI")).toBe(false);
  });
});

describe("Combine for good, in the recruit phase", () => {
  const setup = () => {
    const pool = new Pool([{ key: "core", rank: 1 }, { key: "part", rank: 1 }, { key: "shield", rank: 1 }, { key: "plain_core", rank: 1 }]);
    const env = makeEnv({ content: world, pool, rng: new Rng(1) });
    const p = newPlayer();
    for (const k of ["core", "part", "part"]) pool.take(k, 1);
    p.board = [{ key: "wall", golden: false }, { key: "core", golden: false, bonusAtk: 1 }, { key: "part", golden: false }, { key: "part", golden: false }];
    return { env, p, pool };
  };

  it("knows which cores can combine", () => {
    const { env, p } = setup();
    expect(gattaiGroupAt(p, 1, env)?.form).toBe("mega");
    expect(gattaiGroupAt(p, 0, env)).toBeUndefined(); // not a core
    expect(gattaiGroupAt(p, 2, env)).toBeUndefined(); // a part has no form
  });

  it("replaces the group with one unit: form stats + the parts' current stats, freeing slots", () => {
    const { env, p } = setup();
    combineGattai(p, 1, env);
    expect(p.board.map((u) => u.key)).toEqual(["wall", "mega"]);
    const mega = p.board[1];
    expect(world.stats(mega as never)).toEqual({ atk: 4 + 3 + 1 + 1, hp: 4 + 2 + 2 + 2 }); // core had +1 attack
    expect(mega?.components?.map((u) => u.key)).toEqual(["core", "part", "part"]);
    expect(mega?.buffs).toEqual([{ kind: "gattai", key: "core", atk: 5, hp: 6 }]);
    expect(prepareCombat(p, env).units[1]).toMatchObject({ cardKey: "mega", atk: 9, hp: 10, keywords: ["RAPID"] });
  });

  it("selling the combined unit gives every part back to the pool", () => {
    const { env, p, pool } = setup();
    const before = { core: pool.count("core"), part: pool.count("part") };
    combineGattai(p, 1, env);
    sellUnit(p, "board", 1, env);
    expect(pool.count("core")).toBe(before.core + 1);
    expect(pool.count("part")).toBe(before.part + 2);
  });

  it("refuses when the core is not leftmost of enough Gattai units", () => {
    const { env, p } = setup();
    p.board.splice(3, 1);
    expect(() => combineGattai(p, 1, env)).toThrow(/cannot combine/);
    expect(p.board).toHaveLength(3);
  });

  it("a combined form is never counted towards a triple", async () => {
    const { resolveTriples } = await import("../shop/triple.js");
    const { env, p } = setup();
    combineGattai(p, 1, env);
    p.hand = [{ key: "mega", golden: false, components: [] }, { key: "mega", golden: false, components: [] }];
    expect(resolveTriples(p, env.pool, env.rng, env.cfg)).toEqual([]);
  });
});

describe("content checks", () => {
  it("gattaiInto must name an existing unit, on a card that has GATTAI", () => {
    const bad = () =>
      content({
        cards: [card("c1", { keywords: ["GATTAI"], gattaiInto: "nope" }), card("c2", { gattaiInto: "c1" })],
        heroes: [],
      });
    expect(bad).toThrow(/gattaiInto/);
  });

  it("matches tell the player which cores can combine", () => {
    const w = buildWorld();
    const m = Match.create({ content: w, seed: 1, entrants: [{ id: "a", name: "A", isBot: false }, { id: "b", name: "B", isBot: false }], now: 0 });
    for (const id of ["a", "b"]) m.dispatch(id, { type: "CHOOSE_HERO", index: 0 }, 0);
    expect(m.view("a").me.combinable).toEqual([]);
  });
});

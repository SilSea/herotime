import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect } from "../testing.js";
import { makeEnv } from "./env.js";
import { gearTargets } from "./session.js";

// A form reached by a Gear (TRANSFORM) says which card it is a form of, so naming that card finds it too.
const world = content({
  cards: [
    card("hero", { rank: 1, atk: 2, hp: 2 }),
    card("hero_wing", { rank: 1, atk: 3, hp: 2, token: true, formOf: "hero" }),
    card("other", { rank: 1, atk: 2, hp: 2 }),
    card("capsem", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY", cards: ["hero"] }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] }),
  ],
});

describe("formOf", () => {
  it("puts the card it is a form of in its lineage", () => {
    expect(world.lineage("hero_wing")).toEqual(["hero_wing", "hero"]);
  });
  it("a filter naming the card also takes its forms", () => {
    const e = makeEnv({ content: world, pool: new Pool([{ key: "hero", rank: 1 }, { key: "other", rank: 1 }]), rng: new Rng(1) });
    const p = newPlayer();
    p.board = [{ key: "other", golden: false }, { key: "hero_wing", golden: false }, { key: "hero", golden: false }];
    expect(gearTargets(p, "capsem", e)).toEqual([1, 2]);
  });
  it("must name a card that exists", () => {
    expect(() => content({ cards: [card("x", { formOf: "nope" })] })).toThrow(/formOf/);
  });
});

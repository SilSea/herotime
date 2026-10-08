import { describe, expect, it } from "vitest";
import { makeEnv } from "../game/env.js";
import { Rng } from "../rng/rng.js";
import { newPlayer, type Unit } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect } from "../testing.js";
import { runBot } from "./bot.js";

// The bot plays toward its cards: Gattai groups, Gear made for its units, missing Sentai colours, triples.
const world = content({
  cards: [
    card("core", { rank: 1, atk: 2, hp: 2, keywords: ["GATTAI"], gattaiInto: "robo" }),
    card("part", { rank: 1, atk: 1, hp: 1, keywords: ["GATTAI"] }),
    card("robo", { rank: 1, atk: 5, hp: 5, token: true }),
    card("plain", { rank: 1, atk: 1, hp: 1 }),
    card("hero", { rank: 1, atk: 2, hp: 2 }),
    card("hero_form", { rank: 1, atk: 4, hp: 4, token: true }),
    card("capsem", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY", cards: ["hero"] }, actions: [{ type: "TRANSFORM", into: "hero_form" }] })] }),
    card("red", { rank: 1, atk: 1, hp: 1, colors: ["RED"] }),
    card("red2", { rank: 1, atk: 1, hp: 1, colors: ["RED"] }),
    card("blue", { rank: 1, atk: 1, hp: 1, colors: ["BLUE"] }),
  ],
});
const env = (gear: { key: string; rank: number }[] = []) =>
  makeEnv({ content: world, pool: new Pool(["core", "part", "plain", "hero", "red", "red2", "blue"].map((key) => ({ key, rank: 1 }))), rng: new Rng(3), gear });
const u = (key: string): Unit => ({ key, golden: false });

describe("bot plans", () => {
  it("lines up a Gattai group behind its core and combines it", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("part"), u("plain"), u("part"), u("core")];
    runBot(p, 1, e);
    expect(p.board.map((x) => x.key)).toContain("robo");
  });

  it("buys Gear made for one of its units before units, and uses it on that unit", () => {
    const e = env([{ key: "capsem", rank: 1 }]);
    const p = newPlayer();
    // 3 Energy: enough for a unit or the Gear (1) but not both; the old bot spent it on the unit.
    p.energy = 3;
    p.board = [u("plain"), u("hero")];
    p.shopGear = "capsem";
    p.shop = ["plain"];
    runBot(p, 1, e);
    expect(p.board.map((x) => x.key)).toContain("hero_form");
  });

  it("a Final Form card only fits a unit that has a Final Form (players and bots alike)", async () => {
    const { gearTargets } = await import("../game/session.js");
    const w = content({
      cards: [
        card("big", { rank: 1, atk: 9, hp: 9 }),
        card("rider", { rank: 1, atk: 1, hp: 1, ultimateInto: "rider_final" }),
        card("rider_final", { rank: 1, atk: 8, hp: 8, token: true }),
        card("final_card", { kind: "GEAR", rank: 1, cost: 0, token: true, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "ULTIMATE_FORM" }] })] }),
      ],
    });
    const e = makeEnv({ content: w, pool: new Pool([{ key: "big", rank: 1 }, { key: "rider", rank: 1 }]), rng: new Rng(1) });
    const p = newPlayer();
    p.board = [u("big"), u("rider")];
    expect(gearTargets(p, "final_card", e)).toEqual([1]);
    p.hand = [u("final_card")];
    runBot(p, 1, e);
    expect(p.board.map((x) => x.key)).toEqual(["big", "rider_final"]); // not wasted on the bigger unit
  });

  it("prefers a Sentai colour its team does not have", () => {
    const e = env();
    const p = newPlayer();
    p.energy = 3;
    p.board = [u("red")];
    p.shop = ["red2", "blue"];
    runBot(p, 1, e);
    expect([...p.board, ...p.hand].map((x) => x.key)).toContain("blue");
  });

  it("freezes a tavern that holds the third copy of a pair it could not buy", () => {
    const e = env();
    const p = newPlayer();
    p.energy = 0;
    p.board = [u("plain"), u("plain")];
    p.shop = ["plain"];
    runBot(p, 1, e);
    expect(p.frozen).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import { Rng } from "../rng/rng.js";
import { newPlayer, sell } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect, fighter } from "../testing.js";
import { runEffect } from "./effects.js";
import { makeEnv } from "./env.js";
import { applyCombatOutcome, beginTurn, combatOptions, prepareCombat, useGear } from "./session.js";

const world = content({
  cards: [
    card("pup", { rank: 1, atk: 1, hp: 2 }),
    card("bear", { rank: 2, atk: 4, hp: 5 }),
    card("mirror", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "COPY", to: "HAND" }] })] }),
    card("twin", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "COPY", to: "BOARD", withBuffs: true }] })] }),
  ],
});
const env = () => makeEnv({ content: world, pool: new Pool([{ key: "pup", rank: 1 }, { key: "bear", rank: 2 }]), rng: new Rng(6) });
const u = (key: string, o: Record<string, unknown> = {}) => ({ key, golden: false, ...o });

describe("COPY", () => {
  it("to the hand: the base card, a new one that does not come from the pool", () => {
    const e = env();
    const p = newPlayer();
    p.energy = 5;
    p.board = [u("bear", { bonusAtk: 3, keywords: ["GUARD"] })];
    p.hand = [u("mirror")];
    const before = e.pool.count("bear");
    useGear(p, 0, e);
    expect(p.hand).toEqual([{ key: "bear", golden: false, unpooled: 1 }]);
    expect(e.pool.count("bear")).toBe(before);
    // selling it does not grow the pool
    sell(p, "hand", 0, e.pool, e.cfg);
    expect(e.pool.count("bear")).toBe(before);
  });

  it("to the board, with bonuses: right of the original, buffs and keywords kept", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("bear", { bonusAtk: 3, keywords: ["GUARD"] }), u("pup")];
    p.hand = [u("twin")];
    useGear(p, 0, e, 0);
    expect(p.board.map((x) => x.key)).toEqual(["bear", "bear", "pup"]);
    expect(p.board[1]).toMatchObject({ bonusAtk: 3, keywords: ["GUARD"], unpooled: 1 });
  });

  it("copies count for a triple, and the Golden unit only gives back the pool copies", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("pup"), u("pup")];
    const before = e.pool.count("pup");
    runEffect(effect({ scope: "PLAYER", trigger: "ON_TURN_START", target: { selector: "LEFTMOST_FRIENDLY" }, actions: [{ type: "COPY", to: "HAND" }] }), null, p, e);
    expect(p.board.concat(p.hand).filter((x) => x.key === "pup")).toEqual([expect.objectContaining({ golden: true, unpooled: 1 })]);
    expect(p.discovers).toHaveLength(1); // the usual triple reward
    const golden = [...p.board, ...p.hand].find((x) => x.golden)!;
    const from = p.board.includes(golden) ? "board" : "hand";
    sell(p, from, (from === "board" ? p.board : p.hand).indexOf(golden), e.pool, e.cfg);
    expect(e.pool.count("pup")).toBe(before + 2); // 3 in the Golden unit, 1 of them a copy
  });

  it("does nothing on a full board / hand", () => {
    const e = env();
    const p = newPlayer();
    p.board = Array.from({ length: 7 }, () => u("pup", { golden: true })); // Golden units: no triple to clear space
    runEffect(effect({ scope: "PLAYER", trigger: "ON_TURN_START", target: { selector: "LEFTMOST_FRIENDLY" }, actions: [{ type: "COPY", to: "BOARD" }] }), null, p, e);
    expect(p.board).toHaveLength(7);
  });

  it("fight, to the board: copies an enemy for this fight; with bonuses keeps its current stats", () => {
    const steal = effect({ trigger: "START_OF_COMBAT", target: { selector: "LEFTMOST_ENEMY" }, actions: [{ type: "COPY", to: "BOARD", withBuffs: true }] });
    const r = simulateCombat([fighter("x", 0, 30, { effects: [steal] })], [fighter("bear", 7, 9, { keywords: ["GUARD"] })], 1, { content: world, maxAttacksPerCombat: 1 });
    expect(r.events.find((ev) => ev.type === "SUMMON")).toMatchObject({ side: "A", cardKey: "bear", atk: 7, hp: 9, keywords: ["GUARD"] });
    const base = effect({ trigger: "START_OF_COMBAT", target: { selector: "LEFTMOST_ENEMY" }, actions: [{ type: "COPY", to: "BOARD" }] });
    const r2 = simulateCombat([fighter("x", 0, 30, { effects: [base] })], [fighter("bear", 7, 9)], 1, { content: world, maxAttacksPerCombat: 1 });
    expect(r2.events.find((ev) => ev.type === "SUMMON")).toMatchObject({ cardKey: "bear", atk: 4, hp: 5 });
  });

  it("fight, to the hand: arrives next turn", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("pup")];
    const mine = prepareCombat(p, e);
    mine.units[0] = { ...mine.units[0]!, effects: [effect({ trigger: "START_OF_COMBAT", target: { selector: "LEFTMOST_ENEMY" }, actions: [{ type: "COPY", to: "HAND" }] })] };
    const r = simulateCombat(mine.units, [fighter("bear", 1, 99)], 1, { ...combatOptions(e), a: mine.extras, maxAttacksPerCombat: 1 });
    applyCombatOutcome(p, r, "A", e);
    expect(p.hand).toEqual([]);
    beginTurn(p, 2, e);
    expect(p.hand).toEqual([{ key: "bear", golden: false, unpooled: 1 }]);
  });
});

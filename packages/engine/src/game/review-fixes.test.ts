import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect } from "../testing.js";
import { makeEnv } from "./env.js";
import { beginTurn, endTurn } from "./session.js";

const world = content({
  cards: [
    // "On Henshin: gain 2 Energy" printed on the card that transforms; the form has an "On Henshin" of its own too
    card("agent", { rank: 1, atk: 1, hp: 1, henshin: { afterTurns: 1, into: "rider" }, effects: [effect({ trigger: "HENSHIN", actions: [{ type: "BUFF", atk: 2, hp: 0 }] })] }),
    card("rider", { rank: 3, atk: 4, hp: 4, token: true, effects: [effect({ trigger: "HENSHIN", actions: [{ type: "BUFF", atk: 0, hp: 9 }] })] }),
    // "At the start of each turn: gain 1 Energy" on a unit
    card("nox", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_TURN_START", actions: [{ type: "GAIN_ENERGY", amount: 1 }] })] }),
  ],
});
const env = () => makeEnv({ content: world, pool: new Pool([{ key: "agent", rank: 1 }, { key: "nox", rank: 1 }]), rng: new Rng(1) });

describe("On Henshin", () => {
  it("runs the effect printed on the card that transforms (acting as the new form), not the new form's", () => {
    const e = env();
    const p = newPlayer();
    p.board = [{ key: "agent", golden: false }];
    endTurn(p, e);
    expect(p.board[0]).toMatchObject({ key: "rider", bonusAtk: 2 });
    expect(p.board[0]?.bonusHp ?? 0).toBe(0);
  });
});

describe("At the start of each turn, on a unit", () => {
  it("runs for units on the board, after the Energy refill; not from the hand", () => {
    const e = env();
    const p = newPlayer();
    p.board = [{ key: "nox", golden: true }];
    p.hand = [{ key: "nox", golden: false }];
    beginTurn(p, 2, e);
    expect(p.energy).toBe(4 + 2); // turn 2 refills to 4; golden doubles the 1
  });
});

describe("content validation", () => {
  it("warns about a unit effect on a trigger units never get", () => {
    const bad = () => content({ cards: [card("u", { effects: [effect({ trigger: "ON_USE", actions: [{ type: "GAIN_ENERGY", amount: 1 }] })] })] });
    expect(bad).toThrow(/a unit effect never gets ON_USE/);
  });
});

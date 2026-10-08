import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect, fighter } from "../testing.js";
import { makeEnv } from "./env.js";
import { playUnit, useGear } from "./session.js";

// "Deploy: give Agent Number 7 or Zeztz +2/+2" and "if you have Zeztz, ..."
const deployBuff = effect({ trigger: "ON_PLAY", target: { selector: "ALL_FRIENDLY", cards: ["agent7", "zeztz"] }, actions: [{ type: "BUFF", atk: 2, hp: 2 }] });
const world = content({
  cards: [
    card("agent7", { rank: 1, atk: 1, hp: 1 }),
    card("zeztz", { rank: 1, atk: 2, hp: 2, henshin: { afterTurns: 2, into: "zeztz_form" } }),
    card("zeztz_form", { rank: 1, atk: 4, hp: 4, token: true, ultimateInto: "zeztz_ultimate" }),
    card("zeztz_ultimate", { rank: 1, atk: 8, hp: 8, token: true }),
    card("bystander", { rank: 1, atk: 1, hp: 1 }),
    card("caller", { rank: 1, atk: 1, hp: 1, effects: [deployBuff] }),
    card("fan", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_PLAY", condition: { type: "HAS_CARD", cards: ["zeztz"] }, target: { selector: "SELF" }, actions: [{ type: "BUFF", atk: 3, hp: 3 }] })] }),
    card("kit", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY", cards: ["zeztz"] }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] }),
    // A Capsem: any unit takes the buff, only Zeztz also changes form.
    card("capsem", { kind: "GEAR", rank: 1, cost: 1, effects: [
      effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] }),
      effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY", cards: ["zeztz"] }, actions: [{ type: "TRANSFORM", into: "zeztz_form" }] }),
    ] }),
  ],
});
const env = () => makeEnv({ content: world, pool: new Pool([{ key: "bystander", rank: 1 }]), rng: new Rng(3) });
const unit = (key: string) => ({ key, golden: false });

describe("target filter: named cards", () => {
  it("only the named cards are buffed, in any of their later forms", () => {
    const e = env();
    const p = newPlayer();
    p.board = [unit("agent7"), unit("bystander"), unit("zeztz_ultimate")];
    p.hand = [unit("caller")];
    playUnit(p, 0, 3, e);
    expect(p.board.map((u) => [u.key, u.bonusAtk ?? 0, u.bonusHp ?? 0])).toEqual([
      ["agent7", 2, 2],
      ["bystander", 0, 0],
      ["zeztz_ultimate", 2, 2],
      ["caller", 0, 0],
    ]);
  });

  it("the lineage of a card is itself plus what turns into it", () => {
    expect(world.lineage("zeztz_ultimate")).toEqual(["zeztz_ultimate", "zeztz_form", "zeztz"]);
    expect(world.lineage("agent7")).toEqual(["agent7"]);
  });

  it("gear can only go on a named card (here: Zeztz in a later form)", () => {
    const e = env();
    const p = newPlayer();
    p.energy = 5;
    p.board = [unit("bystander"), unit("zeztz_form")];
    p.hand = [unit("kit")];
    expect(() => useGear(p, 0, e, 0)).toThrow(/cannot go on that unit/);
    useGear(p, 0, e); // the only unit it fits is picked for you
    expect(p.board[0]?.bonusAtk ?? 0).toBe(0);
    expect(p.board[1]?.bonusAtk).toBe(1);
  });

  it("a gear in parts goes on a unit any part fits; the parts that do not fit it are skipped, not moved", () => {
    const e = env();
    const p = newPlayer();
    p.board = [unit("zeztz"), unit("bystander")];
    p.hand = [unit("capsem"), unit("capsem")];
    useGear(p, 0, e, 1); // the bystander: buffed, and the Zeztz next to it is left alone
    expect(p.board.map((u) => [u.key, u.bonusAtk ?? 0])).toEqual([["zeztz", 0], ["bystander", 1]]);
    useGear(p, 0, e, 0); // the Zeztz: buffed and transformed
    expect(p.board.map((u) => [u.key, u.bonusAtk ?? 0])).toEqual([["zeztz_form", 1], ["bystander", 1]]);
  });

  it("works in a fight too", () => {
    const buff = effect({ trigger: "START_OF_COMBAT", target: { selector: "ALL_FRIENDLY", cards: ["zeztz"] }, actions: [{ type: "BUFF", atk: 5, hp: 0 }] });
    const r = simulateCombat(
      [fighter("caller", 0, 30, { effects: [buff] }), fighter("zeztz_form", 1, 30), fighter("bystander", 1, 30)],
      [fighter("foe", 0, 99)],
      1,
      { content: world },
    );
    const buffed = r.events.filter((ev) => ev.type === "BUFF").map((ev) => (ev as { unit: string }).unit);
    expect(buffed).toEqual(["A1"]); // only the Zeztz form (uids are side + index)
  });
});

describe("condition HAS_CARD", () => {
  it("holds while one of the cards (or a later form) is on the board", () => {
    const e = env();
    const p = newPlayer();
    p.board = [unit("bystander")];
    p.hand = [unit("fan"), unit("fan")];
    playUnit(p, 0, 1, e);
    expect(p.board[1]?.bonusAtk ?? 0).toBe(0);
    p.board.push(unit("zeztz_ultimate"));
    playUnit(p, 0, 0, e);
    expect(p.board[0]).toMatchObject({ key: "fan", bonusAtk: 3, bonusHp: 3 });
  });

  it("is checked in a fight", () => {
    const fx = effect({ trigger: "START_OF_COMBAT", condition: { type: "HAS_CARD", cards: ["agent7"] }, target: { selector: "SELF" }, actions: [{ type: "BUFF", atk: 1, hp: 0 }] });
    const run = (mates: string[]) =>
      simulateCombat([fighter("x", 0, 30, { effects: [fx] }), ...mates.map((k) => fighter(k, 0, 30))], [fighter("foe", 0, 99)], 1, { content: world }).events.filter((ev) => ev.type === "BUFF").length;
    expect(run(["bystander"])).toBe(0);
    expect(run(["agent7"])).toBe(1);
  });
});

describe("content validation", () => {
  it("names unknown cards in a target or a HAS_CARD condition", () => {
    const bad = () =>
      content({
        cards: [
          card("a", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_PLAY", target: { selector: "ALL_FRIENDLY", cards: ["ghost"] }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] }),
          card("b", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_PLAY", condition: { type: "HAS_CARD", cards: ["phantom"] }, actions: [{ type: "GAIN_ENERGY", amount: 1 }] })] }),
        ],
      });
    expect(bad).toThrow(/unknown card "ghost"[\s\S]*unknown card "phantom"/);
  });
});

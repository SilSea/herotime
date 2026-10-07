import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect, fighter } from "../testing.js";
import { runEffect } from "./effects.js";
import { makeEnv } from "./env.js";
import { applyCombatOutcome, combatOptions, playUnit, prepareCombat } from "./session.js";

const consume = (o: Record<string, unknown> = {}) => effect({ trigger: "ON_PLAY", target: { selector: "SELF" }, actions: [{ type: "CONSUME_ALLIES", ...o }] });
const world = content({
  cards: [
    // "Deploy: give all other allies this unit's ATK/HP"
    card("captain", { rank: 1, atk: 3, hp: 4, effects: [effect({ trigger: "ON_PLAY", target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 0, hp: 0, fromSelf: true }] })] }),
    // "Last Stand: give a random ally this unit's ATK/HP +1/+0"
    card("martyr", { rank: 1, atk: 2, hp: 5, effects: [effect({ trigger: "LAST_STAND", target: { selector: "RANDOM_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 0, fromSelf: true, permanent: true }] })] }),
    card("eater", { rank: 1, atk: 1, hp: 1, effects: [consume()] }),
    card("pup", { rank: 1, atk: 1, hp: 2 }),
    card("bear", { rank: 1, atk: 4, hp: 5 }),
  ],
});
const env = () => makeEnv({ content: world, pool: new Pool(["pup", "bear"].map((key) => ({ key, rank: 1 }))), rng: new Rng(9) });
const u = (key: string, o: Record<string, unknown> = {}) => ({ key, golden: false, ...o });

describe("BUFF with this unit's own stats", () => {
  it("gives the others its current ATK/HP, bonuses included", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("pup"), u("bear")];
    p.hand = [u("captain", { bonusAtk: 1, bonusHp: 1 })];
    playUnit(p, 0, 2, e);
    expect(p.board.map((x) => [x.key, x.bonusAtk ?? 0, x.bonusHp ?? 0])).toEqual([
      ["pup", 4, 5],
      ["bear", 4, 5],
      ["captain", 1, 1], // it passes its stats on to the others, not to itself
    ]);
  });

  it("a player effect (no unit) adds nothing extra", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("pup")];
    runEffect(effect({ scope: "PLAYER", trigger: "ON_TURN_START", target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 1, fromSelf: true }] }), null, p, e);
    expect(p.board[0]).toMatchObject({ bonusAtk: 1, bonusHp: 1 });
  });

  it("in a fight a Last Stand passes on what it had, and permanently", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("martyr"), u("pup")];
    const mine = prepareCombat(p, e);
    const r = simulateCombat(mine.units, [fighter("wall", 9, 99, { keywords: ["GUARD"] })], 1, { ...combatOptions(e), a: mine.extras, maxAttacksPerCombat: 1 });
    expect(r.events).toContainEqual({ type: "BUFF", unit: "A1", atk: 2 + 1, hp: 5 });
    applyCombatOutcome(p, r, "A", e);
    expect(p.board[1]).toMatchObject({ bonusAtk: 3, bonusHp: 5 });
  });
});

describe("CONSUME_ALLIES", () => {
  it("recruit: destroys all your other units for good and gives their total stats", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("pup"), u("bear", { bonusAtk: 2 })];
    p.giant = u("bear");
    p.hand = [u("eater")];
    const before = e.pool.count("pup");
    playUnit(p, 0, 1, e);
    expect(p.board.map((x) => x.key)).toEqual(["eater"]);
    expect(p.board[0]).toMatchObject({ bonusAtk: 1 + 6, bonusHp: 2 + 5 });
    expect(p.giant?.key).toBe("bear"); // the Giant is not on the board: untouched
    expect(e.pool.count("pup")).toBe(before + 1); // back to the pool, like any destroyed unit
  });

  it("fight: destroys the others (their Last Stands fire), the target keeps the total for the fight, or for good", () => {
    const e = env();
    for (const permanent of [false, true]) {
      const p = newPlayer();
      p.board = [u("martyr"), u("eater"), u("pup")];
      const fx = effect({ trigger: "START_OF_COMBAT", target: { selector: "SELF" }, actions: [{ type: "CONSUME_ALLIES", permanent }] });
      const mine = prepareCombat(p, e);
      mine.units[1] = { ...mine.units[1]!, effects: [fx] };
      const r = simulateCombat(mine.units, [fighter("wall", 0, 99)], 2, { ...combatOptions(e), a: mine.extras, maxAttacksPerCombat: 1 });
      expect(r.events.filter((ev) => ev.type === "DESTROY").map((ev) => (ev as { unit: string }).unit)).toEqual(["A0", "A2"]);
      // eater gets 2/5 + 1/2, then the martyr's Last Stand (random ally: only eater is left) adds 3/5
      expect(r.events.filter((ev) => ev.type === "BUFF")).toEqual([
        { type: "BUFF", unit: "A1", atk: 3, hp: 7 },
        { type: "BUFF", unit: "A1", atk: 3, hp: 5 },
      ]);
      applyCombatOutcome(p, r, "A", e);
      expect(p.board.map((x) => x.key)).toEqual(["martyr", "eater", "pup"]); // a fight never removes units for good
      expect(p.board[1]?.bonusAtk ?? 0).toBe(permanent ? 3 + 3 : 3);
    }
  });

  it("with nobody else, it gives nothing", () => {
    const e = env();
    const p = newPlayer();
    p.hand = [u("eater")];
    playUnit(p, 0, 0, e);
    expect(p.board[0]?.bonusAtk ?? 0).toBe(0);
  });
});

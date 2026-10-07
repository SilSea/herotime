import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect, fighter } from "../testing.js";
import { runEffect } from "./effects.js";
import { makeEnv } from "./env.js";
import { applyCombatOutcome, beginTurn, combatOptions, playUnit, prepareCombat, useGear } from "./session.js";

const gearUp = (atk: number, hp: number, o: Record<string, unknown> = {}) => effect({ trigger: "ON_PLAY", actions: [{ type: "BUFF_GEAR", atk, hp }], ...o });
const world = content({
  factions: [{ key: "rider", name: "Rider", color: "#888", text: "", textTh: "" }],
  cards: [
    card("blade", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "BUFF", atk: 2, hp: 1 }] })] }),
    card("banner", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] }),
    card("shield", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "GIVE_KEYWORD", keyword: "BARRIER" }] })] }),
    card("smith", { rank: 1, atk: 1, hp: 1, effects: [gearUp(1, 1)] }),
    // "If you have 2+ Riders at the end of turn, your Gear give +1/+0 more"
    card("mentor", { rank: 1, atk: 1, hp: 1, factions: ["rider"], effects: [effect({ trigger: "END_OF_TURN", condition: { type: "FACTION_COUNT_GTE", faction: "rider", value: 2 }, actions: [{ type: "BUFF_GEAR", atk: 1, hp: 0 }] })] }),
    card("forger", { rank: 1, atk: 1, hp: 20, effects: [effect({ trigger: "ON_ATTACK", limit: { times: 1, per: "TURN" }, actions: [{ type: "BUFF_GEAR", atk: 1, hp: 1 }] })] }),
    card("dummy", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_PLAY", target: { selector: "LEFTMOST_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] }),
  ],
});
const env = () => makeEnv({ content: world, pool: new Pool([{ key: "dummy", rank: 1 }]), rng: new Rng(2) });
const u = (key: string, golden = false) => ({ key, golden });

describe("BUFF_GEAR", () => {
  it("makes every stat-giving Gear give more, for the rest of the game, stacking", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("dummy")];
    p.hand = [u("smith"), u("smith", true), u("blade")];
    playUnit(p, 0, 1, e); // +1/+1
    playUnit(p, 0, 2, e); // golden: +2/+2
    expect(p.gearBonus).toEqual({ atk: 3, hp: 3 });
    useGear(p, 0, e, 0);
    expect(p.board[0]).toMatchObject({ bonusAtk: 2 + 3, bonusHp: 1 + 3 });
    expect(p.board[0]?.buffs).toEqual([expect.objectContaining({ kind: "gear", key: "blade", atk: 5, hp: 4 })]);
  });

  it("adds to each unit a Gear buffs, and not to a Gear that gives no stats", () => {
    const e = env();
    const p = newPlayer();
    p.gearBonus = { atk: 1, hp: 0 };
    p.board = [u("dummy"), u("dummy")];
    p.hand = [u("banner"), u("shield")];
    useGear(p, 0, e);
    expect(p.board.map((x) => [x.bonusAtk, x.bonusHp])).toEqual([[2, 1], [2, 1]]);
    useGear(p, 0, e, 1);
    expect(p.board[1]).toMatchObject({ bonusAtk: 2, bonusHp: 1, keywords: ["BARRIER"] });
  });

  it("does not touch stats from units, relics or heroes", () => {
    const e = env();
    const p = newPlayer();
    p.gearBonus = { atk: 5, hp: 5 };
    p.board = [u("dummy")];
    p.hand = [u("dummy")];
    playUnit(p, 0, 1, e);
    expect(p.board[0]).toMatchObject({ bonusAtk: 1, bonusHp: 1 });
  });

  it("can wait for a condition (End of turn with 2+ Riders)", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("mentor")];
    for (const fx of world.card("mentor").effects) runEffect(fx, p.board[0]!, p, e);
    expect(p.gearBonus).toBeUndefined();
    p.board.push(u("mentor"));
    for (const fx of world.card("mentor").effects) runEffect(fx, p.board[0]!, p, e);
    expect(p.gearBonus).toEqual({ atk: 1, hp: 0 });
  });

  it("earned in a fight, it arrives next turn", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("forger")];
    const mine = prepareCombat(p, e);
    const r = simulateCombat(mine.units, [fighter("wall", 1, 99)], 3, { ...combatOptions(e), a: mine.extras, maxAttacksPerCombat: 8 });
    expect(r.rewards.A).toEqual([{ action: { type: "BUFF_GEAR", atk: 1, hp: 1 }, mult: 1, from: "forger" }]); // limit: once
    applyCombatOutcome(p, r, "A", e);
    expect(p.gearBonus).toBeUndefined();
    beginTurn(p, 2, e);
    expect(p.gearBonus).toEqual({ atk: 1, hp: 1 });
  });
});

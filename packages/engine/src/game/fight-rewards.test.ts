import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect, fighter } from "../testing.js";
import { makeEnv } from "./env.js";
import { applyCombatOutcome, beginTurn, combatOptions, prepareCombat } from "./session.js";

const world = content({
  gauges: [{ key: "mecha", name: "Mecha", max: 6, sources: [], thresholds: [] }],
  cards: [
    // "When this attacks: gain 1 Energy next turn"
    card("miner", { rank: 1, atk: 1, hp: 20, effects: [effect({ trigger: "ON_ATTACK", actions: [{ type: "GAIN_ENERGY", amount: 1 }] })] }),
    // "Last Stand: add a Cub to your hand next turn, Mecha Gauge +1"
    card("martyr", { rank: 1, atk: 0, hp: 1, effects: [effect({ trigger: "LAST_STAND", actions: [{ type: "ADD_TO_HAND", cardKey: "cub" }, { type: "GAUGE_ADD", gauge: "mecha", amount: 1 }] })] }),
    card("cub", { rank: 1, atk: 1, hp: 1, token: true }),
    card("wall", { rank: 1, atk: 5, hp: 99 }),
  ],
});
const env = () => makeEnv({ content: world, pool: new Pool([{ key: "wall", rank: 1 }]), rng: new Rng(5) });

/** Fight `mine` against a wall, write the outcome back and start the next turn. */
function fightThenNextTurn(board: { key: string; golden?: boolean }[], turn = 2) {
  const e = env();
  const p = newPlayer();
  p.board = board.map((u) => ({ key: u.key, golden: u.golden ?? false }));
  const mine = prepareCombat(p, e);
  const result = simulateCombat(mine.units, [fighter("wall", 5, 99)], 7, { ...combatOptions(e), a: mine.extras, maxAttacksPerCombat: 6 });
  applyCombatOutcome(p, result, "A", e);
  const pending = p.fightRewards?.length ?? 0;
  beginTurn(p, turn, e);
  return { p, result, pending };
}

describe("rewards earned in a fight", () => {
  it("arrive at the start of the next turn, on top of the Energy refill", () => {
    const { p, result, pending } = fightThenNextTurn([{ key: "miner" }]);
    const attacks = result.events.filter((ev) => ev.type === "ATTACK" && ev.attacker === "A0").length;
    expect(attacks).toBeGreaterThan(0);
    expect(result.rewards.A).toHaveLength(attacks);
    expect(result.events.filter((ev) => ev.type === "REWARD")).toHaveLength(attacks);
    expect(pending).toBe(attacks);
    expect(p.energy).toBe(Math.min(4 + attacks, 10)); // turn 2 refills to 4
    expect(p.fightRewards).toBeUndefined();
  });

  it("cards and Gauge from a Last Stand (golden: the Gauge doubles, as in the tavern)", () => {
    const { p } = fightThenNextTurn([{ key: "martyr", golden: true }]);
    expect(p.hand.map((u) => u.key)).toEqual(["cub"]);
    expect(p.gauges.mecha).toBe(2);
  });

  it("nothing is earned by a side that never triggers", () => {
    const { p, result } = fightThenNextTurn([{ key: "wall" }]);
    expect(result.rewards.A).toEqual([]);
    expect(p.energy).toBe(4);
  });
});

describe("TRANSFORM in a fight", () => {
  it("turns the target into another card mid-fight", () => {
    const morph = effect({ trigger: "START_OF_COMBAT", target: { selector: "SELF" }, actions: [{ type: "TRANSFORM", into: "wall" }] });
    const r = simulateCombat([fighter("x", 1, 1, { effects: [morph] })], [fighter("foe", 1, 3)], 1, { content: world });
    expect(r.events.find((ev) => ev.type === "TRANSFORM")).toMatchObject({ into: "wall", atk: 5, hp: 99 });
    expect(r.winner).toBe("A");
  });
});

describe("content validation", () => {
  it("accepts Energy / cards / Gauge in fight triggers, still refuses tavern-only actions", () => {
    expect(world.cards.size).toBe(4);
    const bad = () => content({ cards: [card("d", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_ATTACK", actions: [{ type: "DISCARD", count: 1 }] })] })] });
    expect(bad).toThrow(/DISCARD only works in the recruit phase/);
  });
});

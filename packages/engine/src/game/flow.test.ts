import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import type { Unit } from "../content.js";
import { newPlayer, type PlayerState } from "../shop/economy.js";
import { card, content, effect, fighter } from "../testing.js";
import { buildEnv } from "../testing-world.js";
import type { CombatEvent } from "../types.js";
import { makeEnv } from "./env.js";
import { applyCombatOutcome, combatOptions, prepareCombat, pickDiscover, useGear } from "./session.js";
import { Pool } from "../shop/pool.js";
import { Rng } from "../rng/rng.js";

const u = (key: string): Unit => ({ key, golden: false });
const PRE = { maxAttacksPerCombat: 0 };

/** Fight `me` against a hand-built enemy and write the result back. */
function fight(p: PlayerState, env: ReturnType<typeof buildEnv>, enemy = [fighter("enemy", 1, 1)], seed = 1, extra = {}) {
  const { units, extras } = prepareCombat(p, env);
  const result = simulateCombat(units, enemy, seed, { ...combatOptions(env), a: extras, ...extra });
  applyCombatOutcome(p, result, "A", env);
  return result;
}
const FIVE = ["ranger_red", "ranger_blue", "ranger_yellow", "ranger_green", "ranger_pink"];

describe("prepareCombat", () => {
  it("snapshots the board in order and tags each unit with its slot", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.board = [u("grunt"), u("scout")];
    const { units } = prepareCombat(p, env);
    expect(units.map((x) => [x.cardKey, x.sourceId])).toEqual([
      ["grunt", "board:0"],
      ["scout", "board:1"],
    ]);
  });

  it("Series Bond tiers stack: 2 units give the first bonus, 3 add the second", () => {
    const env = buildEnv();
    const stats = (n: number) => {
      const p = newPlayer();
      p.board = Array.from({ length: n }, (_, i) => u(["w_a", "w_b", "w_c"][i] as string));
      const { units, extras } = prepareCombat(p, env);
      return simulateCombat(units, [fighter("e", 1, 1)], 1, { ...PRE, content: env.content, a: extras }).survivorsA;
    };
    expect(stats(1)[0]).toMatchObject({ atk: 1, hp: 1 }); // no bond
    expect(stats(2)[0]).toMatchObject({ atk: 2, hp: 1 }); // +1 atk
    expect(stats(3)[0]).toMatchObject({ atk: 2, hp: 3 }); // +1 atk and +2 hp
  });

  it("only counts units of the bonded series", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.board = [u("w_a"), u("w_b"), u("grunt")];
    const { units, extras } = prepareCombat(p, env);
    const r = simulateCombat(units, [fighter("e", 1, 1)], 1, { ...PRE, content: env.content, a: extras });
    expect(r.survivorsA.map((s) => s.atk)).toEqual([2, 2, 2]); // grunt keeps its own atk 2, unbuffed
    expect(r.survivorsA[2]).toMatchObject({ cardKey: "grunt", atk: 2 });
  });

  it("passes the player's rule overrides and Giant", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.rules = { rollCallColors: 4, gattaiSize: 2, freeRefreshesPerTurn: 1 };
    p.giant = u("king_giant");
    const { extras } = prepareCombat(p, env);
    expect(extras.rules).toEqual({ rollCallColors: 4, gattaiSize: 2 }); // economy-only rules are not combat rules
    expect(extras.giant).toMatchObject({ cardKey: "king_giant", atk: 8, hp: 8 });
  });
});

describe("applyCombatOutcome", () => {
  it("writes permanent in-combat buffs back onto the unit that earned them", () => {
    const world = content({
      cards: [
        card("grower", {
          effects: [effect({ trigger: "START_OF_COMBAT", actions: [{ type: "BUFF", atk: 2, hp: 1, permanent: true }] })],
        }),
        card("plain"),
      ],
    });
    const env = makeEnv({ content: world, pool: new Pool([]), rng: new Rng(1) });
    const p = newPlayer();
    p.board = [u("plain"), u("grower")];
    fight(p, env);
    expect(p.board[1]).toMatchObject({ bonusAtk: 2, bonusHp: 1 });
    expect(p.board[0]?.bonusAtk).toBeUndefined();
    fight(p, env);
    expect(p.board[1]).toMatchObject({ bonusAtk: 4, bonusHp: 2 }); // stacks across fights
  });
});

describe("Roll Call -> Mecha Gauge -> Kyodai Gattai -> Giant Robo", () => {
  it("runs the whole chain", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.board = FIVE.map(u);

    // Fight 1: Roll Call fires and we win -> +1 (roll call) +1 (win) = 2, below the threshold of 3
    const r1 = fight(p, env);
    expect(r1.rollCall.A).toBe(true);
    expect(r1.winner).toBe("A");
    expect(p.gauges.mecha).toBe(2);
    expect(p.hand).toEqual([]);

    // Fight 2: gauge 4, crossing 3 -> Kyodai Gattai! lands in hand
    fight(p, env);
    expect(p.gauges.mecha).toBe(4);
    expect(p.hand.map((x) => x.key)).toEqual(["kyodai_gattai"]);

    // Fight 3 does not hand out a second one (threshold already crossed)
    fight(p, env);
    expect(p.gauges.mecha).toBe(6);
    expect(p.hand.map((x) => x.key)).toEqual(["kyodai_gattai"]);

    // Use it, pick a Giant, and it joins the Giant Slot
    useGear(p, 0, env);
    expect(p.hand).toEqual([]);
    pickDiscover(p, 0, env);
    expect(p.giant).toBeDefined();

    // With 5 units on the board the Giant waits until our team thins out
    const heavy = simulateCombat(
      ...(() => {
        const { units, extras } = prepareCombat(p, env);
        return [units, [fighter("boss", 9, 60)], 1, { ...combatOptions(env), a: extras }] as const;
      })(),
    );
    const events: CombatEvent[] = heavy.events;
    const entry = events.findIndex((e) => e.type === "GIANT_ENTER");
    const firstDeath = events.findIndex((e) => e.type === "DEATH");
    expect(entry).toBeGreaterThan(firstDeath);
    expect(events.filter((e) => e.type === "GIANT_ENTER")).toHaveLength(1);
  });

  it("a losing Roll Call earns only the first point", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.board = FIVE.map(u);
    const r = fight(p, env, [fighter("boss", 50, 999)]);
    expect(r.rollCall.A).toBe(true);
    expect(r.winner).toBe("B");
    expect(p.gauges.mecha).toBe(1);
  });

  it("no Roll Call, no gauge", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.board = FIVE.slice(0, 4).map(u);
    fight(p, env);
    expect(p.gauges.mecha).toBeUndefined();
  });

  it("Team Spirit Banner lets four colors call the roll", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.board = FIVE.slice(0, 4).map(u);
    expect(fight(p, env).rollCall.A).toBe(false);
    p.rules.rollCallColors = 4; // what acquiring the banner does
    expect(fight(p, env).rollCall.A).toBe(true);
  });

  it("an Extra Ranger completes the team", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.board = [...FIVE.slice(0, 4), "ranger_extra"].map(u);
    expect(fight(p, env).rollCall.A).toBe(true);
  });

  it("Mecha Gauge Core: the Giant comes in with 3 units on the board", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.board = [u("grunt"), u("scout"), u("elder")];
    p.giant = u("king_giant");
    const without = simulateCombat(...(() => {
      const { units, extras } = prepareCombat(p, env);
      return [units, [fighter("e", 1, 1)], 1, { ...combatOptions(env), a: extras, maxAttacksPerCombat: 0 }] as const;
    })());
    expect(without.events.some((e) => e.type === "GIANT_ENTER")).toBe(false);

    p.rules.giantEntryThreshold = 3; // what gauge_core's ON_ACQUIRE sets
    const withCore = simulateCombat(...(() => {
      const { units, extras } = prepareCombat(p, env);
      return [units, [fighter("e", 1, 1)], 1, { ...combatOptions(env), a: extras, maxAttacksPerCombat: 0 }] as const;
    })());
    expect(withCore.events.some((e) => e.type === "GIANT_ENTER")).toBe(true);
  });
});

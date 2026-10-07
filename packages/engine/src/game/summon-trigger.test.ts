import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect } from "../testing.js";
import { runEffect } from "./effects.js";
import { makeEnv } from "./env.js";

const world = content({
  cards: [
    card("cub", { rank: 1, atk: 1, hp: 1, token: true }),
    card("tamer", { rank: 1, atk: 1, hp: 3, effects: [effect({ trigger: "ALLY_SUMMONED", target: { selector: "SUMMONED" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] }),
  ],
});

describe("ALLY_SUMMONED in the recruit phase", () => {
  it("a summon from a player effect (hero, relic) is buffed for good by the units already there", () => {
    const env = makeEnv({ content: world, pool: new Pool([{ key: "tamer", rank: 1 }]), rng: new Rng(1) });
    const p = newPlayer();
    p.board = [{ key: "tamer", golden: false }, { key: "tamer", golden: false }];
    runEffect(effect({ scope: "PLAYER", trigger: "ON_TURN_START", actions: [{ type: "SUMMON", cardKey: "cub" }] }), null, p, env);
    const cub = p.board.find((u) => u.key === "cub");
    expect(cub).toMatchObject({ bonusAtk: 2, bonusHp: 2 });
    expect(p.board.filter((u) => u.key === "tamer").every((u) => u.bonusAtk === undefined)).toBe(true);
  });
});

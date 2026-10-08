import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect } from "../testing.js";
import { makeEnv } from "./env.js";
import { beginTurn, endTurn, useGear } from "./session.js";

// A third copy that arrives some way other than buying or playing still completes the triple.
const world = content({
  cards: [
    card("rider", { rank: 1, atk: 2, hp: 2 }),
    card("rookie", { rank: 1, atk: 1, hp: 1, henshin: { afterTurns: 1, into: "rider" } }),
    card("prize", { rank: 2, atk: 3, hp: 3 }),
    card("capsem", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "TRANSFORM", into: "rider" }] })] }),
    card("caller", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_TURN_START", actions: [{ type: "ADD_TO_HAND", cardKey: "rider" }] })] }),
  ],
});
const env = () => makeEnv({ content: world, pool: new Pool(["rider", "rookie", "prize"].map((key) => ({ key, rank: key === "prize" ? 2 : 1 }))), rng: new Rng(4) });
const u = (key: string) => ({ key, golden: false });
const goldens = (units: { key: string; golden?: boolean }[]) => units.filter((x) => x.golden).map((x) => x.key);

describe("triples from every source", () => {
  it("a Gear that transforms a unit into the third copy merges them", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("rider"), u("rider"), u("rookie")];
    p.hand = [u("capsem")];
    useGear(p, 0, e, 2);
    expect(goldens(p.board)).toEqual(["rider"]);
    expect(p.board).toHaveLength(1);
    expect(p.discovers).toHaveLength(1); // and the reward
  });

  it("a Henshin at the end of the turn that makes the third copy merges them before the fight", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("rider"), u("rookie"), u("rider")];
    endTurn(p, e);
    expect(goldens(p.board)).toEqual(["rider"]);
    expect(p.discovers).toHaveLength(1);
  });

  it("a card that arrives at the start of the turn merges with two on the board", () => {
    const e = env();
    const p = newPlayer();
    p.board = [u("rider"), u("rider"), u("caller")];
    beginTurn(p, 2, e);
    expect(goldens([...p.board, ...p.hand])).toEqual(["rider"]);
  });
});

import { describe, expect, it } from "vitest";
import { assignHero } from "../game/session.js";
import { Rng } from "../rng/rng.js";
import { newPlayer, type PlayerState } from "../shop/economy.js";
import { buildEnv } from "../testing-world.js";
import { runBot } from "./bot.js";

const u = (key: string, golden = false) => ({ key, golden });
const setup = (seed = 1) => ({ env: buildEnv(undefined, seed), p: newPlayer() });
const keys = (p: PlayerState) => p.board.map((x) => x.key);

describe("runBot", () => {
  it("buys with its energy and puts the unit on the board", () => {
    const { env, p } = setup();
    p.energy = 3;
    p.shop = ["grunt"];
    runBot(p, 1, env);
    expect(keys(p)).toEqual(["grunt"]);
    expect(p.energy).toBe(0);
    expect(p.shop).toEqual([]);
  });

  it("does nothing it cannot afford", () => {
    const { env, p } = setup();
    p.energy = 2;
    p.shop = ["grunt"];
    runBot(p, 1, env);
    expect(p.board).toEqual([]);
    expect(p.energy).toBe(2);
  });

  it("prefers a card it already owns (progress toward a triple)", () => {
    const { env, p } = setup();
    p.energy = 3;
    p.board = [u("grunt")];
    p.shop = ["scout", "grunt", "elder"];
    runBot(p, 1, env);
    expect(keys(p)).toEqual(["grunt", "grunt"]);
  });

  it("pairs beat rank on their own (no faction involved)", () => {
    const { env, p } = setup();
    p.energy = 3;
    p.board = [u("scout")]; // rank 2, no faction
    p.shop = ["elder", "scout"]; // elder is rank 3, but a second scout moves toward a triple
    runBot(p, 1, env);
    expect(keys(p)).toEqual(["scout", "scout"]);
  });

  it("with nothing else to go on it takes the higher rank", () => {
    const { env, p } = setup();
    p.energy = 3;
    p.shop = ["grunt", "scout"]; // different factions, no pairs: rank 2 wins
    runBot(p, 1, env);
    expect(keys(p)).toEqual(["scout"]);
  });

  it("faction beats a slightly higher rank", () => {
    const { env, p } = setup();
    p.energy = 3;
    p.board = [u("ranger_red"), u("ranger_blue")];
    p.shop = ["elder", "ranger_green"]; // elder rank 3 with no faction vs rank-2 sentai
    runBot(p, 1, env);
    expect(keys(p)).toEqual(["ranger_red", "ranger_blue", "ranger_green"]);
  });

  it("completes a triple when it can", () => {
    const { env, p } = setup();
    p.energy = 3;
    p.board = [u("grunt"), u("grunt")];
    p.shop = ["grunt"];
    runBot(p, 1, env);
    expect(p.board).toEqual([{ key: "grunt", golden: true }]);
  });

  it("leans toward its main faction", () => {
    const { env, p } = setup();
    p.energy = 3;
    p.board = [u("ranger_red"), u("ranger_blue")];
    p.shop = ["grunt", "ranger_green"]; // equal rank bonus: faction decides (rank 1 vs 2 here too)
    runBot(p, 1, env);
    expect(keys(p)).toContain("ranger_green");
  });

  it("buys several cards when it has the energy", () => {
    const { env, p } = setup();
    p.energy = 9;
    p.shop = ["grunt", "scout", "elder"];
    runBot(p, 1, env);
    expect(p.board).toHaveLength(3);
  });

  describe("rank schedule (about one rank every two turns)", () => {
    it("upgrades when behind schedule and affordable", () => {
      const { env, p } = setup();
      p.energy = 10;
      p.shop = [];
      runBot(p, 4, env); // target rank 3
      expect(p.rank).toBe(2); // one upgrade per recruit phase
      expect(p.energy).toBeLessThanOrEqual(5);
    });

    it("does not upgrade when it is already on schedule", () => {
      const { env, p } = setup();
      p.energy = 10;
      p.shop = [];
      runBot(p, 1, env); // target rank 1
      expect(p.rank).toBe(1);
    });

    it("does not upgrade when it cannot pay", () => {
      const { env, p } = setup();
      p.energy = 4;
      p.shop = [];
      runBot(p, 6, env);
      expect(p.rank).toBe(1); // an upgrade costs 5; it spends the 4 on shopping instead
    });
  });

  it("uses Gear and picks a Giant", () => {
    const { env, p } = setup();
    p.hand = [u("kyodai_gattai")];
    p.board = [u("w_a")];
    runBot(p, 5, env);
    expect(p.hand.find((x) => x.key === "kyodai_gattai")).toBeUndefined();
    expect(p.giant).toBeDefined();
    expect(p.discovers).toEqual([]);
  });

  it("resolves a pending Discover", () => {
    const { env, p } = setup();
    p.discovers = [{ options: ["scout", "elder"], destination: "HAND" }];
    env.pool.take("scout");
    env.pool.take("elder");
    runBot(p, 1, env);
    expect(p.discovers).toEqual([]);
    expect([...p.board, ...p.hand].some((x) => x.key === "scout")).toBe(true);
  });

  describe("relics", () => {
    it("takes an affordable relic that fits its faction", () => {
      const { env, p } = setup();
      p.energy = 5;
      p.board = [u("cafe")]; // faction: ally
      p.relicOffer = { tier: "LESSER", options: ["bracelet", "coupon", "rider_pass"] };
      p.shop = [];
      runBot(p, 5, env);
      expect(p.relics).toEqual(["coupon"]);
    });

    it("falls back to the free relic when it cannot afford what it wants", () => {
      const { env, p } = setup();
      p.energy = 0;
      p.board = [u("cafe")];
      p.relicOffer = { tier: "LESSER", options: ["coupon", "rider_pass"] };
      p.shop = [];
      runBot(p, 5, env);
      expect(p.relics).toEqual(["rider_pass"]);
      expect(p.relicOffer).toBeUndefined();
    });
  });

  it("drops a relic offer it cannot pay for instead of leaving it open", () => {
    const { env, p } = setup();
    p.energy = 0;
    p.relicOffer = { tier: "LESSER", options: ["bracelet", "coupon"] }; // costs 3 and 1, nothing free
    p.shop = [];
    runBot(p, 5, env);
    expect(p.relics).toEqual([]);
    expect(p.relicOffer).toBeUndefined();
  });

  it("does not sell units that are as strong as its tavern rank", () => {
    const { env, p } = setup();
    p.rank = 2;
    p.energy = 3;
    // 7 different rank-2 units on a rank-2 board (distinct, so no triple can form)
    const board = ["ranger_red", "ranger_blue", "ranger_yellow", "ranger_green", "ranger_pink", "scout", "shield_bearer"];
    p.board = board.map((k) => u(k));
    p.shop = ["grunt", "drone"]; // one stays in the shop after the purchase, so the sell branch is reached
    const before = board.map((k) => env.pool.count(k));
    runBot(p, 1, env);
    expect(keys(p)).toEqual(board);
    expect(board.map((k) => env.pool.count(k))).toEqual(before); // nothing went back to the pool
  });

  it("uses an active hero power it can afford", () => {
    const { env, p } = setup();
    assignHero(p, "red_leader", env); // 2 energy: leftmost friendly +2/+2
    p.energy = 2;
    p.board = [u("grunt")];
    p.shop = [];
    runBot(p, 1, env);
    expect(p.board[0]).toMatchObject({ bonusAtk: 2, bonusHp: 2 });
    expect(p.energy).toBe(0);
  });

  it("refreshes when it has energy left over", () => {
    const { env, p } = setup();
    p.energy = 8;
    p.shop = ["grunt"];
    const before = p.energy;
    runBot(p, 1, env);
    expect(p.energy).toBeLessThan(before - 3); // bought, then paid to refresh/buy more
  });

  it("sells a weak unit to make room when the board is full", () => {
    const { env, p } = setup();
    p.rank = 3;
    p.energy = 6;
    // 7 different rank-1 units (distinct, so no triple frees a slot by itself)
    const weak = ["grunt", "drone", "rookie", "cafe", "w_a", "w_b", "w_c"];
    p.board = weak.map((k) => u(k));
    p.shop = ["elder", "scout"]; // buying one leaves a card in the shop, so the bot considers making room
    const poolBefore = weak.reduce((n, k) => n + env.pool.count(k), 0);
    runBot(p, 1, env);
    expect(p.board.some((x) => x.key === "elder")).toBe(true);
    expect(p.board.length).toBeLessThanOrEqual(7);
    expect(weak.reduce((n, k) => n + env.pool.count(k), 0)).toBeGreaterThan(poolBefore); // a weak unit was sold
  });

  it("copes with odd states without throwing (fuzz)", () => {
    const rng = new Rng(99);
    const unitKeys = ["grunt", "scout", "elder", "cafe", "rookie", "drone", "ranger_red", "shield_bearer", "kyodai_gattai"];
    for (let i = 0; i < 400; i++) {
      const { env, p } = setup(i + 1);
      p.energy = rng.int(11);
      p.rank = 1 + rng.int(6);
      p.board = Array.from({ length: rng.int(8) }, () => u(rng.pick(unitKeys.slice(0, 8)), rng.int(5) === 0));
      p.hand = Array.from({ length: rng.int(11) }, () => u(rng.pick(unitKeys), rng.int(6) === 0));
      p.shop = Array.from({ length: rng.int(7) }, () => rng.pick(["grunt", "scout", "elder", "cafe"]));
      if (rng.int(3) === 0) assignHero(p, rng.pick(["red_leader", "prof_belt", "time_traveler", "blank"]), env);
      if (rng.int(4) === 0) p.relicOffer = { tier: "LESSER", options: ["bracelet", "coupon", "rider_pass"] };
      if (rng.int(4) === 0) p.discovers = [{ options: ["scout"], destination: "HAND" }];

      expect(() => runBot(p, 1 + rng.int(12), env)).not.toThrow();
      expect(p.energy).toBeGreaterThanOrEqual(0);
      expect(p.board.length).toBeLessThanOrEqual(7);
      expect(p.hand.length).toBeLessThanOrEqual(10);
    }
  });

  it("is deterministic for a given state and seed", () => {
    const run = () => {
      const { env, p } = setup(5);
      p.energy = 9;
      p.shop = ["grunt", "scout", "elder", "cafe"];
      runBot(p, 3, env);
      return JSON.stringify(p);
    };
    expect(run()).toBe(run());
  });
});

describe("runBot board upgrades pick the right units", () => {
  const MIXED = ["grunt", "scout", "ranger_red", "ranger_blue", "ranger_yellow", "ranger_green", "ranger_pink"]; // ranks 1,2,2,2,2,2,2

  it("sells the weakest board unit, not a stronger one", () => {
    const { env, p } = setup();
    p.rank = 3;
    p.energy = 3;
    p.board = MIXED.map((k) => u(k));
    p.shop = ["elder", "drone"];
    runBot(p, 1, env);
    expect(keys(p)).not.toContain("grunt"); // the only rank-1 unit went
    expect(keys(p)).toContain("elder");
    for (const k of MIXED.slice(1)) expect(keys(p)).toContain(k); // every rank-2 unit stayed
  });

  it("deploys the best card waiting in hand, not the worst", () => {
    const { env, p } = setup();
    p.rank = 3;
    p.energy = 0;
    p.board = MIXED.map((k) => u(k));
    p.hand = [u("drone"), u("elder"), u("w_a")]; // ranks 1, 3, 1
    p.shop = [];
    runBot(p, 1, env);
    expect(keys(p)).toContain("elder");
    expect(keys(p)).not.toContain("drone");
    expect(keys(p)).not.toContain("w_a");
  });

  it("never plays gear or Giants as if they were board units", () => {
    const { env, p } = setup();
    p.rank = 3;
    p.energy = 0;
    p.board = MIXED.map((k) => u(k));
    p.hand = [u("king_giant"), u("elder")]; // a rank-6 Giant card in hand must not be deployed
    p.shop = [];
    runBot(p, 1, env);
    expect(keys(p)).not.toContain("king_giant");
    expect(keys(p)).toContain("elder");
  });
});

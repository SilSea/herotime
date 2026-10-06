import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config.js";
import { Rng } from "../rng/rng.js";
import {
  buy,
  energyForTurn,
  newPlayer,
  play,
  refresh,
  RuleError,
  sell,
  shopSizeFor,
  startTurn,
  toggleFreeze,
  upgrade,
  upgradeCost,
  type PlayerState,
} from "./economy.js";
import { Pool } from "./pool.js";

const cards = [
  ...Array.from({ length: 6 }, (_, i) => ({ key: `r1_${i}`, rank: 1 })),
  ...Array.from({ length: 6 }, (_, i) => ({ key: `r2_${i}`, rank: 2 })),
];

let pool: Pool;
let rng: Rng;
let p: PlayerState;

beforeEach(() => {
  pool = new Pool(cards, { 1: 16, 2: 15 });
  rng = new Rng(11);
  p = newPlayer();
});

const total = (): number => cards.reduce((n, c) => n + pool.count(c.key), 0);
const held = (s: PlayerState): number => s.shop.length + s.hand.length + s.board.length;

describe("energy & sizes", () => {
  it("energy is 3 on turn 1, +1 per turn, capped at 10", () => {
    expect(energyForTurn(1)).toBe(3);
    expect(energyForTurn(2)).toBe(4);
    expect(energyForTurn(8)).toBe(10);
    expect(energyForTurn(20)).toBe(10);
  });

  it("shop size follows rank", () => {
    expect([1, 2, 3, 4, 5, 6].map((r) => shopSizeFor(r))).toEqual([3, 4, 4, 5, 5, 6]);
  });
});

describe("startTurn", () => {
  it("fills energy and rolls a shop of the right size", () => {
    startTurn(p, 1, pool, rng);
    expect(p.energy).toBe(3);
    expect(p.shop).toHaveLength(3);
  });

  it("keeps a frozen shop and clears the freeze", () => {
    startTurn(p, 1, pool, rng);
    const before = [...p.shop];
    toggleFreeze(p);
    startTurn(p, 2, pool, rng);
    expect(p.shop).toEqual(before);
    expect(p.frozen).toBe(false);
  });

  it("returns the old shop to the pool when it re-rolls", () => {
    startTurn(p, 1, pool, rng);
    startTurn(p, 2, pool, rng);
    expect(total() + held(p)).toBe(6 * 16 + 6 * 15);
  });
});

describe("refresh", () => {
  it("costs 1 energy and re-rolls", () => {
    startTurn(p, 1, pool, rng);
    refresh(p, pool, rng);
    expect(p.energy).toBe(2);
    expect(p.shop).toHaveLength(3);
  });

  it("fails without energy and changes nothing", () => {
    startTurn(p, 1, pool, rng);
    p.energy = 0;
    const shop = [...p.shop];
    expect(() => refresh(p, pool, rng)).toThrow(RuleError);
    expect(p.shop).toEqual(shop);
    expect(p.energy).toBe(0);
  });

  it("conserves total cards in play + pool", () => {
    startTurn(p, 1, pool, rng);
    p.energy = 10;
    for (let i = 0; i < 8; i++) refresh(p, pool, rng);
    expect(total() + held(p)).toBe(6 * 16 + 6 * 15);
  });
});

describe("buy / play / sell", () => {
  beforeEach(() => startTurn(p, 1, pool, rng));

  it("buy moves a card from shop to hand for 3 energy", () => {
    const key = p.shop[0] as string;
    expect(buy(p, 0)).toBe(key);
    expect(p.energy).toBe(0);
    expect(p.shop).toHaveLength(2);
    expect(p.hand).toEqual([key]);
  });

  it("buy fails when poor, with a bad slot, or with a full hand — without spending", () => {
    p.energy = 2;
    expect(() => buy(p, 0)).toThrow(/not enough energy/);
    p.energy = 9;
    expect(() => buy(p, 99)).toThrow(/no shop slot/);
    p.hand = Array.from({ length: DEFAULT_CONFIG.handSize }, () => "x");
    expect(() => buy(p, 0)).toThrow(/hand is full/);
    expect(p.energy).toBe(9);
  });

  it("play places a card at a position", () => {
    p.hand = ["a", "b"];
    p.board = ["x", "y"];
    play(p, 1, 1);
    expect(p.board).toEqual(["x", "b", "y"]);
    expect(p.hand).toEqual(["a"]);
  });

  it("play rejects a full board and bad positions", () => {
    p.hand = ["a"];
    p.board = Array.from({ length: 7 }, () => "x");
    expect(() => play(p, 0, 0)).toThrow(/board is full/);
    p.board = ["x"];
    expect(() => play(p, 0, 5)).toThrow(/invalid board position/);
    expect(() => play(p, 3, 0)).toThrow(/no hand slot/);
  });

  it("sell refunds 1 energy (capped at max) and returns the card to the pool", () => {
    const key = p.shop[0] as string;
    buy(p, 0);
    play(p, 0, 0);
    const before = pool.count(key);
    sell(p, "board", 0, pool);
    expect(p.energy).toBe(1);
    expect(pool.count(key)).toBe(before + 1);

    p.energy = 10;
    p.hand = ["r1_0"];
    sell(p, "hand", 0, pool);
    expect(p.energy).toBe(10);
  });

  it("sell rejects an empty slot", () => {
    expect(() => sell(p, "board", 0, pool)).toThrow(/no board slot/);
  });
});

describe("upgrade", () => {
  it("costs 5 from rank 1", () => {
    p.energy = 10;
    expect(upgradeCost(p)).toBe(5);
    upgrade(p);
    expect(p.rank).toBe(2);
    expect(p.energy).toBe(5);
  });

  it("resets the waiting discount after ranking up", () => {
    p.energy = 10;
    p.upgradeDiscount = 3;
    expect(upgradeCost(p)).toBe(2);
    upgrade(p);
    expect(p.energy).toBe(8);
    expect(upgradeCost(p)).toBe(7); // full rank-2 price, not 7 - 3
  });

  it("gets 1 cheaper for every turn waited", () => {
    startTurn(p, 1, pool, rng);
    startTurn(p, 2, pool, rng);
    startTurn(p, 3, pool, rng);
    expect(upgradeCost(p)).toBe(3); // 5 - 2 turns waited
  });

  it("never goes below 0", () => {
    p.upgradeDiscount = 50;
    expect(upgradeCost(p)).toBe(0);
  });

  it("fails when poor or at max rank", () => {
    p.energy = 1;
    expect(() => upgrade(p)).toThrow(/not enough energy/);
    expect(p.rank).toBe(1);
    p.rank = DEFAULT_CONFIG.maxRank;
    expect(upgradeCost(p)).toBeUndefined();
    expect(() => upgrade(p)).toThrow(/max rank/);
  });

  it("a higher rank widens the shop and unlocks higher-rank cards", () => {
    p.energy = 10;
    upgrade(p);
    startTurn(p, 2, pool, rng);
    expect(p.shop).toHaveLength(4);
  });
});

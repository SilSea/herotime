import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config.js";
import { Rng } from "../rng/rng.js";
import {
  buy,
  copiesOf,
  energyForTurn,
  newPlayer,
  play,
  refresh,
  reorder,
  RuleError,
  sell,
  shopSizeFor,
  startTurn,
  toggleFreeze,
  upgrade,
  upgradeCost,
  type PlayerState,
  type Unit,
} from "./economy.js";
import { Pool } from "./pool.js";

const cards = [
  ...Array.from({ length: 6 }, (_, i) => ({ key: `r1_${i}`, rank: 1 })),
  ...Array.from({ length: 6 }, (_, i) => ({ key: `r2_${i}`, rank: 2 })),
];

const u = (key: string, golden = false): Unit => ({ key, golden });

let pool: Pool;
let rng: Rng;
let p: PlayerState;

beforeEach(() => {
  pool = new Pool(cards, { 1: 16, 2: 15 });
  rng = new Rng(11);
  p = newPlayer();
});

const total = (): number => cards.reduce((n, c) => n + pool.count(c.key), 0);
const held = (s: PlayerState): number =>
  s.shop.length +
  [...s.hand, ...s.board].reduce((n, unit) => n + copiesOf(unit), 0) +
  s.discovers.reduce((n, offer) => n + offer.options.length, 0);

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
    expect(p.hand).toEqual([u(key)]);
  });

  it("buy fails when poor, with a bad slot, or with a full hand — without spending", () => {
    p.energy = 2;
    expect(() => buy(p, 0)).toThrow(/not enough energy/);
    p.energy = 9;
    expect(() => buy(p, 99)).toThrow(/no shop slot/);
    p.hand = Array.from({ length: DEFAULT_CONFIG.handSize }, () => u("x"));
    expect(() => buy(p, 0)).toThrow(/hand is full/);
    expect(p.energy).toBe(9);
  });

  it("play places a card at a position", () => {
    p.hand = [u("a"), u("b")];
    p.board = [u("x"), u("y")];
    play(p, 1, 1);
    expect(p.board).toEqual([u("x"), u("b"), u("y")]);
    expect(p.hand).toEqual([u("a")]);
  });

  it("play keeps a golden unit golden", () => {
    p.hand = [u("a", true)];
    play(p, 0, 0);
    expect(p.board).toEqual([u("a", true)]);
  });

  it("play rejects a full board and bad positions", () => {
    p.hand = [u("a")];
    p.board = Array.from({ length: 7 }, () => u("x"));
    expect(() => play(p, 0, 0)).toThrow(/board is full/);
    p.board = [u("x")];
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
    p.hand = [u("r1_0")];
    sell(p, "hand", 0, pool);
    expect(p.energy).toBe(10);
  });

  it("selling a Golden unit returns all 3 copies to the pool", () => {
    p.hand = [u("r1_0", true)];
    const before = pool.count("r1_0");
    sell(p, "hand", 0, pool);
    expect(pool.count("r1_0")).toBe(before + 3);
  });

  it("sell rejects an empty slot", () => {
    expect(() => sell(p, "board", 0, pool)).toThrow(/no board slot/);
  });
});

describe("reorder", () => {
  const names = (s: PlayerState) => s.board.map((x) => x.key);
  beforeEach(() => {
    p.board = [u("a"), u("b"), u("c"), u("d")];
  });

  it("moves a unit right and left, shifting the others", () => {
    reorder(p, 0, 2);
    expect(names(p)).toEqual(["b", "c", "a", "d"]);
    reorder(p, 3, 0);
    expect(names(p)).toEqual(["d", "b", "c", "a"]);
  });

  it("moving to the same slot changes nothing and never loses a unit", () => {
    reorder(p, 1, 1);
    expect(names(p)).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps the unit itself (golden, bonuses) intact", () => {
    p.board[0] = { key: "a", golden: true, bonusAtk: 2 };
    reorder(p, 0, 3);
    expect(p.board[3]).toEqual({ key: "a", golden: true, bonusAtk: 2 });
  });

  it("rejects out-of-range or fractional slots without changing the board", () => {
    for (const [from, to] of [[-1, 0], [4, 0], [0, 4], [0, -1], [0.5, 1], [1, 1.5]] as const) {
      expect(() => reorder(p, from, to)).toThrow(RuleError);
    }
    expect(names(p)).toEqual(["a", "b", "c", "d"]);
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

describe("per-player rules (MODIFY_RULE overrides)", () => {
  it("buyCost", () => {
    startTurn(p, 1, pool, rng);
    p.rules.buyCost = 1;
    p.energy = 3;
    buy(p, 0);
    expect(p.energy).toBe(2);
  });

  it("sellValue and maxEnergy cap the refund", () => {
    p.hand = [u("r1_0")];
    p.energy = 5;
    p.rules.sellValue = 3;
    sell(p, "hand", 0, pool);
    expect(p.energy).toBe(8);

    p.hand = [u("r1_1")];
    p.rules.maxEnergy = 9;
    sell(p, "hand", 0, pool);
    expect(p.energy).toBe(9); // 8 + 3 would be 11, capped by the player's own max
  });

  it("refreshCost", () => {
    startTurn(p, 1, pool, rng);
    p.rules.refreshCost = 2;
    refresh(p, pool, rng);
    expect(p.energy).toBe(1);
  });

  it("free refreshes are spent before paying, and refill each turn", () => {
    p.rules.freeRefreshesPerTurn = 2;
    startTurn(p, 1, pool, rng);
    expect(p.freeRefreshes).toBe(2);
    refresh(p, pool, rng);
    refresh(p, pool, rng);
    expect(p.energy).toBe(3);
    refresh(p, pool, rng);
    expect(p.energy).toBe(2);
    startTurn(p, 2, pool, rng);
    expect(p.freeRefreshes).toBe(2);
  });

  it("boardSize and handSize", () => {
    p.rules.boardSize = 1;
    p.hand = [u("a"), u("b")];
    play(p, 0, 0);
    expect(() => play(p, 0, 0)).toThrow(/board is full/);

    p.rules.handSize = 1;
    startTurn(p, 1, pool, rng);
    p.energy = 9;
    expect(() => buy(p, 0)).toThrow(/hand is full/);
  });

  it("startEnergy, energyPerTurn and maxEnergy shape the turn refill", () => {
    p.rules.startEnergy = 5;
    p.rules.energyPerTurn = 2;
    p.rules.maxEnergy = 8;
    startTurn(p, 1, pool, rng);
    expect(p.energy).toBe(5);
    startTurn(p, 3, pool, rng);
    expect(p.energy).toBe(8); // 5 + 2*2 = 9, capped at 8
  });

  it("maxRank caps upgrades for this player only", () => {
    p.rules.maxRank = 2;
    p.energy = 10;
    upgrade(p);
    expect(p.rank).toBe(2);
    expect(() => upgrade(p)).toThrow(/max rank/);
    const other = newPlayer();
    other.energy = 10;
    upgrade(other);
    expect(other.rank).toBe(2);
    other.energy = 10;
    expect(() => upgrade(other)).not.toThrow();
  });

  it("rules belong to one player", () => {
    const other = newPlayer();
    p.rules.buyCost = 0;
    startTurn(other, 1, pool, rng);
    expect(() => buy(other, 0)).not.toThrow();
    expect(other.energy).toBe(0); // paid the normal 3
  });

  it("selling an unpooled card (a token) is allowed and the pool is unchanged", () => {
    p.hand = [u("token_not_in_pool")];
    const before = cards.reduce((n, c) => n + pool.count(c.key), 0);
    sell(p, "hand", 0, pool);
    expect(cards.reduce((n, c) => n + pool.count(c.key), 0)).toBe(before);
    expect(p.energy).toBe(1);
  });
});

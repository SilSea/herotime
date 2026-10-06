import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config.js";
import { Rng } from "../rng/rng.js";
import { copiesOf, newPlayer, RuleError, type PlayerState, type Unit } from "./economy.js";
import { Pool } from "./pool.js";
import { chooseDiscover, resolveTriples } from "./triple.js";

const u = (key: string, golden = false): Unit => ({ key, golden });

// rank 1: a, b   rank 2: c1..c4 (enough distinct options for a Discover)
const cards = [
  { key: "a", rank: 1 },
  { key: "b", rank: 1 },
  { key: "c1", rank: 2 },
  { key: "c2", rank: 2 },
  { key: "c3", rank: 2 },
  { key: "c4", rank: 2 },
];

let pool: Pool;
let rng: Rng;
let p: PlayerState;

beforeEach(() => {
  pool = new Pool(cards, { 1: 16, 2: 15 });
  rng = new Rng(21);
  p = newPlayer();
});

describe("resolveTriples", () => {
  it("does nothing with fewer than 3 copies", () => {
    p.hand = [u("a"), u("a"), u("b")];
    expect(resolveTriples(p, pool, rng)).toEqual([]);
    expect(p.hand).toHaveLength(3);
    expect(p.discovers).toEqual([]);
  });

  it("merges 3 copies in hand into one golden", () => {
    p.hand = [u("a"), u("b"), u("a"), u("a")];
    const res = resolveTriples(p, pool, rng);
    expect(res).toHaveLength(1);
    expect(res[0]?.key).toBe("a");
    expect(p.hand).toEqual([u("a", true), u("b")]);
  });

  it("counts copies across board and hand, and the golden takes the first copy's slot", () => {
    p.board = [u("b"), u("a")];
    p.hand = [u("a"), u("a")];
    resolveTriples(p, pool, rng);
    expect(p.board).toEqual([u("b"), u("a", true)]);
    expect(p.hand).toEqual([]);
  });

  it("works when the hand is full (no extra space needed)", () => {
    // 7 distinct fillers so they cannot form a triple themselves
    p.hand = [u("a"), u("a"), u("a"), ...Array.from({ length: 7 }, (_, i) => u(`filler${i}`))];
    expect(p.hand).toHaveLength(DEFAULT_CONFIG.handSize);
    resolveTriples(p, pool, rng);
    expect(p.hand).toHaveLength(DEFAULT_CONFIG.handSize - 2);
  });

  it("ignores golden units when counting", () => {
    p.hand = [u("a", true), u("a"), u("a")];
    expect(resolveTriples(p, pool, rng)).toEqual([]);
  });

  it("resolves two separate triples (6 copies) one after another", () => {
    p.hand = Array.from({ length: 6 }, () => u("a"));
    const res = resolveTriples(p, pool, rng);
    expect(res).toHaveLength(2);
    expect(p.hand).toEqual([u("a", true), u("a", true)]);
    expect(p.discovers).toHaveLength(2);
  });

  it("a merge does not cascade (golden never re-merges)", () => {
    p.hand = [u("a"), u("a"), u("a"), u("a", true), u("a", true)];
    resolveTriples(p, pool, rng);
    expect(p.hand.filter((x) => x.golden)).toHaveLength(3);
    expect(resolveTriples(p, pool, rng)).toEqual([]);
  });

  it("queues a Discover of 3 distinct cards at player rank + 1", () => {
    p.rank = 1;
    p.hand = [u("a"), u("a"), u("a")];
    const [res] = resolveTriples(p, pool, rng);
    expect(res?.offer).toHaveLength(3);
    expect(new Set(res?.offer).size).toBe(3);
    for (const k of res?.offer ?? []) expect(pool.rankOf(k)).toBe(2);
    expect(p.discovers).toEqual([res?.offer]);
  });

  it("caps the Discover rank at the max rank", () => {
    const high = new Pool(
      [
        { key: "x", rank: 6 },
        { key: "y", rank: 6 },
        { key: "z", rank: 6 },
        { key: "low", rank: 1 },
      ],
      { 1: 16, 6: 7 },
    );
    p.rank = DEFAULT_CONFIG.maxRank;
    p.hand = [u("low"), u("low"), u("low")];
    const [res] = resolveTriples(p, high, rng);
    for (const k of res?.offer ?? []) expect(high.rankOf(k)).toBe(6);
  });

  it("skips the Discover when the pool has nothing of that rank", () => {
    const tiny = new Pool([{ key: "a", rank: 1 }], { 1: 16 });
    p.hand = [u("a"), u("a"), u("a")];
    const [res] = resolveTriples(p, tiny, rng);
    expect(res?.offer).toEqual([]);
    expect(p.discovers).toEqual([]);
    expect(p.hand).toEqual([u("a", true)]);
  });

  it("is deterministic per seed", () => {
    const run = () => {
      const pl = newPlayer();
      pl.hand = [u("a"), u("a"), u("a")];
      return resolveTriples(pl, new Pool(cards, { 1: 16, 2: 15 }), new Rng(5));
    };
    expect(run()).toEqual(run());
  });
});

describe("chooseDiscover", () => {
  const withOffer = () => {
    p.hand = [u("a"), u("a"), u("a")];
    resolveTriples(p, pool, rng);
  };

  it("adds the pick to hand and returns the other options to the pool", () => {
    withOffer();
    const offer = [...(p.discovers[0] as string[])];
    const before = offer.map((k) => pool.count(k));
    const picked = chooseDiscover(p, 1, pool);
    expect(picked).toBe(offer[1]);
    expect(p.hand).toContainEqual(u(offer[1] as string));
    expect(p.discovers).toEqual([]);
    expect(pool.count(offer[0] as string)).toBe((before[0] as number) + 1);
    expect(pool.count(offer[2] as string)).toBe((before[2] as number) + 1);
    expect(pool.count(offer[1] as string)).toBe(before[1]); // the pick stays out
  });

  it("answers the oldest offer first", () => {
    p.hand = Array.from({ length: 6 }, () => u("a"));
    resolveTriples(p, pool, rng);
    const first = (p.discovers[0] as string[])[0];
    expect(chooseDiscover(p, 0, pool)).toBe(first);
    expect(p.discovers).toHaveLength(1);
  });

  it("throws and changes nothing for no offer, a bad index, or a full hand", () => {
    expect(() => chooseDiscover(p, 0, pool)).toThrow(RuleError);
    withOffer();
    expect(() => chooseDiscover(p, 9, pool)).toThrow(/no discover option/);
    p.hand = Array.from({ length: DEFAULT_CONFIG.handSize }, () => u("b"));
    expect(() => chooseDiscover(p, 0, pool)).toThrow(/hand is full/);
    expect(p.discovers).toHaveLength(1);
  });
});

describe("pool conservation", () => {
  it("a triple + discover + choose never creates or loses cards", () => {
    // rank 1 holds only 'a', so drawing at rank 1 always yields 'a'
    const world = new Pool(
      [{ key: "a", rank: 1 }, ...cards.filter((c) => c.rank === 2)],
      { 1: 16, 2: 15 },
    );
    const total = () => ["a", "c1", "c2", "c3", "c4"].reduce((n, k) => n + world.count(k), 0);
    const start = total();

    const bought = new Rng(1);
    for (let i = 0; i < 3; i++) p.hand.push(u(world.draw(bought, 1, 1) as string));
    expect(p.hand.map((x) => x.key)).toEqual(["a", "a", "a"]);

    resolveTriples(p, world, rng);
    chooseDiscover(p, 0, world);

    const inPlay = [...p.hand, ...p.board].reduce((n, x) => n + copiesOf(x), 0);
    expect(world.count("a") + inPlay + ["c1", "c2", "c3", "c4"].reduce((n, k) => n + world.count(k), 0)).toBe(start);
  });
});

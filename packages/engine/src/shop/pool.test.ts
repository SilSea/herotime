import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { Pool } from "./pool.js";

const cards = [
  { key: "r1a", rank: 1 },
  { key: "r1b", rank: 1 },
  { key: "r3a", rank: 3 },
];

describe("Pool", () => {
  it("starts each card with the configured copies for its rank", () => {
    const pool = new Pool(cards, { 1: 16, 3: 13 });
    expect(pool.count("r1a")).toBe(16);
    expect(pool.count("r3a")).toBe(13);
  });

  it("rejects duplicate keys and unconfigured ranks", () => {
    expect(() => new Pool([...cards, { key: "r1a", rank: 1 }], { 1: 1, 3: 1 })).toThrow(/duplicate/);
    expect(() => new Pool([{ key: "x", rank: 9 }], { 1: 1 })).toThrow(/rank 9/);
  });

  it("draw only returns cards up to maxRank", () => {
    const pool = new Pool(cards, { 1: 5, 3: 5 });
    const rng = new Rng(1);
    for (let i = 0; i < 10; i++) {
      expect(pool.draw(rng, 1)).not.toBe("r3a");
    }
  });

  it("draw honours minRank (exact-rank draws for Discover)", () => {
    const pool = new Pool(cards, { 1: 5, 3: 5 });
    const rng = new Rng(2);
    for (let i = 0; i < 5; i++) {
      expect(pool.draw(rng, 3, 3)).toBe("r3a");
    }
    expect(pool.draw(rng, 3, 3)).toBeUndefined(); // all 5 copies drawn
    expect(pool.draw(rng, 2, 2)).toBeUndefined(); // no rank-2 cards exist
  });

  it("draw decrements the count", () => {
    const pool = new Pool([{ key: "only", rank: 1 }], { 1: 2 });
    const rng = new Rng(1);
    expect(pool.draw(rng, 1)).toBe("only");
    expect(pool.count("only")).toBe(1);
  });

  it("returns undefined once nothing eligible is left", () => {
    const pool = new Pool([{ key: "only", rank: 1 }], { 1: 1 });
    const rng = new Rng(1);
    pool.draw(rng, 1);
    expect(pool.draw(rng, 1)).toBeUndefined();
  });

  it("never hands out more copies than exist", () => {
    const pool = new Pool(cards, { 1: 2, 3: 1 });
    const rng = new Rng(5);
    const drawn: string[] = [];
    for (let i = 0; i < 20; i++) {
      const k = pool.draw(rng, 3);
      if (k) drawn.push(k);
    }
    expect(drawn).toHaveLength(2 + 2 + 1);
    expect(drawn.filter((k) => k === "r3a")).toHaveLength(1);
  });

  it("is weighted by copies remaining", () => {
    const pool = new Pool(
      [
        { key: "common", rank: 1 },
        { key: "scarce", rank: 3 },
      ],
      { 1: 90, 3: 10 },
    );
    const rng = new Rng(123);
    const counts: Record<string, number> = { common: 0, scarce: 0 };
    for (let i = 0; i < 50; i++) {
      const k = pool.draw(rng, 3) as string;
      counts[k] = (counts[k] ?? 0) + 1;
      pool.give(k); // keep weights stable
    }
    expect(counts.common).toBeGreaterThan(counts.scarce as number);
  });

  it("give returns copies and validates the key", () => {
    const pool = new Pool([{ key: "only", rank: 1 }], { 1: 1 });
    pool.draw(new Rng(1), 1);
    pool.give("only");
    expect(pool.count("only")).toBe(1);
    expect(() => pool.give("ghost")).toThrow(/unknown/);
  });

  it("is deterministic for the same seed", () => {
    const run = (seed: number) => {
      const pool = new Pool(cards, { 1: 16, 3: 13 });
      const rng = new Rng(seed);
      return Array.from({ length: 10 }, () => pool.draw(rng, 3));
    };
    expect(run(8)).toEqual(run(8));
  });
});

describe("Pool.take", () => {
  it("removes copies and reports success", () => {
    const pool = new Pool([{ key: "k", rank: 1 }], { 1: 3 });
    expect(pool.take("k")).toBe(true);
    expect(pool.count("k")).toBe(2);
    expect(pool.take("k", 2)).toBe(true);
    expect(pool.count("k")).toBe(0);
  });

  it("refuses without changing anything when there are not enough copies", () => {
    const pool = new Pool([{ key: "k", rank: 1 }], { 1: 2 });
    expect(pool.take("k", 3)).toBe(false);
    expect(pool.count("k")).toBe(2);
  });

  it("validates the key", () => {
    expect(() => new Pool([], {}).take("ghost")).toThrow(/unknown/);
  });
});

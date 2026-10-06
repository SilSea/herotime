import { describe, expect, it } from "vitest";
import { Rng } from "./rng.js";

describe("Rng", () => {
  it("is deterministic for the same seed", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it("int stays within [0, max)", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it("int rejects invalid max", () => {
    expect(() => new Rng(1).int(0)).toThrow(RangeError);
    expect(() => new Rng(1).int(1.5)).toThrow(RangeError);
  });

  it("shuffle keeps elements and does not mutate input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = new Rng(9).shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("shuffle is deterministic per seed", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(new Rng(3).shuffle(items)).toEqual(new Rng(3).shuffle(items));
  });
});

import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { pairPlayers } from "./pairing.js";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const noHistory = new Map<string, string[]>();
const flat = (pairs: [string, string][]) => pairs.flat().sort();

describe("pairPlayers", () => {
  it("pairs everyone exactly once with an even count", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = pairPlayers(ids(8), noHistory, new Rng(seed), 3);
      expect(r.ghostFor).toBeUndefined();
      expect(flat(r.pairs)).toEqual(ids(8));
    }
  });

  it("with an odd count one player is left for the Ghost and the rest are paired", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = pairPlayers(ids(5), noHistory, new Rng(seed), 3);
      expect(r.ghostFor).toBeDefined();
      expect([...flat(r.pairs), r.ghostFor].sort()).toEqual(ids(5));
      expect(r.pairs).toHaveLength(2);
    }
  });

  it("avoids opponents from the last N rounds when it can", () => {
    // p0 recently fought p1, p2 fought p3: a rematch-free pairing exists (p0-p2/p3, p1-p3/p2)
    const history = new Map<string, string[]>([
      ["p0", ["p1"]],
      ["p1", ["p0"]],
      ["p2", ["p3"]],
      ["p3", ["p2"]],
    ]);
    for (let seed = 1; seed <= 50; seed++) {
      const { pairs } = pairPlayers(ids(4), history, new Rng(seed), 3);
      for (const [a, b] of pairs) expect(history.get(a)).not.toContain(b);
    }
  });

  it("only looks at the most recent rounds", () => {
    // p0 and p1 met 4 rounds ago, which no longer counts. Everything else is recent,
    // so the only repeat-free pairing is p0-p1 and p2-p3.
    const history = new Map<string, string[]>([
      ["p0", ["p1", "p2", "p3", "p2"]],
      ["p1", ["p0", "p3", "p2", "p3"]],
    ]);
    for (let seed = 1; seed <= 60; seed++) {
      const { pairs } = pairPlayers(ids(4), history, new Rng(seed), 3);
      const key = pairs.map((p) => [...p].sort().join("-")).sort();
      expect(key).toEqual(["p0-p1", "p2-p3"]);
    }
  });

  it("the window is exactly the last N rounds (older meetings are forgiven)", () => {
    // Everyone has met everyone. Counting the whole history, every pairing has 2 repeats.
    // Counting only the last 3 rounds, only p0-p1 / p2-p3 is free of repeats (those meetings are old).
    const history = new Map<string, string[]>([
      ["p0", ["p1", "p2", "p3", "p2"]],
      ["p1", ["p0", "p3", "p2", "p3"]],
      ["p2", ["p3", "p0", "p1", "p0"]],
      ["p3", ["p2", "p1", "p0", "p1"]],
    ]);
    for (let seed = 1; seed <= 60; seed++) {
      const key = pairPlayers(ids(4), history, new Rng(seed), 3).pairs.map((p) => [...p].sort().join("-")).sort();
      expect(key).toEqual(["p0-p1", "p2-p3"]);
    }
  });

  it("falls back to the fewest repeats when a rematch is unavoidable", () => {
    // 2 players who just met: they must meet again, not crash
    const history = new Map<string, string[]>([["p0", ["p1"]], ["p1", ["p0"]]]);
    const r = pairPlayers(["p0", "p1"], history, new Rng(1), 3);
    expect(flat(r.pairs)).toEqual(["p0", "p1"]);
  });

  it("does not give the Ghost to the same player twice in a row", () => {
    for (let seed = 1; seed <= 60; seed++) {
      expect(pairPlayers(ids(3), noHistory, new Rng(seed), 3, "p1").ghostFor).not.toBe("p1");
    }
  });

  it("a lone previous Ghost holder may repeat when there is no one else", () => {
    const r = pairPlayers(["p0"], noHistory, new Rng(1), 3, "p0");
    expect(r.ghostFor).toBe("p0");
    expect(r.pairs).toEqual([]);
  });

  it("is deterministic per seed", () => {
    expect(pairPlayers(ids(8), noHistory, new Rng(7), 3)).toEqual(pairPlayers(ids(8), noHistory, new Rng(7), 3));
  });
});

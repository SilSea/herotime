import { describe, expect, it } from "vitest";
import { suggestRelicWeights } from "../src/content/weights.js";
import { aggregateStats } from "../src/persistence/repositories.js";

describe("aggregateStats", () => {
  it("counts each card once per board and computes pick rate, average place and win rate", () => {
    const s = aggregateStats(
      [
        { isBot: false, mode: "queue", heroKey: "h", placement: 1, board: ["a", "a"], relics: ["r"] },
        { isBot: true, mode: "queue", heroKey: "h", placement: 3, board: ["a", "b"], relics: [] },
      ],
      1,
    );
    expect(s).toMatchObject({ matches: 1, players: 2 });
    expect(s.cards[0]).toEqual({ key: "a", count: 2, pickRate: 1, avgPlacement: 2, winRate: 0.5 });
    expect(s.cards[1]).toEqual({ key: "b", count: 1, pickRate: 0.5, avgPlacement: 3, winRate: 0 });
    expect(s.relics).toEqual([{ key: "r", count: 1, pickRate: 0.5, avgPlacement: 1, winRate: 1 }]);
  });
});

describe("suggestRelicWeights", () => {
  const row = (key: string, count: number, avgPlacement: number) => ({ key, count, pickRate: 0, avgPlacement, winRate: 0 });
  it("offers strong relics less and weak ones more, within half and one and a half of the weight", () => {
    const out = suggestRelicWeights(
      [{ key: "strong", weight: 100 }, { key: "weak", weight: 100 }, { key: "rare", weight: 100 }, { key: "huge", weight: 100 }],
      [row("strong", 10, 2.5), row("weak", 10, 6.5), row("rare", 2, 1), row("huge", 50, 8)],
    );
    expect(out.find((x) => x.key === "strong")?.suggested).toBe(70);
    expect(out.find((x) => x.key === "weak")?.suggested).toBe(130);
    expect(out.find((x) => x.key === "rare")).toMatchObject({ suggested: 100, samples: 2 }); // too few to judge
    expect(out.find((x) => x.key === "huge")?.suggested).toBe(150);
  });
});

import { describe, expect, it } from "vitest";
import { MMR_START, standingsFrom, type MatchResult } from "../src/persistence/repositories.js";

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 10, minute));
const match = (id: string, minute: number, places: (string | null)[], mode: MatchResult["mode"] = "queue"): MatchResult => ({
  matchId: id,
  mode,
  seed: 1,
  contentVersion: 1,
  startedAt: at(minute),
  endedAt: at(minute),
  players: places.map((u, i) => ({ userId: u, name: u ?? `Bot ${i}`, isBot: u === null, heroKey: null, placement: i + 1 })),
});

describe("MMR", () => {
  it("first place gains and last place loses, starting from the same rating", () => {
    const rows = standingsFrom([match("m", 0, ["a", "b", "c", "d"])], 1, 10, () => undefined);
    const mmr = Object.fromEntries(rows.map((r) => [r.userId, r.mmr]));
    expect(mmr.a).toBeGreaterThan(MMR_START);
    expect(mmr.d).toBeLessThan(MMR_START);
    expect(mmr.a as number).toBeGreaterThan(mmr.b as number);
    // equal ratings: the gains and losses balance out
    expect(Object.values(mmr).reduce((s, v) => s + (v as number) - MMR_START, 0)).toBeCloseTo(0, -1);
  });

  it("ranks by MMR, ignores bots and non-ranked matches, and needs the minimum number of games", () => {
    const ms = [match("1", 0, ["a", null, "b"]), match("2", 1, ["a", "b", null]), match("3", 2, ["b", "a", null]), match("p", 3, ["b", "a"], "practice"), match("q", 4, ["b", "a"], "quick")];
    const rows = standingsFrom(ms, 3, 10, (id) => id.toUpperCase());
    expect(rows.map((r) => r.username)).toEqual(["A", "B"]);
    expect(rows[0]).toMatchObject({ games: 3, wins: 2 });
    expect(standingsFrom(ms, 4, 10, () => undefined)).toEqual([]);
  });

  it("beating a stronger player is worth more than beating a weaker one", () => {
    // s becomes strong first; then w beats s in one match, and x beats a fresh player in another
    const ms = [match("1", 0, ["s", null, null]), match("2", 1, ["s", null, null]), match("3", 2, ["w", "s"]), match("4", 3, ["x", "y"])];
    const rows = standingsFrom(ms, 1, 10, () => undefined);
    const mmr = (id: string) => rows.find((r) => r.userId === id)?.mmr as number;
    expect(mmr("w")).toBeGreaterThan(mmr("x"));
  });

  it("replays matches oldest first, whatever order they are stored in", () => {
    const ms = [match("1", 0, ["a", "b"]), match("2", 5, ["b", "a"]), match("3", 9, ["b", "a"])];
    expect(standingsFrom([...ms].reverse(), 1, 10, () => undefined)).toEqual(standingsFrom(ms, 1, 10, () => undefined));
  });
});

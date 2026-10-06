import { describe, expect, it } from "vitest";
import { formatClock, ServerClock } from "../src/clock.js";
import { ContentIndex } from "../src/content-index.js";
import { describeCombat, KEYWORDS, keywordName, ordinal, stars } from "../src/format.js";
import type { CombatRecord, ContentSnapshot } from "../src/protocol.js";

describe("ServerClock", () => {
  it("shifts the client clock by the server's offset", () => {
    const c = new ServerClock();
    c.sync(10_000, 4_000); // the server is 6s ahead of this browser
    expect(c.now(5_000)).toBe(11_000);
    expect(c.remaining(20_000, 5_000)).toBe(9_000);
  });

  it("is plain client time before any sync, and never goes negative", () => {
    const c = new ServerClock();
    expect(c.now(123)).toBe(123);
    expect(c.remaining(100, 500)).toBe(0);
  });

  it("has no remaining time when there is no deadline", () => {
    expect(new ServerClock().remaining(null)).toBeNull();
  });

  it("a later sync replaces the earlier offset", () => {
    const c = new ServerClock();
    c.sync(1000, 0);
    c.sync(5000, 4000);
    expect(c.now(10_000)).toBe(11_000);
  });
});

describe("formatClock", () => {
  it.each([
    [null, "--:--"],
    [0, "0:00"],
    [1, "0:01"], // rounds up so it only shows 0:00 at the deadline
    [999, "0:01"],
    [1000, "0:01"],
    [59_001, "1:00"],
    [73_400, "1:14"],
    [600_000, "10:00"],
  ])("%s -> %s", (ms, text) => expect(formatClock(ms)).toBe(text));
});

const card = (key: string, name: string, over: Record<string, unknown> = {}) => ({
  key, name, rank: 1, atk: 1, hp: 1, kind: "UNIT", factions: [], colors: [], keywords: [], effects: [], token: false, text: "", ...over,
});

const snapshot = {
  set: "t",
  version: 1,
  factions: [{ key: "rider", name: "Rider", color: "#e53935", text: "" }],
  series: [],
  cards: [
    card("a", "Rookie Rider", { factions: ["rider"], art: "a.png" }),
    card("b", "Wild"),
    card("c", "Remote", { art: "https://x.test/c.png" }),
    card("d", "single"),
  ],
  gauges: [],
  relics: [{ key: "r", name: "Relic R", tier: "LESSER", cost: 1, factions: [], weight: 100, effects: [], text: "" }],
  heroes: [{ key: "h", name: "Hero H", armor: 0, text: "" }],
} as unknown as ContentSnapshot;

describe("ContentIndex", () => {
  const ix = new ContentIndex(snapshot);

  it("looks things up by key and falls back to the key", () => {
    expect(ix.cardName("a")).toBe("Rookie Rider");
    expect(ix.cardName("zzz")).toBe("zzz");
    expect(ix.heroName("h")).toBe("Hero H");
    expect(ix.heroName("x")).toBe("x");
    expect(ix.relicName("r")).toBe("Relic R");
    expect(ix.factionName("rider")).toBe("Rider");
    expect(ix.factionName("nope")).toBe("nope");
  });

  it("colours a card by its first faction, grey when neutral or unknown", () => {
    expect(ix.cardColor("a")).toBe("#e53935");
    expect(ix.cardColor("b")).toBe("#9e9e9e");
    expect(ix.cardColor("zzz")).toBe("#9e9e9e");
    expect(ix.factionColor("nope")).toBe("#888888");
  });

  it("makes initials for placeholder art", () => {
    expect(ix.initials("a")).toBe("RR");
    expect(ix.initials("d")).toBe("S");
    expect(ix.initials("zzz")).toBe("Z");
  });

  it("resolves art: none, local file under /art, or a full URL", () => {
    expect(ix.artUrl("b")).toBeUndefined();
    expect(ix.artUrl("zzz")).toBeUndefined();
    expect(ix.artUrl("a")).toBe("/art/a.png");
    expect(ix.artUrl("c")).toBe("https://x.test/c.png");
  });
});

describe("format helpers", () => {
  it("explains every engine keyword", () => {
    for (const k of ["GUARD", "BARRIER", "RAPID", "LETHAL", "REVIVE", "RIDER_KICK", "FINAL_BLOW", "KYODAIKA", "GATTAI"]) {
      expect(KEYWORDS[k]?.text.length, k).toBeGreaterThan(10);
    }
    expect(keywordName("RIDER_KICK")).toBe("Rider Kick");
    expect(keywordName("MYSTERY")).toBe("MYSTERY");
  });

  it("stars and ordinals", () => {
    expect(stars(3)).toBe("★★★");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });

  const rec = (winner: "A" | "B" | "DRAW", over: Partial<CombatRecord> = {}) =>
    ({ turn: 4, opponentName: "Bot 2", meSide: "A", damageTaken: 0, damageDealt: 0, result: { winner }, ...over }) as CombatRecord;

  it("summarises a win, a loss and a draw", () => {
    expect(describeCombat(rec("A", { damageDealt: 7 }))).toBe("Turn 4 vs Bot 2: Won, dealt 7 damage");
    expect(describeCombat(rec("B", { damageTaken: 5 }))).toBe("Turn 4 vs Bot 2: Lost, took 5 damage");
    expect(describeCombat(rec("DRAW"))).toBe("Turn 4 vs Bot 2: Draw");
  });

  it("reads the result from the player's own side", () => {
    expect(describeCombat(rec("B", { meSide: "B", damageDealt: 3 }))).toBe("Turn 4 vs Bot 2: Won, dealt 3 damage");
    expect(describeCombat(rec("A", { meSide: "B", damageTaken: 2 }))).toBe("Turn 4 vs Bot 2: Lost, took 2 damage");
  });

  it("beating a Ghost deals no damage and says so plainly", () => {
    expect(describeCombat(rec("A", { opponentName: "Ghost" }))).toBe("Turn 4 vs Ghost: Won");
  });
});

import { describe, expect, it } from "vitest";
import { formatClock, ServerClock } from "../src/clock.js";
import { ContentIndex } from "../src/content-index.js";
import { boardLabel, describeCombat, KEYWORDS, keywordName, ordinal, stars } from "../src/format.js";
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

describe("boardLabel", () => {
  const name = (f: string): string => f.charAt(0).toUpperCase() + f.slice(1);
  it("names the leading faction with its count", () => {
    expect(boardLabel({ units: 5, factions: { sentai: 4, mecha: 1 }, neutral: 0 }, name)).toEqual({ headline: "Sentai 4", parts: ["Sentai 4", "Mecha 1"] });
    expect(boardLabel({ units: 2, factions: { sentai: 2 }, neutral: 0 }, name).headline).toBe("Sentai 2");
  });
  it("says Mixed when nothing leads clearly", () => {
    expect(boardLabel({ units: 4, factions: { rider: 2, sentai: 2 }, neutral: 0 }, name)).toEqual({ headline: "Mixed", parts: ["Rider 2", "Sentai 2"] });
    expect(boardLabel({ units: 7, factions: { rider: 3, grunt: 2 }, neutral: 2 }, name).headline).toBe("Mixed"); // 3 of 7 is not half
    expect(boardLabel({ units: 3, factions: { rider: 1 }, neutral: 2 }, name)).toEqual({ headline: "Mixed", parts: ["Rider 1", "Neutral 2"] });
  });
  it("a board of one faction is named even when it is small", () => {
    expect(boardLabel({ units: 1, factions: { grunt: 1 }, neutral: 0 }, name).headline).toBe("Grunt 1");
    expect(boardLabel({ units: 2, factions: { grunt: 1 }, neutral: 1 }, name).headline).toBe("Mixed");
  });
  it("an empty board says so", () => {
    expect(boardLabel({ units: 0, factions: {}, neutral: 0 }, name)).toEqual({ headline: "Empty board", parts: [] });
  });
});

describe("buff wording", async () => {
  const { buffSource, buffValue } = await import("../src/ui/card.js");
  const ix = new ContentIndex({ set: "t", version: 1, factions: [], series: [], gauges: [], cards: [{ key: "g", name: "Armor Plate" }, { key: "c", name: "Cafe Owner" }] as never, relics: [{ key: "r", name: "Lucky Charm" }] as never, heroes: [{ key: "h", name: "Kaijin General" }] as never });
  it("names each kind of source", () => {
    expect(buffSource(ix, { kind: "gear", key: "g", atk: 0, hp: 3 })).toBe("Armor Plate (gear)");
    expect(buffSource(ix, { kind: "card", key: "c", atk: 1, hp: 1 })).toBe("Cafe Owner");
    expect(buffSource(ix, { kind: "relic", key: "r", atk: 1, hp: 1 })).toBe("Lucky Charm (relic)");
    expect(buffSource(ix, { kind: "hero", key: "h", atk: 0, hp: 0 })).toBe("Kaijin General (hero)");
    expect(buffSource(ix, { kind: "combat", key: null, atk: 2, hp: 0 })).toBe("Earned in combat");
  });
  it("says what was given", () => {
    expect(buffValue({ kind: "gear", key: "g", atk: 0, hp: 3 })).toBe("+0/+3");
    expect(buffValue({ kind: "hero", key: "h", atk: 0, hp: 0, keywords: ["KYODAIKA"] })).toBe("Kyodaika");
    expect(buffValue({ kind: "card", key: "c", atk: 2, hp: -1, keywords: ["GUARD"] })).toBe("+2/-1, Guard");
  });
});

describe("gaugeText", async () => {
  const { gaugeText } = await import("../src/format.js");
  const name = (k: string): string => ({ kyodai_gattai: "Kyodai Gattai!", ultimate_form: "Ultimate Form" })[k] ?? k;
  it("explains the Mecha Gauge from its data", () => {
    const t = gaugeText({ name: "Mecha Gauge", max: 6, sources: [{ trigger: "ON_ROLL_CALL", amount: 1 }, { trigger: "ON_ROLL_CALL_WIN", amount: 1 }], thresholds: [{ at: 3, once: true, reward: [{ type: "ADD_TO_HAND", cardKey: "kyodai_gattai" }] }] }, name);
    expect(t.fills).toEqual(["+1 when Roll Call fires (Sentai of 5 different colours at the start of a fight)", "+1 more if you also win that fight"]);
    expect(t.rewards).toEqual(["At 3: get Kyodai Gattai! (once per game)"]);
    expect(t.short).toBe("at 3 → Kyodai Gattai!");
  });
  it("says how many colours Roll Call needs in this content", () => {
    const t = gaugeText({ name: "Mecha Gauge", max: 6, sources: [{ trigger: "ON_ROLL_CALL", amount: 1 }], thresholds: [] }, name, 3);
    expect(t.fills).toEqual(["+1 when Roll Call fires (Sentai of 3 different colours at the start of a fight)"]);
  });
  it("explains a repeating reward", () => {
    const t = gaugeText({ name: "Rider Gauge", max: 6, sources: [{ trigger: "HENSHIN", amount: 1 }], thresholds: [{ at: 2, once: false, reward: [{ type: "ADD_TO_HAND", cardKey: "ultimate_form" }] }] }, name);
    expect(t.rewards).toEqual(["Every 2: get Ultimate Form"]);
    expect(t.short).toBe("every 2 → Ultimate Form");
  });
});

describe("relatedCards", async () => {
  const { relatedCards } = await import("../src/format.js");
  const fx = (o: Record<string, unknown>) => ({ scope: "UNIT", trigger: "ON_PLAY", actions: [], ...o });
  const def = (o: Record<string, unknown>) => ({ key: "me", name: "Me", kind: "UNIT", rank: 1, atk: 1, hp: 1, factions: [], colors: [], keywords: [], effects: [], ...o }) as never;
  it("lists forms first, then what it summons / adds / becomes, then named cards; each once, never itself", () => {
    const d = def({
      henshin: { afterTurns: 2, into: "me_form" },
      ultimateInto: "me_ult",
      effects: [
        fx({ trigger: "LAST_STAND", actions: [{ type: "SUMMON", cardKey: "cub", count: 2 }, { type: "SUMMON", cardKey: "cub" }] }),
        fx({ actions: [{ type: "ADD_TO_HAND", cardKey: "me" }] }),
      ],
    });
    expect(relatedCards(d).map((r) => r.key)).toEqual(["me_form", "me_ult", "cub"]);
    expect(relatedCards(d)[2]?.label).toMatch(/Summons|เรียก/);
  });
  it("includes transform targets, card filters and HAS_CARD, up to the limit", () => {
    const d = def({ effects: [fx({ target: { selector: "ALL_FRIENDLY", cards: ["a", "b"] }, condition: { type: "HAS_CARD", cards: ["c"] }, actions: [{ type: "TRANSFORM", into: "t" }] })] });
    expect(relatedCards(d).map((r) => r.key)).toEqual(["t", "a", "b", "c"]);
    expect(relatedCards(d, 2)).toHaveLength(2);
    expect(relatedCards(undefined)).toEqual([]);
    expect(relatedCards(def({}))).toEqual([]);
  });
});

describe("spaceThai", async () => {
  const { spaceThai } = await import("../src/format.js");
  it("matches the content package (a copy: the web has no bundler)", async () => {
    const content = await import("../../../packages/content/src/text-th.js");
    for (const s of ["ได้ Gear Kamen Riderแบบสุ่มเข้ามือ", "ให้Agent 7ได้ +2/+2", "Deploy: ได้ 1 Energy ในเทิร์นหน้า", "plain English", "ไทยล้วน"]) expect(spaceThai(s)).toBe(content.spaceThai(s));
    expect(spaceThai("ให้Agent 7ได้ +2/+2")).toBe("ให้ Agent 7 ได้ +2/+2");
  });
});

describe("byName", async () => {
  const { byName } = await import("../src/format.js");
  it("sorts A to Z by name, ignoring case, numbers in order, key when names tie", () => {
    const list = [{ key: "z", name: "zeta" }, { key: "b2", name: "Alpha" }, { key: "u10", name: "Unit 10" }, { key: "a1", name: "alpha" }, { key: "u2", name: "Unit 2" }, { key: "k" }];
    expect([...list].sort(byName).map((x) => x.key)).toEqual(["a1", "b2", "k", "u2", "u10", "z"]);
  });
});

describe("gearTargetSlots", async () => {
  const { gearTargetSlots } = await import("../src/format.js");
  const def = (o: Record<string, unknown>) => ({ key: "x", name: "x", kind: "UNIT", rank: 1, atk: 1, hp: 1, factions: [], colors: [], keywords: [], effects: [], ...o }) as never;
  const onChosen = (target: Record<string, unknown>) => def({ kind: "GEAR", effects: [{ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY", ...target }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] }] });
  const board = [def({ factions: ["rider"] }), def({ factions: ["grunt"] }), def({ factions: ["rider"], series: "w" })];
  it("lists the units a chosen-target gear can go on", () => {
    expect(gearTargetSlots(onChosen({}), board)).toEqual([0, 1, 2]);
    expect(gearTargetSlots(onChosen({ faction: "rider" }), board)).toEqual([0, 2]);
    expect(gearTargetSlots(onChosen({ series: "w" }), board)).toEqual([2]);
  });
  it("honours a named-card filter, later forms included", () => {
    const zeztz = def({ key: "zeztz" });
    const form = def({ key: "zeztz_form" });
    const lineage = (k: string) => (k === "zeztz_form" ? ["zeztz_form", "zeztz"] : [k]);
    expect(gearTargetSlots(onChosen({ cards: ["zeztz"] }), [board[0], zeztz, form], lineage)).toEqual([1, 2]);
    expect(gearTargetSlots(onChosen({ cards: ["agent7"] }), [board[0], zeztz], lineage)).toEqual([]);
  });
  it("is null for gear that needs no unit", () => {
    expect(gearTargetSlots(def({ kind: "GEAR", effects: [{ scope: "PLAYER", trigger: "ON_PLAY", actions: [{ type: "DISCOVER_UNIT", faction: "rider" }] }] }), board)).toBeNull();
  });
});

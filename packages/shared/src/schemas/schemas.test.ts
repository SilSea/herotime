import { describe, expect, it } from "vitest";
import { CardDef, Effect, GaugeDef, HeroDef, RelicDef, SeriesDef } from "../index.js";

describe("Effect", () => {
  it("accepts the README example and applies defaults", () => {
    const e = Effect.parse({
      trigger: "START_OF_COMBAT",
      condition: { type: "TEAM_UP_COLORS_GTE", value: 3 },
      target: { selector: "SELF" },
      actions: [{ type: "BUFF", atk: 2, hp: 2 }, { type: "SUMMON", cardKey: "grunt_token" }],
    });
    expect(e.scope).toBe("UNIT");
    expect(e.actions[0]).toEqual({ type: "BUFF", atk: 2, hp: 2, permanent: false });
    expect(e.actions[1]).toEqual({ type: "SUMMON", cardKey: "grunt_token", count: 1 });
  });

  it("rejects an unknown trigger, action, selector or condition", () => {
    const base = { trigger: "LAST_STAND", actions: [{ type: "DESTROY" }] };
    expect(Effect.safeParse(base).success).toBe(true);
    expect(Effect.safeParse({ ...base, trigger: "NOPE" }).success).toBe(false);
    expect(Effect.safeParse({ ...base, actions: [{ type: "NUKE" }] }).success).toBe(false);
    expect(Effect.safeParse({ ...base, target: { selector: "EVERYONE" } }).success).toBe(false);
    expect(Effect.safeParse({ ...base, condition: { type: "MOON_PHASE", value: 1 } }).success).toBe(false);
  });

  it("requires at least one action and valid action params", () => {
    expect(Effect.safeParse({ trigger: "LAST_STAND", actions: [] }).success).toBe(false);
    expect(Effect.safeParse({ trigger: "LAST_STAND", actions: [{ type: "SUMMON" }] }).success).toBe(false);
    expect(
      Effect.safeParse({ trigger: "LAST_STAND", actions: [{ type: "GIVE_KEYWORD", keyword: "FLY" }] }).success,
    ).toBe(false);
    expect(
      Effect.safeParse({
        trigger: "ON_ACQUIRE",
        scope: "PLAYER",
        actions: [{ type: "MODIFY_RULE", rule: "rollCallColors", op: "SET", value: 4 }],
      }).success,
    ).toBe(true);
  });
});

describe("content schemas", () => {
  it("CardDef fills defaults", () => {
    const c = CardDef.parse({ key: "k", name: "K", rank: 1, atk: 1, hp: 1 });
    expect(c).toMatchObject({ kind: "UNIT", factions: [], colors: [], keywords: [], effects: [], token: false });
  });

  it("CardDef rejects bad stats", () => {
    expect(CardDef.safeParse({ key: "k", name: "K", rank: 7, atk: 1, hp: 1 }).success).toBe(false);
    expect(CardDef.safeParse({ key: "k", name: "K", rank: 1, atk: -1, hp: 1 }).success).toBe(false);
    expect(CardDef.safeParse({ key: "k", name: "K", rank: 1, atk: 1, hp: 0 }).success).toBe(false);
  });

  it("SeriesDef bonds need count >= 2", () => {
    const fx = { trigger: "START_OF_COMBAT", scope: "PLAYER", actions: [{ type: "BUFF", atk: 1 }] };
    expect(SeriesDef.safeParse({ key: "s", name: "S", bonds: [{ count: 2, effects: [fx] }] }).success).toBe(true);
    expect(SeriesDef.safeParse({ key: "s", name: "S", bonds: [{ count: 1, effects: [fx] }] }).success).toBe(false);
  });

  it("GaugeDef accepts sources and thresholds, once defaults to true", () => {
    const g = GaugeDef.parse({
      key: "mecha",
      name: "Mecha",
      max: 6,
      sources: [{ trigger: "ON_ROLL_CALL", amount: 1 }],
      thresholds: [{ at: 3, reward: [{ type: "DISCOVER_GIANT" }] }],
    });
    expect(g.thresholds[0]?.once).toBe(true);
    expect(GaugeDef.safeParse({ key: "g", name: "G", max: 3, sources: [{ trigger: "ON_BUY", amount: 1 }] }).success).toBe(false);
  });

  it("RelicDef and HeroDef validate", () => {
    expect(RelicDef.safeParse({ key: "r", name: "R", tier: "LESSER", cost: 2 }).success).toBe(true);
    expect(RelicDef.safeParse({ key: "r", name: "R", tier: "EPIC", cost: 2 }).success).toBe(false);
    expect(
      HeroDef.safeParse({
        key: "h",
        name: "H",
        power: { mode: "ACTIVE", cost: 2, effects: [{ scope: "PLAYER", trigger: "ON_USE", actions: [{ type: "GAIN_ENERGY", amount: 1 }] }] },
      }).success,
    ).toBe(true);
    expect(HeroDef.safeParse({ key: "h", name: "H", power: { mode: "ACTIVE", effects: [] } }).success).toBe(false);
  });
});

describe("faction and text fields", () => {
  it("FactionDef has a default colour and requires a key and name", async () => {
    const { FactionDef } = await import("../index.js");
    expect(FactionDef.parse({ key: "rider", name: "Rider" })).toMatchObject({ color: "#888888", text: "" });
    expect(FactionDef.safeParse({ key: "", name: "x" }).success).toBe(false);
    expect(FactionDef.safeParse({ key: "x" }).success).toBe(false);
  });

  it("cards, relics and heroes carry optional rules text and art", () => {
    expect(CardDef.parse({ key: "k", name: "K", rank: 1, atk: 1, hp: 1 })).toMatchObject({ text: "" });
    expect(CardDef.parse({ key: "k", name: "K", rank: 1, atk: 1, hp: 1, text: "hi", art: "a.png" })).toMatchObject({ text: "hi", art: "a.png" });
    expect(RelicDef.parse({ key: "r", name: "R", tier: "LESSER", cost: 0 })).toMatchObject({ text: "" });
    expect(HeroDef.parse({ key: "h", name: "H" })).toMatchObject({ text: "" });
    expect(SeriesDef.parse({ key: "s", name: "S", franchise: "kamen-rider" })).toMatchObject({ franchise: "kamen-rider", text: "" });
  });
});

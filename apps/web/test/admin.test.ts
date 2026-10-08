import { Action, CardDef, Condition, Effect, FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef, KeywordKey, SentaiColor, Selector, Trigger, OwnerScope, CardKind } from "@herotime/shared";
import { describe, expect, it } from "vitest";
import { SENTAI_COLORS } from "../src/format.js";
import { ACTION, ACTION_FIELDS, ACTION_TYPES, CARD_KINDS, COLORS, CONDITION, CONDITION_TYPES, EFFECT, ENTITIES, KEYWORDS, SCOPES, SELECTORS, TRIGGERS, type Row } from "../src/ui/admin-schema.js";
import { defaultFor, rowsDefault } from "../src/ui/form.js";

const sorted = (xs: readonly string[]): string[] => [...xs].sort();
const rowKeys = (rows: Row[]): string[] => sorted(rows.map((r) => r.key));

describe("the editor's option lists match the real schema", () => {
  it("enums", () => {
    expect(sorted(KEYWORDS)).toEqual(sorted(KeywordKey.options));
    expect(sorted(COLORS)).toEqual(sorted(SentaiColor.options));
    // every colour has a swatch on cards and in the wizard
    expect(sorted(Object.keys(SENTAI_COLORS))).toEqual(sorted(SentaiColor.options));
    expect(sorted(TRIGGERS)).toEqual(sorted(Trigger.options));
    expect(sorted(SELECTORS)).toEqual(sorted(Selector.options));
    expect(sorted(SCOPES)).toEqual(sorted(OwnerScope.options));
    expect(sorted(CARD_KINDS)).toEqual(sorted(CardKind.options));
  });

  it("every action and condition type, with exactly the fields the schema has", () => {
    const actionTypes = Action.options.map((o) => o.shape.type.value as string);
    expect(sorted(ACTION_TYPES)).toEqual(sorted(actionTypes));
    for (const o of Action.options) {
      const type = o.shape.type.value as keyof typeof ACTION_FIELDS;
      expect(rowKeys(ACTION_FIELDS[type]), type).toEqual(sorted(Object.keys(o.shape).filter((k) => k !== "type")));
    }
    expect(sorted(CONDITION_TYPES)).toEqual(sorted(Condition.options.map((o) => o.shape.type.value as string)));
    if (CONDITION.kind !== "union") throw new Error("condition is a union");
    for (const o of Condition.options) {
      const type = o.shape.type.value as string;
      expect(rowKeys(CONDITION.variants[type] as Row[]), type).toEqual(sorted(Object.keys(o.shape).filter((k) => k !== "type")));
    }
  });

  it("every entity form shows exactly the fields that entity has", () => {
    const shapes: Record<string, string[]> = {
      cards: Object.keys(CardDef.shape),
      heroes: Object.keys(HeroDef.shape),
      relics: Object.keys(RelicDef.shape),
      factions: Object.keys(FactionDef.shape),
      series: Object.keys(SeriesDef.shape),
      gauges: Object.keys(GaugeDef.shape),
    };
    for (const e of ENTITIES) expect(rowKeys(e.rows), e.kind).toEqual(sorted(shapes[e.kind] as string[]));
    if (EFFECT.kind !== "object") throw new Error("effect is an object");
    expect(rowKeys(EFFECT.rows)).toEqual(sorted(Object.keys(Effect.shape)));
  });
});

describe("new things start out valid", () => {
  const schemas = { cards: CardDef, heroes: HeroDef, relics: RelicDef, factions: FactionDef, series: SeriesDef, gauges: GaugeDef } as const;

  it("every kind can create an entry that passes the schema", () => {
    for (const e of ENTITIES) {
      const r = schemas[e.kind].safeParse(e.make("some_key"));
      expect(r.success, `${e.kind}: ${r.success ? "" : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });

  it("every action, condition and a fresh effect is valid", () => {
    if (ACTION.kind !== "union" || CONDITION.kind !== "union") throw new Error("unions expected");
    for (const t of ACTION_TYPES) expect(Action.safeParse(ACTION.make(t)).success, t).toBe(true);
    for (const t of CONDITION_TYPES) expect(Condition.safeParse(CONDITION.make(t)).success, t).toBe(true);
    expect(Effect.safeParse(defaultFor(EFFECT)).success).toBe(true);
  });

  it("switching on the optional parts of a card, hero, series and gauge keeps them valid", () => {
    const card = { ...(ENTITIES[0]?.make("c") as object), effects: [defaultFor(EFFECT)], henshin: defaultFor({ kind: "object", rows: [], make: () => ({ afterTurns: 2, into: "x" }) }) };
    expect(CardDef.safeParse(card).success).toBe(true);

    const heroRows = ENTITIES.find((e) => e.kind === "heroes")?.rows as Row[];
    const power = heroRows.find((r) => r.key === "power") as Row;
    expect(HeroDef.safeParse({ key: "h", name: "H", power: defaultFor(power.field) }).success).toBe(true);

    const bonds = (ENTITIES.find((e) => e.kind === "series")?.rows as Row[]).find((r) => r.key === "bonds") as Row;
    if (bonds.field.kind !== "list") throw new Error("bonds is a list");
    expect(SeriesDef.safeParse({ key: "s", name: "S", bonds: [bonds.field.make()] }).success).toBe(true);

    const rows = ENTITIES.find((e) => e.kind === "gauges")?.rows as Row[];
    const thresholds = rows.find((r) => r.key === "thresholds") as Row;
    const sources = rows.find((r) => r.key === "sources") as Row;
    if (thresholds.field.kind !== "list" || sources.field.kind !== "list") throw new Error("lists expected");
    expect(GaugeDef.safeParse({ key: "g", name: "G", max: 6, sources: [sources.field.make()], thresholds: [thresholds.field.make()] }).success).toBe(true);
  });
});

describe("defaults", () => {
  it("rowsDefault fills required rows only", () => {
    expect(rowsDefault([{ key: "a", field: { kind: "int", min: 2 } }, { key: "b", field: { kind: "text" } }, { key: "c", field: { kind: "bool" }, optional: true }])).toEqual({ a: 2, b: "" });
  });
  it("a list with a minimum starts with that many items", () => {
    expect(defaultFor({ kind: "list", of: { kind: "int" }, make: () => 7, min: 2 })).toEqual([7, 7]);
  });
});

describe("the rules tab matches the engine and the schema", () => {
  it("lists every rule a content set may change, with the engine's defaults", async () => {
    const { RULE_DEFAULTS, RULE_ROWS } = await import("../src/ui/admin-schema.js");
    const { ContentRules } = await import("@herotime/shared");
    const { DEFAULT_CONFIG, DEFAULT_COMBAT_RULES } = await import("@herotime/engine");
    expect(Object.keys(RULE_DEFAULTS).sort()).toEqual(Object.keys(ContentRules.shape).sort());
    for (const [k, v] of Object.entries(RULE_DEFAULTS)) {
      const engine = (DEFAULT_CONFIG as unknown as Record<string, unknown>)[k] ?? (DEFAULT_COMBAT_RULES as unknown as Record<string, unknown>)[k];
      expect(engine, k).toBe(v);
    }
    expect(RULE_ROWS.every((r) => r.optional)).toBe(true);
  });
});

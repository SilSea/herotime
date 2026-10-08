/**
 * What the content editor knows about the shape of content, as plain data. The form renderer (form.ts) turns
 * these descriptors into inputs. The lists below are copied from the zod schemas in @herotime/shared (the web
 * bundle cannot import packages); test/admin.test.ts fails when they drift apart.
 */

export type RefKind = "cards" | "factions" | "series" | "gauges" | "heroes" | "relics";

export interface Row {
  key: string;
  label?: string;
  field: Field;
  /** Absent unless switched on; `make` gives the starting value. */
  optional?: boolean;
  hint?: string;
}

export type Field =
  | { kind: "text"; area?: boolean; placeholder?: string; /** Offer a file picker that uploads an image (or, with audio, a sound) and fills in its name. */ upload?: boolean; audio?: boolean }
  | { kind: "int"; min?: number; max?: number }
  | { kind: "num" }
  | { kind: "bool" }
  | { kind: "enum"; options: readonly string[] }
  /** A key of another thing; typing suggests the keys that exist. */
  | { kind: "ref"; to: RefKind }
  /** A list of strings: tick boxes for a fixed set, or a comma list with suggestions. */
  | { kind: "tags"; options?: readonly string[]; to?: RefKind }
  | { kind: "list"; of: Field; make: () => unknown; title?: (item: any, index: number) => string; min?: number }
  | { kind: "object"; rows: Row[]; make?: () => unknown }
  | { kind: "union"; tag: string; variants: Record<string, Row[]>; make: (tag: string) => Record<string, unknown> };

export const KEYWORDS = ["GUARD", "BARRIER", "RAPID", "LETHAL", "REVIVE", "RIDER_KICK", "FINAL_BLOW", "KYODAIKA", "GATTAI", "ECHO"] as const;
/* Same as @herotime/shared SentaiColor (a test keeps them equal). */
export const COLORS = ["RED", "BLUE", "YELLOW", "GREEN", "PINK", "BLACK", "WHITE", "PURPLE", "SILVER", "GOLD", "ORANGE", "EXTRA"] as const;
export const SCOPES = ["UNIT", "PLAYER"] as const;
export const TRIGGERS = [
  "ON_PLAY",
  "END_OF_TURN",
  "HENSHIN",
  "START_OF_COMBAT",
  "ON_ATTACK",
  "AFTER_DAMAGED",
  "LAST_STAND",
  "AVENGE",
  "ALLY_SUMMONED",
  "ON_SELL",
  "ON_DISCARD",
  "ON_ACQUIRE",
  "ON_TURN_START",
  "ON_USE",
  "ON_ROLL_CALL",
  "ON_ROLL_CALL_WIN",
] as const;
export const SELECTORS = ["SELF", "ADJACENT", "LEFTMOST_FRIENDLY", "RIGHTMOST_FRIENDLY", "RANDOM_FRIENDLY", "ALL_FRIENDLY", "CHOSEN_FRIENDLY", "SUMMONED", "GIANT_SLOT", "LEFTMOST_ENEMY", "RANDOM_ENEMY", "ALL_ENEMY"] as const;
export const CONDITION_TYPES = ["TEAM_UP_COLORS_GTE", "FACTION_COUNT_GTE", "SERIES_COUNT_GTE", "ENERGY_GTE", "HAS_CARD"] as const;
export const ACTION_TYPES = ["BUFF", "SUMMON", "DAMAGE", "GIVE_KEYWORD", "TRANSFORM", "DESTROY", "GAIN_ENERGY", "GAUGE_ADD", "MODIFY_RULE", "ADD_TO_HAND", "DISCOVER_GIANT", "DISCOVER_UNIT", "SUPER_GATTAI", "RANDOM_CARD", "ULTIMATE_FORM", "BUFF_SHOP", "BUFF_GEAR", "DEVOUR_SHOP", "SUMMON_FROM_HAND", "DISCARD", "CONSUME_ALLIES", "COPY"] as const;
export const CARD_KINDS = ["UNIT", "GEAR", "GIANT"] as const;
export const GAUGE_SOURCES = ["ON_ROLL_CALL", "ON_ROLL_CALL_WIN", "HENSHIN"] as const;
export const POWER_MODES = ["ACTIVE", "ONCE", "PASSIVE"] as const;
export const TIERS = ["LESSER", "GREATER"] as const;
export const RULE_OPS = ["SET", "ADD", "MUL"] as const;
/** Rules MODIFY_RULE understands (engine rules.ts); the field still accepts any text. */
export const RULE_NAMES = ["startEnergy", "energyPerTurn", "maxEnergy", "buyCost", "sellValue", "refreshCost", "boardSize", "handSize", "maxRank", "freeRefreshesPerTurn", "rollCallColors", "rollCallBuff", "gattaiSize", "giantEntryThreshold", "giantSentaiScale", "kyodaikaMultiplier"] as const;

/** Several card keys, one searchable picker each ("this card or that card"). */
const CARD_LIST: Field = { kind: "list", of: { kind: "ref", to: "cards" }, make: () => "", title: () => "card", min: 1 };

const int = (min?: number, max?: number): Field => ({ kind: "int", ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) });
const text: Field = { kind: "text" };

// ----------------------------------------------------------------- actions, conditions, targets

export const ACTION_FIELDS: Record<(typeof ACTION_TYPES)[number], Row[]> = {
  BUFF: [
    { key: "atk", field: int() },
    { key: "hp", field: int() },
    { key: "permanent", field: { kind: "bool" }, hint: "In combat, keep the bonus after the fight" },
    { key: "fromSelf", label: "+ this card's ATK/HP", field: { kind: "bool" }, optional: true, hint: "Also give this card's own current ATK/HP (on top of atk/hp)" },
  ],
  COPY: [
    { key: "to", field: { kind: "enum", options: ["BOARD", "HAND"] }, hint: "BOARD: right of the target. HAND: into your hand (from a fight: next turn). Copies are new cards and count for triples" },
    { key: "withBuffs", label: "with bonuses", field: { kind: "bool" }, hint: "Keep it Golden, with its bonuses and keywords (off: the base card)" },
  ],
  CONSUME_ALLIES: [{ key: "permanent", field: { kind: "bool" }, hint: "Destroys all your other units, the targets get their total ATK/HP. In combat, keep it after the fight" }],
  SUMMON: [
    { key: "cardKey", label: "card", field: { kind: "ref", to: "cards" } },
    { key: "count", field: int(1) },
  ],
  DAMAGE: [{ key: "amount", field: int(1) }],
  GIVE_KEYWORD: [{ key: "keyword", field: { kind: "enum", options: KEYWORDS } }],
  TRANSFORM: [{ key: "into", label: "into card", field: { kind: "ref", to: "cards" } }],
  DESTROY: [],
  GAIN_ENERGY: [{ key: "amount", field: int() }],
  GAUGE_ADD: [
    { key: "gauge", field: { kind: "ref", to: "gauges" } },
    { key: "amount", field: int() },
  ],
  MODIFY_RULE: [
    { key: "rule", field: { kind: "text", placeholder: RULE_NAMES.join(", ") } },
    { key: "op", field: { kind: "enum", options: RULE_OPS } },
    { key: "value", field: { kind: "num" } },
  ],
  ADD_TO_HAND: [{ key: "cardKey", label: "card", field: { kind: "ref", to: "cards" } }],
  DISCOVER_GIANT: [],
  DISCOVER_UNIT: [{ key: "faction", field: { kind: "ref", to: "factions" }, optional: true, hint: "Empty = any faction" }],
  SUPER_GATTAI: [
    { key: "atk", field: int(), hint: "Giant bonus in fights with an Extra Ranger on the board" },
    { key: "hp", field: int() },
  ],
  RANDOM_CARD: [
    { key: "cardKind", label: "card kind", field: { kind: "enum", options: ["GEAR", "UNIT"] }, hint: "GEAR: a tavern gear up to your rank. UNIT: a pool unit up to your rank" },
    { key: "faction", field: { kind: "ref", to: "factions" }, optional: true, hint: "Empty = any faction" },
  ],
  ULTIMATE_FORM: [],
  BUFF_SHOP: [
    { key: "atk", field: int(), hint: "Units in your tavern get this for the rest of the game" },
    { key: "hp", field: int() },
  ],
  BUFF_GEAR: [
    { key: "atk", field: int(), hint: "For the rest of the game, every Gear you use that gives stats gives this much more" },
    { key: "hp", field: int() },
  ],
  DEVOUR_SHOP: [
    { key: "choose", field: { kind: "enum", options: ["RANDOM", "STRONGEST", "WEAKEST"] }, hint: "STRONGEST / WEAKEST: by ATK+HP" },
    { key: "faction", label: "only faction", field: { kind: "ref", to: "factions" }, optional: true },
  ],
  DISCARD: [
    { key: "count", field: int(1), hint: "How many cards to throw away from the hand" },
    { key: "pick", field: { kind: "enum", options: ["RANDOM", "LEFTMOST", "RIGHTMOST"] } },
    { key: "cardKind", label: "card kind", field: { kind: "enum", options: ["ANY", "UNIT", "GEAR"] } },
  ],
  SUMMON_FROM_HAND: [{ key: "count", field: int(1), hint: "Tavern: unit cards leave the hand for the board. Fight: copies of hand units join" }],
};

const ACTION_DEFAULTS: Record<(typeof ACTION_TYPES)[number], Record<string, unknown>> = {
  BUFF: { atk: 1, hp: 1, permanent: false },
  CONSUME_ALLIES: { permanent: false },
  COPY: { to: "BOARD", withBuffs: false },
  SUMMON: { cardKey: "", count: 1 },
  DAMAGE: { amount: 1 },
  GIVE_KEYWORD: { keyword: "GUARD" },
  TRANSFORM: { into: "" },
  DESTROY: {},
  GAIN_ENERGY: { amount: 1 },
  GAUGE_ADD: { gauge: "", amount: 1 },
  MODIFY_RULE: { rule: "", op: "SET", value: 0 },
  ADD_TO_HAND: { cardKey: "" },
  DISCOVER_GIANT: {},
  DISCOVER_UNIT: {},
  SUPER_GATTAI: { atk: 4, hp: 4 },
  RANDOM_CARD: { cardKind: "GEAR" },
  ULTIMATE_FORM: {},
  BUFF_SHOP: { atk: 1, hp: 1 },
  BUFF_GEAR: { atk: 1, hp: 1 },
  DEVOUR_SHOP: { choose: "RANDOM" },
  DISCARD: { count: 1, pick: "RANDOM", cardKind: "ANY" },
  SUMMON_FROM_HAND: { count: 1 },
};

export const ACTION: Field = {
  kind: "union",
  tag: "type",
  variants: ACTION_FIELDS,
  make: (tag) => ({ type: tag, ...structuredClone(ACTION_DEFAULTS[tag as keyof typeof ACTION_DEFAULTS] ?? {}) }),
};

const CONDITION_FIELDS: Record<(typeof CONDITION_TYPES)[number], Row[]> = {
  TEAM_UP_COLORS_GTE: [{ key: "value", label: "colours at least", field: int(1, 6) }],
  FACTION_COUNT_GTE: [
    { key: "faction", field: { kind: "ref", to: "factions" } },
    { key: "value", label: "at least", field: int(1) },
  ],
  SERIES_COUNT_GTE: [
    { key: "series", field: { kind: "ref", to: "series" } },
    { key: "value", label: "at least", field: int(1) },
  ],
  ENERGY_GTE: [{ key: "value", label: "energy at least", field: int(0) }],
  HAS_CARD: [{ key: "cards", label: "any of these cards", field: CARD_LIST, hint: "Holds while one of these (or a later form of one) is on your board" }],
};
const CONDITION_DEFAULTS: Record<(typeof CONDITION_TYPES)[number], Record<string, unknown>> = {
  TEAM_UP_COLORS_GTE: { value: 3 },
  FACTION_COUNT_GTE: { faction: "", value: 2 },
  SERIES_COUNT_GTE: { series: "", value: 2 },
  ENERGY_GTE: { value: 1 },
  HAS_CARD: { cards: [""] },
};
export const CONDITION: Field = { kind: "union", tag: "type", variants: CONDITION_FIELDS, make: (tag) => ({ type: tag, ...structuredClone(CONDITION_DEFAULTS[tag as keyof typeof CONDITION_DEFAULTS] ?? {}) }) };

export const TARGET: Field = {
  kind: "object",
  make: () => ({ selector: "SELF" }),
  rows: [
    { key: "selector", field: { kind: "enum", options: SELECTORS } },
    { key: "faction", field: { kind: "ref", to: "factions" }, optional: true, hint: "only units of this faction" },
    { key: "series", field: { kind: "ref", to: "series" }, optional: true, hint: "only units of this series" },
    { key: "cards", field: CARD_LIST, optional: true, hint: "only these cards (or their later forms: Henshin / Final Form)" },
  ],
};

export const EFFECT: Field = {
  kind: "object",
  make: () => ({ scope: "UNIT", trigger: "START_OF_COMBAT", actions: [ACTION_MAKE("BUFF")] }),
  rows: [
    { key: "scope", field: { kind: "enum", options: SCOPES }, hint: "UNIT: belongs to a card on the board. PLAYER: relics, hero powers, series bonds, gear" },
    { key: "trigger", field: { kind: "enum", options: TRIGGERS } },
    { key: "every", label: "every N deaths", field: int(1), optional: true, hint: "AVENGE only" },
    { key: "condition", field: CONDITION, optional: true },
    { key: "target", field: TARGET, optional: true, hint: "who the actions apply to (default: the unit itself)" },
    { key: "actions", field: { kind: "list", of: ACTION, make: () => ACTION_MAKE("BUFF"), min: 1, title: (a: any) => String(a?.type ?? "") } },
    { key: "goldenMultiplier", label: "golden multiplier", field: { kind: "num" }, optional: true, hint: "default 2" },
    {
      key: "limit",
      label: "limit",
      field: { kind: "object", rows: [{ key: "times", label: "at most", field: int(1) }, { key: "per", field: { kind: "enum", options: ["TURN", "GAME"] } }], make: () => ({ times: 1, per: "TURN" }) },
      optional: true,
      hint: "fires at most this many times per turn / game (per unit, or per relic/hero/gear); in a fight: per fight",
    },
    { key: "repeat", label: "happens N times", field: int(1, 5), optional: true, hint: "the whole effect runs this many times each time it fires (default 1)" },
  ],
};

function ACTION_MAKE(tag: keyof typeof ACTION_DEFAULTS): Record<string, unknown> {
  return { type: tag, ...structuredClone(ACTION_DEFAULTS[tag]) };
}

const effects = (): Field => ({ kind: "list", of: EFFECT, make: () => (EFFECT as { make: () => unknown }).make(), title: (e: any) => `${e?.trigger ?? ""}` });

// ------------------------------------------------------------------------------------ entities

/** A card's or faction's own sounds: uploaded files (mp3 / ogg / wav). */
const sound = (hint: string): Row["field"] => ({ kind: "text", placeholder: "upload a sound", upload: true, audio: true });
export const CARD_SOUNDS: Row = {
  key: "sounds",
  label: "sounds",
  optional: true,
  hint: "This card's own sounds. Empty = its faction's, then the game-wide ones (Sounds tab)",
  field: {
    kind: "object",
    make: () => ({}),
    rows: [
      { key: "play", label: "played / summoned", field: sound(""), optional: true },
      { key: "attack", label: "attacks", field: sound(""), optional: true },
      { key: "death", label: "dies", field: sound(""), optional: true },
      { key: "transform", label: "transforms into this", field: sound(""), optional: true },
    ],
  },
};

const CARD_ROWS: Row[] = [
  { key: "key", field: text },
  { key: "name", field: text },
  { key: "kind", field: { kind: "enum", options: CARD_KINDS }, hint: "GEAR is used from the hand; GIANT sits in the Giant Slot" },
  { key: "rank", field: int(1, 6) },
  { key: "atk", field: int(0) },
  { key: "hp", field: int(1) },
  { key: "series", field: { kind: "ref", to: "series" }, optional: true },
  { key: "factions", field: { kind: "tags", to: "factions" } },
  { key: "colors", field: { kind: "tags", options: COLORS }, hint: "Sentai colours for Team-Up and Roll Call" },
  { key: "keywords", field: { kind: "tags", options: KEYWORDS } },
  { key: "token", field: { kind: "bool" }, hint: "Tokens are never sold in the shop" },
  { key: "cost", label: "gear price", field: int(0), optional: true, hint: "GEAR that is not a token is sold in the tavern at this price (from its rank up)" },
  { key: "costType", label: "paid with", field: { kind: "enum", options: ["ENERGY", "HEALTH"] }, hint: "HEALTH: the price comes off the hero's Health (never down to 0)" },
  CARD_SOUNDS,
  { key: "ultimateInto", label: "final form", field: { kind: "ref", to: "cards" }, optional: true, hint: "Its Final Form: what a Final Form card (action ULTIMATE_FORM) turns this unit into, e.g. the Rider's last form" },
  { key: "gattaiInto", label: "gattai form", field: { kind: "ref", to: "cards" }, optional: true, hint: "Gattai core: when this is the leftmost of a Gattai group, the group becomes this card (needs the GATTAI keyword)" },
  { key: "henshin", field: { kind: "object", rows: [{ key: "afterTurns", field: int(1) }, { key: "into", label: "into card", field: { kind: "ref", to: "cards" } }], make: () => ({ afterTurns: 2, into: "" }) }, optional: true },
  { key: "text", field: { kind: "text", area: true }, hint: "Leave empty to generate it from the effects" },
  { key: "textTh", label: "text (Thai)", field: { kind: "text", area: true }, hint: "Empty = generated Thai, or the English text when that was written by hand" },
  { key: "art", field: { kind: "text", placeholder: "pick an image, or a path/URL", upload: true }, optional: true },
  { key: "artCrop", label: "picture framing", field: { kind: "object", rows: [{ key: "x", label: "left/right %", field: int(0, 100) }, { key: "y", label: "up/down %", field: int(0, 100) }, { key: "zoom", field: { kind: "num" }, hint: "1 to 4" }], make: () => ({ x: 50, y: 50, zoom: 1 }) }, optional: true, hint: "Easier: drag / scroll the picture on the big preview card, or use the sliders under it" },
  { key: "effects", field: effects() },
];

const HERO_ROWS: Row[] = [
  { key: "key", field: text },
  { key: "name", field: text },
  { key: "armor", field: int(0) },
  { key: "text", field: { kind: "text", area: true }, hint: "Leave empty to generate it from the power" },
  { key: "textTh", label: "text (Thai)", field: { kind: "text", area: true }, hint: "Empty = generated Thai, or the English text when that was written by hand" },
  { key: "art", field: { kind: "text", placeholder: "pick an image, or a path/URL", upload: true }, optional: true },
  {
    key: "power",
    field: {
      kind: "object",
      make: () => ({ mode: "ACTIVE", cost: 1, effects: [{ scope: "PLAYER", trigger: "ON_USE", actions: [ACTION_MAKE("BUFF")] }] }),
      rows: [
        { key: "mode", field: { kind: "enum", options: POWER_MODES }, hint: "ACTIVE: once per turn. ONCE: once per game. PASSIVE: runs when the hero is chosen" },
        { key: "cost", field: int(0) },
        { key: "effects", field: effects() },
      ],
    },
    optional: true,
  },
];

const RELIC_ROWS: Row[] = [
  { key: "key", field: text },
  { key: "name", field: text },
  { key: "tier", field: { kind: "enum", options: TIERS } },
  { key: "cost", field: int(0) },
  { key: "weight", field: int(0), hint: "How often it is offered" },
  { key: "factions", field: { kind: "tags", to: "factions" }, hint: "Offered more to players with these factions" },
  { key: "series", field: { kind: "ref", to: "series" }, optional: true },
  { key: "text", field: { kind: "text", area: true }, hint: "Leave empty to generate it from the effects" },
  { key: "textTh", label: "text (Thai)", field: { kind: "text", area: true }, hint: "Empty = generated Thai, or the English text when that was written by hand" },
  { key: "art", field: { kind: "text", placeholder: "pick an image, or a path/URL", upload: true }, optional: true },
  { key: "effects", field: effects() },
];

const FACTION_ROWS: Row[] = [
  { key: "key", field: text },
  { key: "name", field: text },
  { key: "color", field: { kind: "text", placeholder: "#e53935" } },
  { key: "text", field: { kind: "text", area: true } },
  { key: "textTh", label: "text (Thai)", field: { kind: "text", area: true } },
  { ...CARD_SOUNDS, hint: "Sounds for every card of this faction that has none of its own" },
];

const SERIES_ROWS: Row[] = [
  { key: "key", field: text },
  { key: "name", field: text },
  { key: "universe", field: text, optional: true, hint: "e.g. tokusatsu, anime" },
  { key: "franchise", field: text, optional: true, hint: "e.g. super-sentai, kamen-rider, original" },
  { key: "text", field: { kind: "text", area: true } },
  {
    key: "bonds",
    field: {
      kind: "list",
      title: (b: any) => `${b?.count ?? "?"} units`,
      make: () => ({ count: 2, effects: [{ scope: "PLAYER", trigger: "START_OF_COMBAT", actions: [ACTION_MAKE("BUFF")] }] }),
      of: { kind: "object", rows: [{ key: "count", label: "units on board", field: int(2) }, { key: "effects", field: effects() }] },
    },
    hint: "Bonus at combat start when this many units of the series are on the board",
  },
];

const GAUGE_ROWS: Row[] = [
  { key: "key", field: text },
  { key: "name", field: text },
  { key: "max", field: int(1) },
  {
    key: "sources",
    field: { kind: "list", title: (s: any) => String(s?.trigger ?? ""), make: () => ({ trigger: "ON_ROLL_CALL", amount: 1 }), of: { kind: "object", rows: [{ key: "trigger", field: { kind: "enum", options: GAUGE_SOURCES } }, { key: "amount", field: int(1) }] } },
    hint: "What fills the gauge",
  },
  {
    key: "thresholds",
    field: {
      kind: "list",
      title: (t: any) => `at ${t?.at ?? "?"}`,
      make: () => ({ at: 3, once: true, reward: [ACTION_MAKE("ADD_TO_HAND")] }),
      of: { kind: "object", rows: [{ key: "at", field: int(1) }, { key: "once", field: { kind: "bool" } }, { key: "reward", field: { kind: "list", of: ACTION, make: () => ACTION_MAKE("ADD_TO_HAND"), min: 1, title: (a: any) => String(a?.type ?? "") } }] },
    },
    hint: "Rewards when the gauge reaches a value",
  },
];

export type EntityKind = "cards" | "heroes" | "relics" | "factions" | "series" | "gauges";

export interface EntityInfo {
  kind: EntityKind;
  label: string;
  singular: string;
  rows: Row[];
  /** A new entry, valid enough to save. */
  make: (key: string) => Record<string, unknown>;
}

export const ENTITIES: EntityInfo[] = [
  { kind: "cards", label: "Cards", singular: "card", rows: CARD_ROWS, make: (key) => ({ key, name: "New card", rank: 1, atk: 1, hp: 1, kind: "UNIT", factions: [], colors: [], keywords: [], effects: [], token: false, text: "" }) },
  { kind: "heroes", label: "Heroes", singular: "hero", rows: HERO_ROWS, make: (key) => ({ key, name: "New hero", armor: 0, text: "" }) },
  { kind: "relics", label: "Relics", singular: "relic", rows: RELIC_ROWS, make: (key) => ({ key, name: "New relic", tier: "LESSER", cost: 1, factions: [], weight: 100, effects: [], text: "" }) },
  { kind: "factions", label: "Factions", singular: "faction", rows: FACTION_ROWS, make: (key) => ({ key, name: "New faction", color: "#888888", text: "" }) },
  { kind: "series", label: "Series", singular: "series", rows: SERIES_ROWS, make: (key) => ({ key, name: "New series", text: "", bonds: [] }) },
  { kind: "gauges", label: "Gauges", singular: "gauge", rows: GAUGE_ROWS, make: (key) => ({ key, name: "New gauge", max: 6, sources: [], thresholds: [] }) },
];

export const entityInfo = (kind: EntityKind): EntityInfo => ENTITIES.find((e) => e.kind === kind) as EntityInfo;

/** Engine defaults for every rule a content set can change (engine config.ts); a test keeps them in step. */
export const RULE_DEFAULTS: Record<string, number> = {
  startEnergy: 3,
  energyPerTurn: 1,
  maxEnergy: 10,
  buyCost: 3,
  sellValue: 1,
  refreshCost: 1,
  boardSize: 7,
  handSize: 10,
  damageCap: 15,
  damageCapUntilTurn: 8,
  rollCallColors: 5,
  rollCallBuff: 1,
  gattaiSize: 3,
  giantEntryThreshold: 2,
  giantSentaiScale: 1,
  kyodaikaMultiplier: 2,
};

const RULE_HELP: Record<string, string> = {
  startEnergy: "Energy on turn 1",
  energyPerTurn: "Extra Energy each turn",
  maxEnergy: "Energy never goes above this",
  buyCost: "Price of a unit in the tavern",
  sellValue: "Energy back when selling",
  refreshCost: "Price of a Refresh",
  boardSize: "Units on the board",
  handSize: "Cards in hand",
  damageCap: "Most damage a loss can do, early on",
  damageCapUntilTurn: "The cap applies up to this turn",
  rollCallColors: "Different Sentai colours Roll Call needs",
  rollCallBuff: "Stats every Sentai gets when Roll Call fires",
  gattaiSize: "Adjacent Gattai units a Combine needs",
  giantEntryThreshold: "The Giant Robo joins when this many of your units (or fewer) are left",
  giantSentaiScale: "Share of your Sentai's total ATK/HP the Giant Robo gets (1 = all of it)",
  kyodaikaMultiplier: "Stat multiplier when a Kyodaika unit rises",
};

/** One row per rule: switch it on to override the default for this content version. */
export const RULE_ROWS: Row[] = Object.keys(RULE_DEFAULTS).map((key) => ({
  key,
  field: key === "giantSentaiScale" || key === "kyodaikaMultiplier" ? { kind: "num" as const } : { kind: "int" as const, min: 0 },
  optional: true,
  hint: `${RULE_HELP[key] ?? ""} (default ${RULE_DEFAULTS[key]})`,
}));

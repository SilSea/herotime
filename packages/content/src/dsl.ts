import {
  CardDef,
  Effect,
  FactionDef,
  GaugeDef,
  HeroDef,
  RelicDef,
  SeriesDef,
  type Action,
  type Condition,
  type KeywordKey,
  type SentaiColor,
  type Target,
  type Trigger,
} from "@herotime/shared";

/**
 * A short way to write content. Everything goes through the real zod schemas, so a typo in a
 * card fails the moment the module loads rather than in the middle of a match.
 */

// ------------------------------------------------------------------ actions
export const buff = (atk: number, hp: number, permanent = false): Action => ({ type: "BUFF", atk, hp, permanent });
export const summon = (cardKey: string, count = 1): Action => ({ type: "SUMMON", cardKey, count });
export const damage = (amount: number): Action => ({ type: "DAMAGE", amount });
export const give = (keyword: KeywordKey): Action => ({ type: "GIVE_KEYWORD", keyword });
export const transform = (into: string): Action => ({ type: "TRANSFORM", into });
export const destroy = (): Action => ({ type: "DESTROY" });
export const energy = (amount: number): Action => ({ type: "GAIN_ENERGY", amount });
export const gauge = (key: string, amount: number): Action => ({ type: "GAUGE_ADD", gauge: key, amount });
export const rule = (name: string, op: "SET" | "ADD" | "MUL", value: number): Action => ({ type: "MODIFY_RULE", rule: name, op, value });
export const toHand = (cardKey: string): Action => ({ type: "ADD_TO_HAND", cardKey });
export const discoverGiant = (): Action => ({ type: "DISCOVER_GIANT" });
export const superGattai = (atk = 4, hp = 4): Action => ({ type: "SUPER_GATTAI", atk, hp });
export const discoverUnit = (faction?: string): Action => (faction ? { type: "DISCOVER_UNIT", faction } : { type: "DISCOVER_UNIT" });

// ------------------------------------------------------------------ targets
export const self: Target = { selector: "SELF" };
export const summoned: Target = { selector: "SUMMONED" };
export const adjacent: Target = { selector: "ADJACENT" };
export const leftmost = (filter: { faction?: string; series?: string } = {}): Target => ({ selector: "LEFTMOST_FRIENDLY", ...filter });
export const rightmost = (filter: { faction?: string; series?: string } = {}): Target => ({ selector: "RIGHTMOST_FRIENDLY", ...filter });
export const randomAlly = (filter: { faction?: string; series?: string } = {}): Target => ({ selector: "RANDOM_FRIENDLY", ...filter });
/** The unit the player drops a gear on. */
export const chosen = (filter: { faction?: string; series?: string } = {}): Target => ({ selector: "CHOSEN_FRIENDLY", ...filter });
export const allAllies = (filter: { faction?: string; series?: string } = {}): Target => ({ selector: "ALL_FRIENDLY", ...filter });
export const leftmostFoe: Target = { selector: "LEFTMOST_ENEMY" };
export const randomFoe: Target = { selector: "RANDOM_ENEMY" };
export const allFoes: Target = { selector: "ALL_ENEMY" };

// --------------------------------------------------------------- conditions
export const teamUp = (colors: number): Condition => ({ type: "TEAM_UP_COLORS_GTE", value: colors });
export const factionCount = (faction: string, value: number): Condition => ({ type: "FACTION_COUNT_GTE", faction, value });
export const seriesCount = (series: string, value: number): Condition => ({ type: "SERIES_COUNT_GTE", series, value });
export const energyAtLeast = (value: number): Condition => ({ type: "ENERGY_GTE", value });

// ------------------------------------------------------------------ effects
interface EffectOptions {
  target?: Target;
  condition?: Condition;
  /** AVENGE only: every N friendly deaths. */
  every?: number;
  /** Golden units multiply numbers by this instead of 2. */
  golden?: number;
}

/** An effect owned by a unit. */
export function on(trigger: Trigger, actions: Action | Action[], o: EffectOptions = {}) {
  return Effect.parse({
    scope: "UNIT",
    trigger,
    actions: Array.isArray(actions) ? actions : [actions],
    ...(o.target ? { target: o.target } : {}),
    ...(o.condition ? { condition: o.condition } : {}),
    ...(o.every ? { every: o.every } : {}),
    ...(o.golden ? { goldenMultiplier: o.golden } : {}),
  });
}

/** An effect owned by the player: relics, hero powers, gear, series bonds. */
export function player(trigger: Trigger, actions: Action | Action[], o: EffectOptions = {}) {
  return Effect.parse({ ...on(trigger, actions, o), scope: "PLAYER" });
}

export const lastStand = (a: Action | Action[], o?: EffectOptions) => on("LAST_STAND", a, o);
export const startOfCombat = (a: Action | Action[], o?: EffectOptions) => on("START_OF_COMBAT", a, o);
export const deploy = (a: Action | Action[], o?: EffectOptions) => on("ON_PLAY", a, o);
export const endOfTurn = (a: Action | Action[], o?: EffectOptions) => on("END_OF_TURN", a, o);
export const onAttack = (a: Action | Action[], o?: EffectOptions) => on("ON_ATTACK", a, o);
export const afterDamaged = (a: Action | Action[], o?: EffectOptions) => on("AFTER_DAMAGED", a, o);
/** When another friendly unit is summoned (in either phase); target `summoned` is the newcomer. */
export const onSummon = (a: Action | Action[], o?: EffectOptions) => on("ALLY_SUMMONED", a, o);
export const avenge = (every: number, a: Action | Action[], o: EffectOptions = {}) => on("AVENGE", a, { ...o, every });
export const onHenshin = (a: Action | Action[], o?: EffectOptions) => on("HENSHIN", a, o);

// -------------------------------------------------------------------- cards
export interface UnitOptions {
  rank: number;
  atk: number;
  hp: number;
  factions?: string[];
  series?: string;
  colors?: SentaiColor[];
  keywords?: KeywordKey[];
  effects?: ReturnType<typeof on>[];
  /** Henshin(N): becomes `into` after `after` end-of-turns on the board. */
  henshin?: { after: number; into: string };
  /** Gattai core: leading a Gattai group, the group becomes this card. */
  gattaiInto?: string;
  /** Overrides the generated rules text. */
  text?: string;
  art?: string;
}

/** A shop unit. */
export function unit(key: string, name: string, o: UnitOptions) {
  return CardDef.parse({
    key,
    name,
    rank: o.rank,
    atk: o.atk,
    hp: o.hp,
    kind: "UNIT",
    factions: o.factions ?? [],
    colors: o.colors ?? [],
    keywords: o.keywords ?? [],
    effects: o.effects ?? [],
    ...(o.series ? { series: o.series } : {}),
    ...(o.henshin ? { henshin: { afterTurns: o.henshin.after, into: o.henshin.into } } : {}),
    ...(o.gattaiInto ? { gattaiInto: o.gattaiInto } : {}),
    ...(o.text !== undefined ? { text: o.text } : {}),
    ...(o.art ? { art: o.art } : {}),
  });
}

/** A unit that only exists by being summoned or transformed into: never in the shop. */
export function token(key: string, name: string, o: Omit<UnitOptions, "rank"> & { rank?: number }) {
  return CardDef.parse({ ...unit(key, name, { rank: 1, ...o }), token: true });
}

/** A Giant Robo: lives in the Giant Slot, never in the shop. */
export function giant(key: string, name: string, o: Omit<UnitOptions, "rank"> & { rank?: number }) {
  return CardDef.parse({ ...unit(key, name, { rank: 6, ...o }), kind: "GIANT", token: true });
}

/** A Gear card: spent from hand, runs its player effects. */
/** Gear sold in the tavern: offered from `rank` up, bought for `cost` Energy, used from the hand. */
export function shopGear(key: string, name: string, rank: number, cost: number, effects: ReturnType<typeof player>[], o: { factions?: string[]; text?: string; art?: string; costType?: "ENERGY" | "HEALTH" } = {}) {
  return CardDef.parse({ key, name, rank, atk: 0, hp: 1, kind: "GEAR", token: false, cost, effects, ...o });
}

export function gear(key: string, name: string, effects: ReturnType<typeof player>[], text = "") {
  return CardDef.parse({ key, name, rank: 1, atk: 0, hp: 1, kind: "GEAR", token: true, effects, text });
}

// ------------------------------------------------------------ other content
export const faction = (key: string, name: string, color: string, text = "", textTh = "") => FactionDef.parse({ key, name, color, text, textTh });

export const series = (
  key: string,
  name: string,
  o: { universe?: string; franchise?: string; text?: string; bonds?: { count: number; effects: ReturnType<typeof player>[] }[] } = {},
) => SeriesDef.parse({ key, name, ...o });

export const gaugeDef = (
  key: string,
  name: string,
  max: number,
  sources: { trigger: "ON_ROLL_CALL" | "ON_ROLL_CALL_WIN" | "HENSHIN"; amount: number }[],
  thresholds: { at: number; once?: boolean; reward: Action[] }[],
) => GaugeDef.parse({ key, name, max, sources, thresholds });

export const relic = (
  key: string,
  name: string,
  tier: "LESSER" | "GREATER",
  cost: number,
  effects: ReturnType<typeof player>[],
  o: { factions?: string[]; series?: string; weight?: number; text?: string } = {},
) => RelicDef.parse({ key, name, tier, cost, effects, ...o });

export const hero = (
  key: string,
  name: string,
  o: { armor?: number; text?: string; power?: { mode: "ACTIVE" | "ONCE" | "PASSIVE"; cost?: number; effects: ReturnType<typeof player>[] } } = {},
) => HeroDef.parse({ key, name, ...o });

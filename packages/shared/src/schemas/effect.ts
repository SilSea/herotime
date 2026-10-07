import { z } from "zod";

/** Engine keywords. Henshin(N) and Team-Up(k) are not keywords: see CardDef.henshin and Condition. */
export const KeywordKey = z.enum([
  "GUARD",
  "BARRIER",
  "RAPID",
  "LETHAL",
  "REVIVE",
  "RIDER_KICK",
  "FINAL_BLOW",
  "KYODAIKA",
  "GATTAI",
]);
export type KeywordKey = z.infer<typeof KeywordKey>;

export const SentaiColor = z.enum(["RED", "BLUE", "YELLOW", "GREEN", "PINK", "EXTRA"]);
export type SentaiColor = z.infer<typeof SentaiColor>;

/** Who owns an effect: a unit on the board, or the player (hero power, relic, series bond, gear). */
export const OwnerScope = z.enum(["UNIT", "PLAYER"]);
export type OwnerScope = z.infer<typeof OwnerScope>;

export const Trigger = z.enum([
  // unit effects
  "ON_PLAY", // Henshin Call: unit placed on the board (also: a Gear card being used)
  "END_OF_TURN",
  "HENSHIN", // the unit transformed (also a Gauge source: any friendly Henshin)
  "START_OF_COMBAT",
  "ON_ATTACK",
  "AFTER_DAMAGED",
  "LAST_STAND",
  "AVENGE",
  "ALLY_SUMMONED", // another friendly unit was summoned (recruit or fight); target SUMMONED is that unit
  // player effects
  "ON_ACQUIRE", // relic picked / hero chosen: runs once, rules it sets persist
  "ON_TURN_START",
  "ON_USE", // hero power activated
  // gauge sources
  "ON_ROLL_CALL",
  "ON_ROLL_CALL_WIN",
]);
export type Trigger = z.infer<typeof Trigger>;

export const Condition = z.discriminatedUnion("type", [
  /** Distinct Sentai colors on the board (Extra is a wildcard) >= value. */
  z.object({ type: z.literal("TEAM_UP_COLORS_GTE"), value: z.number().int().min(1).max(6) }),
  z.object({ type: z.literal("FACTION_COUNT_GTE"), faction: z.string(), value: z.number().int().min(1) }),
  z.object({ type: z.literal("SERIES_COUNT_GTE"), series: z.string(), value: z.number().int().min(1) }),
  z.object({ type: z.literal("ENERGY_GTE"), value: z.number().int().min(0) }),
]);
export type Condition = z.infer<typeof Condition>;

export const Selector = z.enum([
  "SELF",
  "ADJACENT",
  "LEFTMOST_FRIENDLY",
  "RIGHTMOST_FRIENDLY",
  "RANDOM_FRIENDLY",
  "ALL_FRIENDLY",
  /** The friendly unit the player picks when using gear; anywhere else (or with no pick) the leftmost match. */
  "CHOSEN_FRIENDLY",
  /** ALLY_SUMMONED only: the unit that was just summoned. */
  "SUMMONED",
  "LEFTMOST_ENEMY",
  "RANDOM_ENEMY",
  "ALL_ENEMY",
]);
export type Selector = z.infer<typeof Selector>;

export const Target = z.object({
  selector: Selector,
  /** Only friendly selectors: restrict to units with this faction / series. */
  faction: z.string().optional(),
  series: z.string().optional(),
});
export type Target = z.infer<typeof Target>;

const amount = z.number().int();

export const Action = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("BUFF"),
    atk: amount.default(0),
    hp: amount.default(0),
    /** Recruit: always sticks. Combat: only persists after the fight when true. */
    permanent: z.boolean().default(false),
  }),
  z.object({ type: z.literal("SUMMON"), cardKey: z.string(), count: z.number().int().min(1).default(1) }),
  z.object({ type: z.literal("DAMAGE"), amount: z.number().int().min(1) }),
  z.object({ type: z.literal("GIVE_KEYWORD"), keyword: KeywordKey }),
  z.object({ type: z.literal("TRANSFORM"), into: z.string() }),
  z.object({ type: z.literal("DESTROY") }),
  z.object({ type: z.literal("GAIN_ENERGY"), amount }),
  z.object({ type: z.literal("GAUGE_ADD"), gauge: z.string(), amount }),
  z.object({
    type: z.literal("MODIFY_RULE"),
    rule: z.string(),
    op: z.enum(["SET", "ADD", "MUL"]),
    value: z.number(),
  }),
  z.object({ type: z.literal("ADD_TO_HAND"), cardKey: z.string() }),
  /** Offer 3 Giant Robos; the one whose series has most units on the board is guaranteed. */
  z.object({ type: z.literal("DISCOVER_GIANT") }),
  /** Recruit only: Discover a unit from the pool (up to your tavern rank), of one faction when given. */
  z.object({ type: z.literal("DISCOVER_UNIT"), faction: z.string().optional() }),
  /**
   * Recruit only (a gauge reward): Super Gattai. From now on, in every fight where an Extra Ranger is on the
   * board, the Giant Robo gets +atk/+hp and the keywords of those Extra Rangers. Stacks if granted again.
   */
  z.object({ type: z.literal("SUPER_GATTAI"), atk: amount.default(4), hp: amount.default(4) }),
]);
export type Action = z.infer<typeof Action>;

export const Effect = z.object({
  scope: OwnerScope.default("UNIT"),
  trigger: Trigger,
  /** AVENGE only: fire every N friendly deaths (default 1). */
  every: z.number().int().min(1).optional(),
  condition: Condition.optional(),
  target: Target.optional(),
  actions: z.array(Action).min(1),
  /** Golden units multiply numeric action amounts by this (default 2). */
  goldenMultiplier: z.number().positive().optional(),
});
export type Effect = z.infer<typeof Effect>;

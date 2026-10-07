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
  /** While this is on your board, your Deploy (ON_PLAY) effects happen twice. */
  "ECHO",
]);
export type KeywordKey = z.infer<typeof KeywordKey>;

export const SentaiColor = z.enum(["RED", "BLUE", "YELLOW", "GREEN", "PINK", "EXTRA"]);
export type SentaiColor = z.infer<typeof SentaiColor>;

/** Who owns an effect: a unit on the board, or the player (hero power, relic, series bond, gear). */
export const OwnerScope = z.enum(["UNIT", "PLAYER"]);
export type OwnerScope = z.infer<typeof OwnerScope>;

export const Trigger = z.enum([
  // unit effects
  "ON_PLAY", // Deploy: unit placed on the board (also: a Gear card being used)
  "END_OF_TURN",
  "HENSHIN", // the unit transformed: runs the effects of the card it was (also a Gauge source: any friendly Henshin)
  "START_OF_COMBAT",
  "ON_ATTACK",
  "AFTER_DAMAGED",
  "LAST_STAND",
  "AVENGE",
  "ALLY_SUMMONED", // another friendly unit was summoned (recruit or fight); target SUMMONED is that unit
  "ON_SELL", // the unit is sold (from the board or the hand), just before it leaves
  "ON_DISCARD", // the card was discarded from the hand by another card's DISCARD
  // player effects
  "ON_ACQUIRE", // relic picked / hero chosen: runs once, rules it sets persist
  "ON_TURN_START", // also units on the board
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
  /** A friendly unit is one of these cards (or a form one of them turned into). */
  z.object({ type: z.literal("HAS_CARD"), cards: z.array(z.string()).min(1) }),
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
  /** The Giant Robo in the Giant Slot (in a fight: once it has entered). */
  "GIANT_SLOT",
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
  /** Only units that are one of these cards (or a form one of them turned into). */
  cards: z.array(z.string()).min(1).optional(),
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
    /** Also give the unit's own current ATK/HP (on top of atk/hp) to the targets other than itself. A player effect has no unit: nothing extra. */
    fromSelf: z.boolean().optional(),
  }),
  /**
   * Destroy every other friendly unit (not the one with the effect, not the Giant), then give the targets
   * their total ATK/HP. Recruit: for good. Combat: for the fight, or for good with `permanent`.
   */
  z.object({ type: z.literal("CONSUME_ALLIES"), permanent: z.boolean().default(false) }),
  /**
   * A copy of each target: onto the board right of it, or into the hand. Base card by default; `withBuffs`
   * keeps its Final Form, bonuses and keywords. Copies are new cards (never from the pool) and count for triples.
   * Fight: BOARD summons the copy for that fight (enemies can be copied too); HAND arrives next turn as the base card.
   */
  z.object({ type: z.literal("COPY"), to: z.enum(["BOARD", "HAND"]).default("BOARD"), withBuffs: z.boolean().default(false) }),
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
  /**
   * Recruit only: a random card into the hand. GEAR = one of the tavern gears up to your rank (not pooled);
   * UNIT = a unit from the pool up to your rank. Optionally of one faction.
   */
  z.object({ type: z.literal("RANDOM_CARD"), cardKind: z.enum(["UNIT", "GEAR"]).default("GEAR"), faction: z.string().optional() }),
  /** Recruit only: each target becomes its card's `ultimateInto` form (keeping its bonuses); others are unchanged. */
  z.object({ type: z.literal("ULTIMATE_FORM") }),
  /** Recruit only: from now on, units in your tavern have +atk/+hp (they keep it when bought). Stacks. */
  z.object({ type: z.literal("BUFF_SHOP"), atk: amount.default(1), hp: amount.default(1) }),
  /** For the rest of the game, every Gear this player uses that gives stats gives this much more. */
  z.object({ type: z.literal("BUFF_GEAR"), atk: amount.default(1), hp: amount.default(1) }),
  /**
   * Recruit only: eat a random unit from your tavern; each target gains its ATK/HP for good. Only units of
   * of `faction` can be eaten when it is set.
   */
  z.object({
    type: z.literal("DEVOUR_SHOP"),
    /** Which tavern unit: a random one, the one with the most ATK+HP, or the one with the least. */
    choose: z.enum(["RANDOM", "STRONGEST", "WEAKEST"]).default("RANDOM"),
    faction: z.string().optional(),
  }),
  /**
   * Recruit only: discard `count` cards from your hand (random, or the leftmost / rightmost), optionally only units
   * or only gear. Each discarded card runs its ON_DISCARD effects; pooled units go back to the pool.
   */
  z.object({
    type: z.literal("DISCARD"),
    count: z.number().int().min(1).default(1),
    pick: z.enum(["RANDOM", "LEFTMOST", "RIGHTMOST"]).default("RANDOM"),
    cardKind: z.enum(["ANY", "UNIT", "GEAR"]).default("ANY"),
  }),
  /**
   * Summon units from your hand (no Deploy). Recruit: a random unit card leaves the hand for the board.
   * Fight: a copy of a random unit card in your hand joins the fight (the card stays in hand).
   */
  z.object({ type: z.literal("SUMMON_FROM_HAND"), count: z.number().int().min(1).default(1) }),
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
  /** How many times the whole effect happens each time it fires (default 1). */
  repeat: z.number().int().min(1).max(5).optional(),
  /**
   * Fire at most `times` times per turn or per game (per unit for a unit's effect, per source for a relic,
   * hero or gear). In a fight, both count per fight. A firing whose condition fails does not use one up.
   */
  limit: z.object({ times: z.number().int().min(1), per: z.enum(["TURN", "GAME"]) }).optional(),
});
export type Effect = z.infer<typeof Effect>;

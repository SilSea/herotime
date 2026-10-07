import { z } from "zod";
import { Action, Effect, KeywordKey, SentaiColor } from "./effect.js";

export const CardKind = z.enum(["UNIT", "GEAR", "GIANT"]);
export type CardKind = z.infer<typeof CardKind>;

export const CardDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  /** Pool rank 1-6. Gear and Giants are never pooled, so rank is informational for them. */
  rank: z.number().int().min(1).max(6),
  atk: z.number().int().min(0),
  hp: z.number().int().min(1),
  kind: CardKind.default("UNIT"),
  series: z.string().optional(),
  factions: z.array(z.string()).default([]),
  colors: z.array(SentaiColor).default([]),
  keywords: z.array(KeywordKey).default([]),
  effects: z.array(Effect).default([]),
  /** Henshin(N): after N end-of-turns on the board, transform into `into`. */
  henshin: z.object({ afterTurns: z.number().int().min(1), into: z.string() }).optional(),
  /** Tokens (summoned/transformed-into) are never put in the shop pool. */
  token: z.boolean().default(false),
  /** Rules text shown on the card (the engine never reads it). */
  text: z.string().default(""),
  /** The same in Thai; empty = generated from the effects, or the English text when that was written by hand. */
  textTh: z.string().default(""),
  /** Image path or URL, resolved by the client. */
  art: z.string().optional(),
  /**
   * Gattai core: when this unit is the leftmost of a Gattai group, the group becomes this card (in combat, or
   * for good with COMBINE). The result has this card's stats plus the parts' stats, its effects, and all keywords.
   */
  gattaiInto: z.string().optional(),
  /** Tavern price of Gear sold in the shop (not a token). Units always use the standard buy cost. */
  cost: z.number().int().min(0).optional(),
  /** What the gear price is paid with: Energy, or the hero's Health (which can never take you to 0). */
  costType: z.enum(["ENERGY", "HEALTH"]).default("ENERGY"),
});
export type CardDef = z.infer<typeof CardDef>;

/** A tribe. Matches use a random subset of these (see MatchConfig.factionsPerMatch). */
export const FactionDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  /** CSS colour used for the faction badge. */
  color: z.string().default("#888888"),
  text: z.string().default(""),
  textTh: z.string().default(""),
});
export type FactionDef = z.infer<typeof FactionDef>;

export const SeriesDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  /** Universe the franchise belongs to, e.g. "tokusatsu", "anime" (the top of Universe -> Franchise -> Series). */
  universe: z.string().optional(),
  /** Franchise this series belongs to, e.g. "super-sentai", "kamen-rider", "original". */
  franchise: z.string().optional(),
  text: z.string().default(""),
  /** Series Bond: at `count` units of this series on the board, the effects apply at combat start. */
  bonds: z
    .array(z.object({ count: z.number().int().min(2), effects: z.array(Effect).min(1) }))
    .default([]),
});
export type SeriesDef = z.infer<typeof SeriesDef>;

export const GaugeDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  max: z.number().int().min(1),
  sources: z
    .array(
      z.object({
        trigger: z.enum(["ON_ROLL_CALL", "ON_ROLL_CALL_WIN", "HENSHIN"]),
        amount: z.number().int().min(1),
      }),
    )
    .default([]),
  thresholds: z
    .array(
      z.object({
        at: z.number().int().min(1),
        /** Once per game by default. */
        once: z.boolean().default(true),
        reward: z.array(Action).min(1),
      }),
    )
    .default([]),
});
export type GaugeDef = z.infer<typeof GaugeDef>;

export const RelicDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  tier: z.enum(["LESSER", "GREATER"]),
  cost: z.number().int().min(0),
  factions: z.array(z.string()).default([]),
  series: z.string().optional(),
  weight: z.number().int().min(0).default(100),
  effects: z.array(Effect).default([]),
  text: z.string().default(""),
  textTh: z.string().default(""),
  art: z.string().optional(),
});
export type RelicDef = z.infer<typeof RelicDef>;

export const HeroDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  armor: z.number().int().min(0).default(0),
  text: z.string().default(""),
  textTh: z.string().default(""),
  art: z.string().optional(),
  power: z
    .object({
      /** ACTIVE: once per turn. ONCE: once per game. PASSIVE: only ON_ACQUIRE effects. */
      mode: z.enum(["ACTIVE", "ONCE", "PASSIVE"]),
      cost: z.number().int().min(0).default(0),
      effects: z.array(Effect).min(1),
    })
    .optional(),
});
export type HeroDef = z.infer<typeof HeroDef>;

const count = z.number().int().min(0);
/**
 * Game-wide rule numbers for this content version. Anything left out keeps the engine default.
 * Relics, heroes and cards can still change them per player with MODIFY_RULE.
 */
export const ContentRules = z
  .object({
    startEnergy: count,
    energyPerTurn: count,
    maxEnergy: count.min(1),
    buyCost: count,
    sellValue: count,
    refreshCost: count,
    boardSize: count.min(1).max(12),
    handSize: count.min(1).max(20),
    damageCap: count,
    damageCapUntilTurn: count,
    rollCallColors: count.min(1).max(6),
    rollCallBuff: count,
    gattaiSize: count.min(2).max(7),
    giantEntryThreshold: count.max(7),
    giantSentaiScale: z.number().min(0).max(3),
    kyodaikaMultiplier: z.number().min(1).max(5),
  })
  .partial()
  .strict();
export type ContentRules = z.infer<typeof ContentRules>;

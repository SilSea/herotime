import { z } from "zod";
import { Action, Effect, KeywordKey, SentaiColor } from "./effect.js";

// ------------------------------------------------------------------ sounds

/** Game moments that can have their own sound (uploaded in the Admin); without one the built-in sound plays. */
export const SOUND_SLOTS = [
  // tavern
  "buy", "buyGear", "sell", "refresh", "freeze", "upgrade", "denied",
  // board
  "play", "gear", "triple", "combine", "transform", "discover", "relic", "heroPower", "discard",
  // fight
  "attack", "hit", "barrier", "death", "summon", "kyodaika", "giant", "rollcall",
  // results
  "roundWin", "roundLose", "eliminated", "endWin", "endTop4", "endOther",
  // general
  "turnStart", "timeLow", "click",
] as const;
export type SoundSlot = (typeof SOUND_SLOTS)[number];

/** Background music, by where the player is. */
export const MUSIC_SLOTS = ["lobby", "recruit", "battle", "endWin", "endLose"] as const;
export type MusicSlot = (typeof MUSIC_SLOTS)[number];

/** An uploaded audio file (the name the upload returned) and how loud it plays (0-1). */
export const SoundRef = z.object({ file: z.string().min(1), volume: z.number().min(0).max(1).default(1) });
export type SoundRef = z.infer<typeof SoundRef>;

export const SoundsDef = z.object({
  slots: z.record(z.string(), SoundRef).default({}),
  music: z.record(z.string(), SoundRef).default({}),
});
export type SoundsDef = z.infer<typeof SoundsDef>;

/** A card's or faction's own sounds (file names); they win over the game-wide slots. */
export const CardSounds = z
  .object({ play: z.string().optional(), attack: z.string().optional(), death: z.string().optional(), transform: z.string().optional() })
  .strict();
export type CardSounds = z.infer<typeof CardSounds>;

export const CardKind = z.enum(["UNIT", "GEAR", "GIANT"]);
export type CardKind = z.infer<typeof CardKind>;

/**
 * How a picture sits in its frame: the point (0-100 % across / down) kept in view, and the zoom (1 = fill the
 * frame). Only the client reads it.
 */
export const ArtCrop = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), zoom: z.number().min(1).max(4) });
export type ArtCrop = z.infer<typeof ArtCrop>;

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
  /** How the picture sits in the card's frame. */
  artCrop: ArtCrop.optional(),
  /**
   * Gattai core: when this unit is the leftmost of a Gattai group, the group becomes this card (in combat, or
   * for good with COMBINE). The result has this card's stats plus the parts' stats, its effects, and all keywords.
   */
  gattaiInto: z.string().optional(),
  /** The form ULTIMATE_FORM turns this unit into (e.g. a Rider's series-specific final form). */
  ultimateInto: z.string().optional(),
  /**
   * A form of another card that is reached some other way (e.g. a Gear that TRANSFORMs into it): a target or
   * condition naming that card also counts this one, like a Henshin or Final Form of it.
   */
  formOf: z.string().optional(),
  /** This card's own sounds (played / attacks / dies / transforms into it). */
  sounds: CardSounds.optional(),
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
  /** false: matches never use this faction, so its cards stay out of the tavern (neutral cards still play). */
  enabled: z.boolean().optional(),
  /** Sounds for every card of this faction that has none of its own. */
  sounds: CardSounds.optional(),
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
  artCrop: ArtCrop.optional(),
  /** false: never offered (missing = in play). */
  enabled: z.boolean().optional(),
});
export type RelicDef = z.infer<typeof RelicDef>;

export const HeroDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  armor: z.number().int().min(0).default(0),
  /** The series this hero comes from (shown with the hero; it does not change what the power does). */
  series: z.string().optional(),
  text: z.string().default(""),
  textTh: z.string().default(""),
  art: z.string().optional(),
  artCrop: ArtCrop.optional(),
  /** false: never offered at hero select (missing = in play). */
  enabled: z.boolean().optional(),
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
    heroCardWeight: z.number().min(1).max(10),
  })
  .partial()
  .strict();
export type ContentRules = z.infer<typeof ContentRules>;

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
});
export type CardDef = z.infer<typeof CardDef>;

export const SeriesDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
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
});
export type RelicDef = z.infer<typeof RelicDef>;

export const HeroDef = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  armor: z.number().int().min(0).default(0),
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

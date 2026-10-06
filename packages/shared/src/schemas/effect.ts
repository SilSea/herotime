import { z } from "zod";

/** Who owns an effect: a unit on the board, or the player (hero power, relic). */
export const OwnerScope = z.enum(["UNIT", "PLAYER"]);

export const Trigger = z.enum([
  // unit triggers
  "ON_PLAY",
  "LAST_STAND",
  "ON_ATTACK",
  "AFTER_DAMAGED",
  "START_OF_COMBAT",
  "END_OF_TURN",
  "ON_BUY",
  "ON_SELL",
  "AVENGE",
  "HENSHIN",
  // player-level triggers
  "ON_TURN_START",
  "ON_REFRESH",
  "ON_ROLL_CALL",
  "ON_GAUGE_CHANGE",
]);

export const Condition = z.object({
  type: z.string(),
  value: z.number().optional(),
});

export const Target = z.object({
  selector: z.string(),
  tribe: z.string().optional(),
});

export const Action = z
  .object({
    type: z.enum([
      "BUFF",
      "SUMMON",
      "DAMAGE",
      "GIVE_KEYWORD",
      "TRANSFORM",
      "GAIN_ENERGY",
      "DISCOVER",
      "ADD_TO_HAND",
      "DESTROY",
      "STEAL_STATS",
      "MERGE",
      "GAUGE_ADD",
      "MODIFY_RULE",
    ]),
  })
  .passthrough();

export const Effect = z.object({
  scope: OwnerScope.default("UNIT"),
  trigger: Trigger,
  condition: Condition.optional(),
  target: Target.optional(),
  actions: z.array(Action).min(1),
  goldenMultiplier: z.number().positive().optional(),
});

export type Effect = z.infer<typeof Effect>;
export type Trigger = z.infer<typeof Trigger>;

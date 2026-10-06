import { z } from "zod";

/** Slot indexes are small; the engine enforces the real limits, this only rejects absurd input early. */
const slot = z.number().int().min(0).max(99);

/**
 * Everything a client may ask the server to do. Every message from the network is parsed with this
 * before it reaches the engine. `.strict()` rejects unknown fields so typos fail loudly.
 */
export const IntentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CHOOSE_HERO"), index: slot }).strict(),
  z.object({ type: z.literal("BUY"), index: slot }).strict(),
  z.object({ type: z.literal("SELL"), from: z.enum(["board", "hand"]), index: slot }).strict(),
  z.object({ type: z.literal("PLAY"), handIndex: slot, position: slot }).strict(),
  z.object({ type: z.literal("REORDER"), from: slot, to: slot }).strict(),
  z.object({ type: z.literal("REFRESH") }).strict(),
  z.object({ type: z.literal("FREEZE") }).strict(),
  z.object({ type: z.literal("UPGRADE") }).strict(),
  z.object({ type: z.literal("USE_GEAR"), handIndex: slot }).strict(),
  z.object({ type: z.literal("HERO_POWER") }).strict(),
  z.object({ type: z.literal("PICK_DISCOVER"), index: slot }).strict(),
  z.object({ type: z.literal("CHOOSE_RELIC"), index: slot }).strict(),
  z.object({ type: z.literal("READY") }).strict(),
]);
export type IntentInput = z.infer<typeof IntentSchema>;

export const Username = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[A-Za-z0-9_]+$/, "letters, digits and underscore only");

export const RegisterSchema = z
  .object({
    username: Username,
    email: z.string().email().max(120),
    password: z.string().min(8).max(100),
  })
  .strict();

export const LoginSchema = z
  .object({ username: Username, password: z.string().min(1).max(100) })
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

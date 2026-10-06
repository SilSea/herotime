import { randomBytes } from "node:crypto";
import type { MatchConfig } from "@herotime/engine";

export interface ServerConfig {
  port: number;
  host: string;
  production: boolean;
  jwtSecret: string;
  jwtTtl: string;
  /** `true` reflects any origin (dev only); otherwise an explicit allow-list. */
  corsOrigin: true | string[];
  bcryptCost: number;
  lobby: { matchSize: number; fillAfterMs: number };
  /** Per IP (register) or per IP+username (login), per minute. */
  authLimits: { registerPerMin: number; loginPerMin: number };
  match: Partial<MatchConfig>;
  /** Unset = run with in-memory storage (fine for local play, nothing survives a restart). */
  databaseUrl: string | undefined;
}

type Env = Record<string, string | undefined>;

const int = (v: string | undefined, fallback: number): number => {
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`expected a non-negative integer, got "${v}"`);
  return n;
};

export function loadConfig(env: Env = process.env, warn: (msg: string) => void = console.warn): ServerConfig {
  const production = env.NODE_ENV === "production";

  let jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    if (production) throw new Error("JWT_SECRET must be set in production");
    jwtSecret = randomBytes(32).toString("hex");
    warn("JWT_SECRET not set: using a random one, so logins will not survive a restart");
  } else if (jwtSecret.length < 32) {
    if (production) throw new Error("JWT_SECRET must be at least 32 characters");
    warn("JWT_SECRET is shorter than 32 characters; fine for development only");
  }

  let corsOrigin: ServerConfig["corsOrigin"] = true;
  if (env.CORS_ORIGIN) corsOrigin = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  else if (production) throw new Error("CORS_ORIGIN must be set in production");

  // HEROTIME_FAST=1 squeezes every timer so a full match plays out in about a minute (dev and e2e).
  const fast = env.HEROTIME_FAST === "1";
  const match: Partial<MatchConfig> = fast
    ? { heroSelectMs: 3_000, recruitBaseMs: 4_000, recruitStepMs: 500, recruitMaxMs: 8_000, relicBonusMs: 1_000, battleMs: 2_000 }
    : {};

  return {
    port: int(env.PORT, 3000),
    host: env.HOST ?? "0.0.0.0",
    production,
    jwtSecret,
    jwtTtl: env.JWT_TTL ?? "7d",
    corsOrigin,
    bcryptCost: int(env.BCRYPT_COST, 10),
    lobby: { matchSize: 8, fillAfterMs: int(env.LOBBY_FILL_MS, fast ? 1_000 : 20_000) },
    authLimits: { registerPerMin: int(env.REGISTER_PER_MIN, 10), loginPerMin: int(env.LOGIN_PER_MIN, 10) },
    match,
    databaseUrl: env.DATABASE_URL || undefined,
  };
}

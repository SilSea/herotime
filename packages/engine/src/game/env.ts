import { DEFAULT_CONFIG, type GameConfig } from "../config.js";
import type { Content } from "../content.js";
import type { Rng } from "../rng/rng.js";
import type { Pool } from "../shop/pool.js";

/** Everything the game layer needs besides the player: one lobby's content, pool and RNG. */
export interface GameEnv {
  content: Content;
  pool: Pool;
  rng: Rng;
  cfg: GameConfig;
  /** Factions this match uses. Undefined = no restriction (content without factions). */
  activeFactions?: ReadonlySet<string>;
  /** Series that have at least one card in this match's pool. Undefined = no restriction. */
  activeSeries?: ReadonlySet<string>;
}

export function makeEnv(parts: Omit<GameEnv, "cfg"> & { cfg?: GameConfig }): GameEnv {
  return { cfg: DEFAULT_CONFIG, ...parts };
}

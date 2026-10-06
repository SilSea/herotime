/** Timings and limits of one match (all milliseconds). See docs/RULES.md section 1.1. */
export interface MatchConfig {
  heroSelectMs: number;
  recruitBaseMs: number;
  recruitStepMs: number;
  recruitMaxMs: number;
  /** Extra recruit time on turns where relics are offered. */
  relicBonusMs: number;
  battleMs: number;
  relicTurns: { LESSER: number; GREATER: number };
  startHp: number;
  /** A player is not paired with the same opponent again within this many rounds (if avoidable). */
  noRepeatRounds: number;
  /** Safety net: after this many turns the match ends and survivors are ranked by HP. */
  maxTurns: number;
  /** Heroes offered at hero select. */
  heroChoices: number;
  /** Random factions used per match (0 or more than exist = all). Ignored if the content declares none. */
  factionsPerMatch: number;
  /**
   * Whether READY from every human ends recruit early. Off by default: the rules say every turn runs its
   * full clock so all players start the next one together. Tests turn it on to move quickly.
   */
  readyEndsRecruit: boolean;
  /** Force exactly these factions (for testing a matchup). Overrides factionsPerMatch. */
  fixedFactions?: string[];
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  heroSelectMs: 30_000,
  recruitBaseMs: 40_000,
  recruitStepMs: 5_000,
  recruitMaxMs: 75_000,
  relicBonusMs: 10_000,
  battleMs: 20_000,
  relicTurns: { LESSER: 5, GREATER: 9 },
  startHp: 30,
  noRepeatRounds: 3,
  maxTurns: 40,
  heroChoices: 2,
  factionsPerMatch: 5,
  readyEndsRecruit: false,
};

/** Recruit-phase length for a turn: 40s, +5s each turn, capped at 75s. */
export function recruitDuration(turn: number, cfg: MatchConfig): number {
  const base = Math.min(cfg.recruitBaseMs + (turn - 1) * cfg.recruitStepMs, cfg.recruitMaxMs);
  const relic = turn === cfg.relicTurns.LESSER || turn === cfg.relicTurns.GREATER;
  return base + (relic ? cfg.relicBonusMs : 0);
}

import type { StatRow } from "../persistence/repositories.js";

/** Average place of a random player in an 8-player match. */
export const EXPECTED_PLACE = 4.5;
/** Fewer holders than this and the numbers are noise: keep the weight. */
export const MIN_SAMPLES = 5;

export interface WeightSuggestion {
  key: string;
  weight: number;
  suggested: number;
  /** Holders the suggestion is based on (0 = not enough data, weight kept). */
  samples: number;
}

/**
 * Relic weights the statistics suggest: a relic whose holders place better than average is offered less
 * often, one whose holders place worse is offered more. Each place of difference moves the weight by 15%,
 * within half to one and a half of the current weight.
 */
export function suggestRelicWeights(relics: readonly { key: string; weight: number }[], rows: readonly StatRow[]): WeightSuggestion[] {
  return relics.map((r) => {
    const row = rows.find((x) => x.key === r.key);
    if (!row || row.count < MIN_SAMPLES) return { key: r.key, weight: r.weight, suggested: r.weight, samples: row?.count ?? 0 };
    const factor = Math.min(1.5, Math.max(0.5, 1 + (row.avgPlacement - EXPECTED_PLACE) * 0.15));
    return { key: r.key, weight: r.weight, suggested: Math.max(1, Math.round(r.weight * factor)), samples: row.count };
  });
}

import { DEFAULT_CONFIG, type GameConfig } from "../config.js";
import type { Rng } from "../rng/rng.js";
import type { Unit } from "../content.js";
import { RuleError, type PlayerState } from "./economy.js";
import { withRules } from "../rules.js";
import type { Pool } from "./pool.js";

export interface TripleResult {
  key: string;
  /** Cards offered by the Discover this triple earned (empty if the pool had none). */
  offer: string[];
}

const DISCOVER_SIZE = 3;
const REDRAW_ATTEMPTS = 20;

/** First card key (board before hand) the player holds 3+ plain copies of. */
function findTripleKey(player: PlayerState): string | undefined {
  const counts = new Map<string, number>();
  for (const zone of [player.board, player.hand]) {
    for (const u of zone) {
      if (u.golden || u.components) continue; // a combined Gattai form is never part of a triple
      const n = (counts.get(u.key) ?? 0) + 1;
      if (n >= 3) return u.key;
      counts.set(u.key, n);
    }
  }
  return undefined;
}

/** Up to 3 distinct cards of exactly `rank`, drawn from the pool (unpicked ones go back on choose). */
function drawOffer(pool: Pool, rng: Rng, rank: number): string[] {
  const offer: string[] = [];
  for (let attempts = 0; offer.length < DISCOVER_SIZE && attempts < REDRAW_ATTEMPTS; attempts++) {
    const key = pool.draw(rng, rank, rank);
    if (key === undefined) break;
    if (offer.includes(key)) {
      pool.give(key); // duplicate: put it back and try again
    } else {
      offer.push(key);
    }
  }
  return offer;
}

/**
 * Merge every set of 3 plain copies into one Final Form (golden) and queue a
 * Discover of rank+1. The golden takes the slot of the first merged copy, so a
 * merge never needs extra hand space. Call after anything that adds a unit.
 */
export function resolveTriples(
  player: PlayerState,
  pool: Pool,
  rng: Rng,
  cfg: GameConfig = DEFAULT_CONFIG,
): TripleResult[] {
  const results: TripleResult[] = [];

  for (let key = findTripleKey(player); key !== undefined; key = findTripleKey(player)) {
    let removed = 0;
    let anchor: { zone: Unit[]; index: number } | undefined;
    for (const zone of [player.board, player.hand]) {
      for (let i = 0; i < zone.length && removed < 3; ) {
        const u = zone[i] as Unit;
        if (u.key === key && !u.golden) {
          zone.splice(i, 1);
          anchor ??= { zone, index: i };
          removed++;
        } else {
          i++;
        }
      }
    }
    if (!anchor) throw new Error("unreachable: findTripleKey guarantees 3 copies");
    anchor.zone.splice(anchor.index, 0, { key, golden: true });

    const offer = drawOffer(pool, rng, Math.min(player.rank + 1, cfg.maxRank));
    if (offer.length > 0) player.discovers.push({ options: offer, destination: "HAND" });
    results.push({ key, offer });
  }

  return results;
}

/**
 * Take one card from the oldest Discover offer. HAND offers put it in hand and return the rest to
 * the pool; GIANT offers fill the Giant Slot (Giants are never pooled, so nothing is returned).
 */
export function chooseDiscover(
  player: PlayerState,
  index: number,
  pool: Pool,
  cfg: GameConfig = DEFAULT_CONFIG,
): string {
  const offer = player.discovers[0];
  if (offer === undefined) throw new RuleError("no discover pending");
  const key = offer.options[index];
  if (key === undefined) throw new RuleError(`no discover option ${index}`);

  if (offer.destination === "GIANT") {
    player.discovers.shift();
    player.giant = { key, golden: false };
    return key;
  }

  if (player.hand.length >= withRules(player, cfg).handSize) throw new RuleError("hand is full");
  player.discovers.shift();
  offer.options.forEach((k, i) => {
    if (i !== index) pool.give(k);
  });
  player.hand.push({ key, golden: false });
  return key;
}

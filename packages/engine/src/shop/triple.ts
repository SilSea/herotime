import { DEFAULT_CONFIG, type GameConfig } from "../config.js";
import type { Rng } from "../rng/rng.js";
import { recordBuff, type Unit } from "../content.js";
import { noteMoment, RuleError, type PlayerState } from "./economy.js";
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

/** The Golden unit keeps everything the copies earned: their permanent stats, granted keywords and Henshin progress. */
function mergeCopies(key: string, copies: readonly Unit[]): Unit {
  const golden: Unit = { key, golden: true };
  const atk = copies.reduce((n, u) => n + (u.bonusAtk ?? 0), 0);
  const hp = copies.reduce((n, u) => n + (u.bonusHp ?? 0), 0);
  if (atk) golden.bonusAtk = atk;
  if (hp) golden.bonusHp = hp;
  const keywords = [...new Set(copies.flatMap((u) => u.keywords ?? []))];
  if (keywords.length > 0) golden.keywords = keywords;
  const unpooled = copies.reduce((n, u) => n + (u.unpooled ?? 0), 0);
  if (unpooled) golden.unpooled = unpooled;
  const turns = Math.max(0, ...copies.map((u) => u.turns ?? 0));
  if (turns) golden.turns = turns;
  for (const u of copies) {
    for (const b of u.buffs ?? []) {
      recordBuff(golden, b, b.atk, b.hp);
      for (const k of b.keywords ?? []) recordBuff(golden, b, 0, 0, k);
    }
  }
  return golden;
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
 * The triple reward: a Discover of `target` rank. When the pool has nothing of that rank (a small card
 * set, or every copy bought), the nearest rank that does is used instead, lower ranks first, so a
 * triple always pays out while any unit is left in the pool.
 */
function rewardOffer(pool: Pool, rng: Rng, target: number, maxRank: number): string[] {
  const ranks: number[] = [];
  for (let r = target; r >= 1; r--) ranks.push(r);
  for (let r = target + 1; r <= maxRank; r++) ranks.push(r);
  for (const rank of ranks) {
    const offer = drawOffer(pool, rng, rank);
    if (offer.length > 0) return offer;
  }
  return [];
}

/**
 * Merge every set of 3 plain copies into one Golden unit and queue a
 * Discover of rank+1 (or the nearest rank with cards). The golden takes the slot of the first merged copy, so a
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
    const merged: Unit[] = [];
    let anchor: { zone: Unit[]; index: number } | undefined;
    for (const zone of [player.board, player.hand]) {
      for (let i = 0; i < zone.length && merged.length < 3; ) {
        const u = zone[i] as Unit;
        if (u.key === key && !u.golden && !u.components) {
          zone.splice(i, 1);
          anchor ??= { zone, index: i };
          merged.push(u);
        } else {
          i++;
        }
      }
    }
    if (!anchor) throw new Error("unreachable: findTripleKey guarantees 3 copies");
    anchor.zone.splice(anchor.index, 0, mergeCopies(key, merged));

    const offer = rewardOffer(pool, rng, Math.min(player.rank + 1, cfg.maxRank), cfg.maxRank);
    if (offer.length > 0) player.discovers.push({ options: offer, destination: "HAND" });
    results.push({ key, offer });
    noteMoment(player, "triples");
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

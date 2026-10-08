import { DEFAULT_CONFIG, type GameConfig } from "../config.js";
import type { Rng } from "../rng/rng.js";

export interface PoolCard {
  key: string;
  rank: number;
}

/** Shared, finite supply of shop cards for one lobby. */
export class Pool {
  private readonly remaining = new Map<string, number>();
  private readonly ranks = new Map<string, number>();
  private readonly order: string[] = [];

  constructor(
    cards: readonly PoolCard[],
    copies: GameConfig["poolCopies"] = DEFAULT_CONFIG.poolCopies,
  ) {
    for (const card of cards) {
      if (this.ranks.has(card.key)) throw new Error(`duplicate pool card: ${card.key}`);
      const n = copies[card.rank];
      if (n === undefined) throw new Error(`no pool copies configured for rank ${card.rank}`);
      this.ranks.set(card.key, card.rank);
      this.remaining.set(card.key, n);
      this.order.push(card.key);
    }
  }

  has(key: string): boolean {
    return this.ranks.has(key);
  }

  count(key: string): number {
    return this.remaining.get(key) ?? 0;
  }

  rankOf(key: string): number {
    const rank = this.ranks.get(key);
    if (rank === undefined) throw new Error(`unknown card: ${key}`);
    return rank;
  }

  /**
   * Draw one copy at random (weighted by copies left) from cards with
   * minRank <= rank <= maxRank. Shops use the default minRank; Discover pins both.
   */
  draw(rng: Rng, maxRank: number, minRank = 1, accept?: (key: string) => boolean, favored?: { keys: ReadonlySet<string>; weight: number }): string | undefined {
    const eligible = (key: string): boolean => {
      const r = this.rankOf(key);
      return r >= minRank && r <= maxRank && (accept === undefined || accept(key));
    };
    // Favored cards count `weight` times per copy (in hundredths, so 1.5 works); without any, odds are the copies left.
    const boost = favored && favored.weight !== 1 && favored.keys.size > 0 ? favored : undefined;
    const scale = boost ? 100 : 1;
    const weightOf = (key: string): number => this.count(key) * (boost?.keys.has(key) ? Math.round(boost.weight * 100) : scale);
    let total = 0;
    for (const key of this.order) {
      if (eligible(key)) total += weightOf(key);
    }
    if (total === 0) return undefined;

    let roll = rng.int(total);
    for (const key of this.order) {
      if (!eligible(key)) continue;
      const n = this.count(key);
      const w = weightOf(key);
      if (roll < w) {
        this.remaining.set(key, n - 1);
        return key;
      }
      roll -= w;
    }
    return undefined; // unreachable: total > 0 guarantees a hit above
  }

  /** Remove specific copies from the pool (e.g. a card created by an effect). False if not enough are left. */
  take(key: string, copies = 1): boolean {
    this.rankOf(key); // validates the key
    const n = this.count(key);
    if (n < copies) return false;
    this.remaining.set(key, n - copies);
    return true;
  }

  /** Return copies to the pool (sold, rolled away, or removed from the game). */
  give(key: string, copies = 1): void {
    this.rankOf(key); // validates the key
    this.remaining.set(key, this.count(key) + copies);
  }
}

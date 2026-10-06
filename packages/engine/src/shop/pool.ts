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
  draw(rng: Rng, maxRank: number, minRank = 1): string | undefined {
    const eligible = (key: string): boolean => {
      const r = this.rankOf(key);
      return r >= minRank && r <= maxRank;
    };
    let total = 0;
    for (const key of this.order) {
      if (eligible(key)) total += this.count(key);
    }
    if (total === 0) return undefined;

    let roll = rng.int(total);
    for (const key of this.order) {
      if (!eligible(key)) continue;
      const n = this.count(key);
      if (roll < n) {
        this.remaining.set(key, n - 1);
        return key;
      }
      roll -= n;
    }
    return undefined; // unreachable: total > 0 guarantees a hit above
  }

  /** Return copies to the pool (sold, rolled away, or removed from the game). */
  give(key: string, copies = 1): void {
    this.rankOf(key); // validates the key
    this.remaining.set(key, this.count(key) + copies);
  }
}

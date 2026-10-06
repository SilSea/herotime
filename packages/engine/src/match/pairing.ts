import type { Rng } from "../rng/rng.js";

export interface Pairing {
  pairs: [string, string][];
  /** With an odd number of players this one fights a Ghost instead. */
  ghostFor?: string;
}

/**
 * Random pairing that avoids repeating an opponent seen in the last `noRepeat` rounds when possible.
 * `history[id]` lists that player's opponents, oldest first. Ghost rounds are not opponents.
 */
export function pairPlayers(
  ids: readonly string[],
  history: ReadonlyMap<string, readonly string[]>,
  rng: Rng,
  noRepeat: number,
  lastGhost?: string,
): Pairing {
  let pool = [...ids];
  let ghostFor: string | undefined;
  if (pool.length % 2 === 1) {
    // Do not give the Ghost to the same player twice in a row if anyone else can have it.
    const candidates = pool.filter((id) => id !== lastGhost);
    ghostFor = rng.pick(candidates.length > 0 ? candidates : pool);
    pool = pool.filter((id) => id !== ghostFor);
  }

  const saw = (x: string, y: string): boolean => (history.get(x) ?? []).slice(-noRepeat).includes(y);
  const recent = (a: string, b: string): boolean => saw(a, b) || saw(b, a);

  let best: [string, string][] = [];
  let bestRepeats = Number.POSITIVE_INFINITY;
  for (let attempt = 0; attempt < 80 && bestRepeats > 0; attempt++) {
    const order = rng.shuffle(pool);
    const pairs: [string, string][] = [];
    let repeats = 0;
    for (let i = 0; i + 1 < order.length; i += 2) {
      const [a, b] = [order[i] as string, order[i + 1] as string];
      pairs.push([a, b]);
      if (recent(a, b)) repeats++;
    }
    if (repeats < bestRepeats) {
      best = pairs;
      bestRepeats = repeats;
    }
  }

  const result: Pairing = { pairs: best };
  if (ghostFor !== undefined) result.ghostFor = ghostFor;
  return result;
}

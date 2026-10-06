/** Sends a message to every connection a user has. The socket layer implements it; tests use a fake. */
export interface Publisher {
  toUser(userId: string, event: string, payload: unknown): void;
}

/** Wall clock and timers, injectable so tests can run a match in milliseconds. */
export interface Timers {
  now(): number;
  /** Returns a cancel function. */
  after(ms: number, fn: () => void): () => void;
}

export const realTimers: Timers = {
  now: () => Date.now(),
  after(ms, fn) {
    const handle = setTimeout(fn, Math.max(0, ms));
    return () => clearTimeout(handle);
  },
};

import { Logger } from "@nestjs/common";
import { logInternal } from "../errors.js";

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

const timerLog = new Logger("Timers");

export const realTimers: Timers = {
  now: () => Date.now(),
  after(ms, fn) {
    // A throwing callback must not take the whole server (every match) down with it.
    const safe = (): void => {
      try {
        fn();
      } catch (e) {
        logInternal(timerLog, "timer callback", e);
      }
    };
    const handle = setTimeout(safe, Math.max(0, ms));
    return () => clearTimeout(handle);
  },
};

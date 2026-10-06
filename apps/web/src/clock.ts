/** Keeps the browser's countdowns right even when the player's clock is off: the server stamps every view. */
export class ServerClock {
  private offset = 0;

  /** Call with the `serverNow` of each message. */
  sync(serverNow: number, clientNow: number = Date.now()): void {
    this.offset = serverNow - clientNow;
  }

  now(clientNow: number = Date.now()): number {
    return clientNow + this.offset;
  }

  /** Milliseconds until `deadline` (never negative), or null when there is none. */
  remaining(deadline: number | null, clientNow: number = Date.now()): number | null {
    if (deadline === null) return null;
    return Math.max(0, deadline - this.now(clientNow));
  }
}

/** 73_400 -> "1:14" (rounded up, so the display reaches 0:00 exactly at the deadline). */
export function formatClock(ms: number | null): string {
  if (ms === null) return "--:--";
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

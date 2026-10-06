/** Sliding-window limiter: at most `max` hits per `windowMs` for each key. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a hit and returns whether it is allowed. Rejected hits do not extend the window. */
  allow(key: string): boolean {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((h) => t - h < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(t);
    this.hits.set(key, recent);
    return true;
  }

  forget(key: string): void {
    this.hits.delete(key);
  }

  /** Drop keys with no recent hits (call now and then so the map cannot grow forever). */
  sweep(): void {
    const t = this.now();
    for (const [key, hits] of this.hits) {
      if (hits.every((h) => t - h >= this.windowMs)) this.hits.delete(key);
    }
  }
}

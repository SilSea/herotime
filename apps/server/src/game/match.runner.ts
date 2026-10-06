import { RuleError, type Intent, type Match, type MatchEvent, type MatchView } from "@herotime/engine";
import type { Publisher, Timers } from "./ports.js";

export interface RunnerMeta {
  seed: number;
  contentVersion: number;
  startedAt: Date;
}

export interface EndedInfo {
  runner: MatchRunner;
  placements: { playerId: string; placement: number }[];
}

type Payload = { matchId: string; view: Omit<MatchView, "lastCombat"> & { lastCombat?: MatchView["lastCombat"] } };

/**
 * Drives one Match in real time: schedules its next deadline, applies player intents and pushes each
 * human their own private view. The engine stays pure; everything with a clock or a socket lives here.
 */
export class MatchRunner {
  private cancelTimer: (() => void) | undefined;
  private reportedEnd = false;
  private stopped = false;

  constructor(
    readonly id: string,
    readonly match: Match,
    readonly humanIds: ReadonlySet<string>,
    readonly meta: RunnerMeta,
    private readonly publisher: Publisher,
    private readonly timers: Timers,
    private readonly onEnded: (info: EndedInfo) => void,
    private readonly log: (msg: string, err?: unknown) => void = console.error,
  ) {}

  get ended(): boolean {
    return this.match.phase === "ENDED";
  }

  start(): void {
    this.afterChange(undefined, true);
  }

  /** Apply one validated intent. Throws RuleError if it is not allowed right now. */
  dispatch(userId: string, intent: Intent): void {
    if (!this.humanIds.has(userId)) throw new RuleError("you are not in this match");
    this.match.dispatch(userId, intent, this.timers.now());
    this.afterChange(userId, false);
  }

  /** Send the current full view (used when a client connects or reconnects). */
  sync(userId: string): void {
    if (this.humanIds.has(userId)) this.sendView(userId, true);
  }

  stop(): void {
    this.stopped = true;
    this.cancelTimer?.();
    this.cancelTimer = undefined;
  }

  private afterChange(actor: string | undefined, forceAll: boolean): void {
    const events = this.match.drainEvents();
    const transitioned = forceAll || events.length > 0;

    for (const e of events) this.announce(e);
    if (transitioned) {
      // A fight just finished (or the match did): every client needs the replay data.
      const withCombat = this.match.phase === "BATTLE" || this.match.phase === "ENDED";
      for (const id of this.humanIds) this.sendView(id, withCombat);
    } else if (actor) {
      this.sendView(actor, false);
    }

    this.schedule();
    this.reportEnd();
  }

  private announce(e: MatchEvent): void {
    if (e.type === "PHASE") return; // the view carries phase, turn and deadline
    for (const id of this.humanIds) this.publisher.toUser(id, "match:event", { matchId: this.id, event: e });
  }

  private sendView(userId: string, withCombat: boolean): void {
    const view: Payload["view"] = { ...this.match.view(userId) };
    // The replay is large and only changes once a turn, so ordinary updates leave it out.
    if (!withCombat) delete view.lastCombat;
    this.publisher.toUser(userId, "match:view", { matchId: this.id, view } satisfies Payload);
  }

  private schedule(): void {
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    const deadline = this.match.deadline;
    if (this.stopped || deadline === null) return;
    this.cancelTimer = this.timers.after(deadline - this.timers.now(), () => this.onTimer());
  }

  private onTimer(): void {
    try {
      this.match.tick(this.timers.now());
      this.afterChange(undefined, false);
    } catch (e) {
      // An engine bug must not silently freeze a room: tell the players and stop driving it.
      this.log(`match ${this.id} crashed`, e);
      for (const id of this.humanIds) this.publisher.toUser(id, "match:error", { matchId: this.id, error: "the match crashed" });
      this.stop();
    }
  }

  private reportEnd(): void {
    if (!this.ended || this.reportedEnd) return;
    this.reportedEnd = true;
    const placements = this.match.players.map((p) => ({ playerId: p.id, placement: p.placement as number }));
    this.onEnded({ runner: this, placements });
  }
}

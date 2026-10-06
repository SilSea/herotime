import { Inject, Injectable } from "@nestjs/common";
import { RuleError, type MatchConfig } from "@herotime/engine";
import type { PracticeInput } from "@herotime/shared";
import { FAST_TIMERS, type ServerConfig } from "../config.js";
import { ContentService } from "../content/content.service.js";
import { CONFIG, PUBLISHER, TIMERS } from "../tokens.js";
import { MatchRegistry, type QueuedUser } from "./match.registry.js";
import type { Publisher, Timers } from "./ports.js";

export type LobbyStatus =
  | { state: "idle" }
  | { state: "queued"; waiting: number; matchSize: number; fillAt: number | null }
  | { state: "playing"; matchId: string; ended: boolean };

/**
 * A single waiting room. A match starts when it is full, or `fillAfterMs` after the first player
 * arrived, with bots filling every empty seat.
 */
@Injectable()
export class LobbyService {
  private readonly queue = new Map<string, QueuedUser>();
  private cancelFill: (() => void) | undefined;
  private fillAt: number | null = null;

  constructor(
    @Inject(MatchRegistry) private readonly registry: MatchRegistry,
    @Inject(PUBLISHER) private readonly publisher: Publisher,
    @Inject(TIMERS) private readonly timers: Timers,
    @Inject(CONFIG) private readonly config: ServerConfig,
    @Inject(ContentService) private readonly contentService: ContentService,
  ) {}

  /**
   * Playtesting: skip the queue and start a match for this player right now. The options pick
   * factions, speed and the number of bots; everything is validated against the live content.
   */
  practice(user: QueuedUser, options: PracticeInput = {}): LobbyStatus {
    if (!this.config.practice) throw new RuleError("practice mode is disabled on this server");
    if (this.registry.activeFor(user.id)) throw new RuleError("you are already in a match");
    const known = this.contentService.latest.content.factions;
    for (const f of options.factions ?? []) {
      if (!known.has(f)) throw new RuleError(`unknown faction: ${f} (available: ${[...known.keys()].join(", ") || "none"})`);
    }
    this.registry.release(user.id);
    this.leave(user.id);

    const match: Partial<MatchConfig> = {};
    if (options.factions) match.fixedFactions = options.factions;
    if (options.speed === "fast") Object.assign(match, FAST_TIMERS);
    this.registry.startMatch([user], {
      size: options.bots === undefined ? this.config.lobby.matchSize : options.bots + 1,
      match,
      mode: "practice",
    });
    const status = this.statusFor(user.id);
    this.publisher.toUser(user.id, "queue:status", status);
    return status;
  }

  join(user: QueuedUser): LobbyStatus {
    if (this.registry.activeFor(user.id)) throw new RuleError("you are already in a match");
    this.registry.release(user.id); // a finished match no longer blocks queueing
    if (!this.queue.has(user.id)) this.queue.set(user.id, user);

    if (this.queue.size >= this.config.lobby.matchSize) {
      this.startNow();
    } else {
      if (!this.cancelFill) this.armFill();
      this.broadcast();
    }
    return this.statusFor(user.id);
  }

  leave(userId: string): void {
    if (!this.queue.delete(userId)) return;
    if (this.queue.size === 0) this.disarmFill();
    this.broadcast();
  }

  statusFor(userId: string): LobbyStatus {
    const runner = this.registry.runnerFor(userId);
    if (runner) return { state: "playing", matchId: runner.id, ended: runner.ended };
    if (this.queue.has(userId)) {
      return { state: "queued", waiting: this.queue.size, matchSize: this.config.lobby.matchSize, fillAt: this.fillAt };
    }
    return { state: "idle" };
  }

  get waiting(): number {
    return this.queue.size;
  }

  shutdown(): void {
    this.disarmFill();
    this.queue.clear();
  }

  private armFill(): void {
    this.fillAt = this.timers.now() + this.config.lobby.fillAfterMs;
    this.cancelFill = this.timers.after(this.config.lobby.fillAfterMs, () => {
      this.cancelFill = undefined;
      this.fillAt = null;
      this.startNow();
    });
  }

  private disarmFill(): void {
    this.cancelFill?.();
    this.cancelFill = undefined;
    this.fillAt = null;
  }

  private startNow(): void {
    this.disarmFill();
    const users = [...this.queue.values()].slice(0, this.config.lobby.matchSize);
    if (users.length === 0) return;
    for (const u of users) this.queue.delete(u.id);

    const runner = this.registry.startMatch(users);
    for (const u of users) this.publisher.toUser(u.id, "queue:status", this.statusFor(u.id));
    void runner; // the runner already pushed everyone's first view

    if (this.queue.size > 0) {
      this.armFill();
      this.broadcast();
    }
  }

  private broadcast(): void {
    for (const id of this.queue.keys()) this.publisher.toUser(id, "queue:status", this.statusFor(id));
  }
}

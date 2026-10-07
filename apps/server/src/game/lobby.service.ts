import { Inject, Injectable } from "@nestjs/common";
import { QUICK_MODE, RuleError, type MatchConfig } from "@herotime/engine";
import type { PracticeInput, QueueKind } from "@herotime/shared";
import { FAST_TIMERS, type ServerConfig } from "../config.js";
import { ContentService } from "../content/content.service.js";
import { CONFIG, PUBLISHER, TIMERS } from "../tokens.js";
import { MatchRegistry, type QueuedUser } from "./match.registry.js";
import type { Publisher, Timers } from "./ports.js";

export type LobbyStatus =
  | { state: "idle" }
  | { state: "queued"; kind: QueueKind; waiting: number; matchSize: number; fillAt: number | null }
  | { state: "playing"; matchId: string; ended: boolean };

/** One waiting room: players in arrival order and the timer that fills the rest with bots. */
interface Room {
  users: Map<string, QueuedUser>;
  cancelFill: (() => void) | undefined;
  fillAt: number | null;
}

const KINDS: readonly QueueKind[] = ["standard", "quick"];

/**
 * Waiting rooms, one per kind of match (standard, quick). A match starts when a room is full, or
 * `fillAfterMs` after its first player arrived, with bots filling every empty seat.
 */
@Injectable()
export class LobbyService {
  private readonly rooms = new Map<QueueKind, Room>(KINDS.map((k) => [k, { users: new Map(), cancelFill: undefined, fillAt: null }]));

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
    if (options.speed === "quick") Object.assign(match, QUICK_MODE);
    this.registry.startMatch([user], {
      size: options.bots === undefined ? this.config.lobby.matchSize : options.bots + 1,
      match,
      mode: "practice",
    });
    const status = this.statusFor(user.id);
    this.publisher.toUser(user.id, "queue:status", status);
    return status;
  }

  join(user: QueuedUser, kind: QueueKind = "standard"): LobbyStatus {
    if (this.registry.activeFor(user.id)) throw new RuleError("you are already in a match");
    this.registry.release(user.id); // a finished match no longer blocks queueing
    for (const k of KINDS) if (k !== kind) this.leaveRoom(k, user.id); // one queue at a time
    const room = this.room(kind);
    if (!room.users.has(user.id)) room.users.set(user.id, user);

    if (room.users.size >= this.config.lobby.matchSize) {
      this.startNow(kind);
    } else {
      if (!room.cancelFill) this.armFill(kind);
      this.broadcast(kind);
    }
    return this.statusFor(user.id);
  }

  leave(userId: string): void {
    for (const k of KINDS) this.leaveRoom(k, userId);
  }

  statusFor(userId: string): LobbyStatus {
    const runner = this.registry.runnerFor(userId);
    if (runner) return { state: "playing", matchId: runner.id, ended: runner.ended };
    for (const kind of KINDS) {
      const room = this.room(kind);
      if (room.users.has(userId)) return { state: "queued", kind, waiting: room.users.size, matchSize: this.config.lobby.matchSize, fillAt: room.fillAt };
    }
    return { state: "idle" };
  }

  /** Players waiting, in every room. */
  get waiting(): number {
    return KINDS.reduce((n, k) => n + this.room(k).users.size, 0);
  }

  shutdown(): void {
    for (const k of KINDS) {
      this.disarmFill(k);
      this.room(k).users.clear();
    }
  }

  private room(kind: QueueKind): Room {
    return this.rooms.get(kind) as Room;
  }

  private leaveRoom(kind: QueueKind, userId: string): void {
    const room = this.room(kind);
    if (!room.users.delete(userId)) return;
    if (room.users.size === 0) this.disarmFill(kind);
    this.broadcast(kind);
  }

  private armFill(kind: QueueKind): void {
    const room = this.room(kind);
    room.fillAt = this.timers.now() + this.config.lobby.fillAfterMs;
    room.cancelFill = this.timers.after(this.config.lobby.fillAfterMs, () => {
      room.cancelFill = undefined;
      room.fillAt = null;
      this.startNow(kind);
    });
  }

  private disarmFill(kind: QueueKind): void {
    const room = this.room(kind);
    room.cancelFill?.();
    room.cancelFill = undefined;
    room.fillAt = null;
  }

  private startNow(kind: QueueKind): void {
    this.disarmFill(kind);
    const room = this.room(kind);
    const users = [...room.users.values()].slice(0, this.config.lobby.matchSize);
    if (users.length === 0) return;
    for (const u of users) room.users.delete(u.id);

    // Quick matches are their own kind: they never count for the (standard) leaderboard.
    const runner = kind === "quick" ? this.registry.startMatch(users, { match: { ...QUICK_MODE }, mode: "quick" }) : this.registry.startMatch(users);
    for (const u of users) this.publisher.toUser(u.id, "queue:status", this.statusFor(u.id));
    void runner; // the runner already pushed everyone's first view

    if (room.users.size > 0) {
      this.armFill(kind);
      this.broadcast(kind);
    }
  }

  private broadcast(kind: QueueKind): void {
    for (const id of this.room(kind).users.keys()) this.publisher.toUser(id, "queue:status", this.statusFor(id));
  }
}

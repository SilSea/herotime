import { randomInt, randomUUID } from "node:crypto";
import type { MatchMode } from "../persistence/repositories.js";
import { Inject, Injectable } from "@nestjs/common";
import { Match, type Entrant, type MatchConfig } from "@herotime/engine";
import type { ServerConfig } from "../config.js";
import { ContentService } from "../content/content.service.js";
import { MATCH_REPOSITORY, type MatchRepository } from "../persistence/repositories.js";
import { CONFIG, PUBLISHER, TIMERS } from "../tokens.js";
import { MatchRunner, type EndedInfo } from "./match.runner.js";
import type { Publisher, Timers } from "./ports.js";

export interface QueuedUser {
  id: string;
  name: string;
}

export interface StartOptions {
  /** Total players including humans (default: the lobby size). */
  size?: number;
  /** Overrides for this match only. */
  match?: Partial<MatchConfig>;
  /** Practice matches are kept in history but never ranked. */
  mode?: MatchMode;
}

/** How long a finished match stays available for reconnects and final standings. */
const KEEP_FINISHED_MS = 10 * 60_000;

@Injectable()
export class MatchRegistry {
  private readonly runners = new Map<string, MatchRunner>();
  private readonly byUser = new Map<string, string>();

  constructor(
    @Inject(ContentService) private readonly contentService: ContentService,
    @Inject(PUBLISHER) private readonly publisher: Publisher,
    @Inject(TIMERS) private readonly timers: Timers,
    @Inject(CONFIG) private readonly config: ServerConfig,
    @Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository,
  ) {}

  /** Start a match with these humans, filling the rest of the lobby with bots. */
  startMatch(humans: readonly QueuedUser[], options: StartOptions = {}): MatchRunner {
    const size = options.size ?? this.config.lobby.matchSize;
    if (humans.length === 0 || humans.length > size) throw new Error(`a match needs 1-${size} humans`);

    const entrants: Entrant[] = humans.map((h) => ({ id: h.id, name: h.name, isBot: false }));
    for (let i = 0; entrants.length < size; i++) entrants.push({ id: `bot-${i + 1}`, name: `Bot ${i + 1}`, isBot: true });

    const { content, version } = this.contentService.latest;
    const seed = randomInt(0, 2 ** 31 - 1);
    const startedAt = new Date(this.timers.now());
    const match = Match.create({
      content,
      seed,
      entrants,
      now: this.timers.now(),
      config: { ...this.config.match, ...options.match },
    });

    const id = randomUUID();
    const runner = new MatchRunner(
      id,
      match,
      new Set(humans.map((h) => h.id)),
      { mode: options.mode ?? "queue", seed, contentVersion: version, startedAt },
      this.publisher,
      this.timers,
      (info) => this.finished(info),
    );
    this.runners.set(id, runner);
    for (const h of humans) this.byUser.set(h.id, id);
    runner.start();
    return runner;
  }

  /** The user's match if it is still being played. */
  activeFor(userId: string): MatchRunner | undefined {
    const runner = this.runnerFor(userId);
    return runner && !runner.ended ? runner : undefined;
  }

  /** The user's most recent match, finished or not (for reconnects and final standings). */
  runnerFor(userId: string): MatchRunner | undefined {
    const id = this.byUser.get(userId);
    return id ? this.runners.get(id) : undefined;
  }

  /** Forget a finished match so the user can queue again. Does nothing while it is still running. */
  release(userId: string): void {
    if (this.activeFor(userId) === undefined) this.byUser.delete(userId);
  }

  get count(): number {
    return this.runners.size;
  }

  /** Stop every timer (server shutdown, tests). */
  shutdown(): void {
    for (const r of this.runners.values()) r.stop();
    this.runners.clear();
    this.byUser.clear();
  }

  private finished(info: EndedInfo): void {
    const { runner, placements } = info;
    const byId = new Map(placements.map((p) => [p.playerId, p.placement]));
    void this.matches
      .save({
        matchId: runner.id,
        mode: runner.meta.mode,
        seed: runner.meta.seed,
        contentVersion: runner.meta.contentVersion,
        startedAt: runner.meta.startedAt,
        endedAt: new Date(this.timers.now()),
        players: runner.match.players.map((p) => ({
          userId: p.isBot ? null : p.id,
          name: p.name,
          isBot: p.isBot,
          heroKey: p.state.hero ?? null,
          placement: byId.get(p.id) as number,
          // The board they last fought with (what got them their place); the current one if they never fought.
          board: p.lastFightBoard ? p.lastFightBoard.map((u) => u.cardKey) : p.state.board.map((u) => u.key),
          relics: [...p.state.relics],
        })),
      })
      .catch((e: unknown) => console.error(`could not save match ${runner.id}`, e));

    this.timers.after(KEEP_FINISHED_MS, () => {
      runner.stop();
      this.runners.delete(runner.id);
      for (const [user, matchId] of this.byUser) if (matchId === runner.id) this.byUser.delete(user);
    });
  }
}

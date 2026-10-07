import { randomUUID } from "node:crypto";
import {
  DuplicateUserError,
  type AuditEntry,
  type ContentData,
  type ContentRepository,
  type ContentVersionMeta,
  type ContentVersionRecord,
  type DraftRecord,
  type MatchRepository,
  type MatchResult,
  rankStandings,
  type Standing,
  type UserRecord,
  type UserRepository,
  aggregateStats,
  type GameStats,
  type StatLine,
  type StatsFilter,
} from "./repositories.js";

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();

  async findById(id: string): Promise<UserRecord | undefined> {
    return this.users.get(id);
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const key = username.toLowerCase();
    return [...this.users.values()].find((u) => u.username.toLowerCase() === key);
  }

  async create(user: Omit<UserRecord, "id" | "createdAt">): Promise<UserRecord> {
    const name = user.username.toLowerCase();
    const mail = user.email.toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === name || u.email.toLowerCase() === mail) throw new DuplicateUserError();
    }
    const record: UserRecord = { ...user, id: randomUUID(), createdAt: new Date() };
    this.users.set(record.id, record);
    return record;
  }
}

export class InMemoryMatchRepository implements MatchRepository {
  readonly results: MatchResult[] = [];

  async save(result: MatchResult): Promise<void> {
    this.results.push(result);
  }

  async recentForUser(userId: string, limit: number): Promise<MatchResult[]> {
    return this.results
      .filter((r) => r.players.some((p) => p.userId === userId))
      .slice(-limit)
      .reverse();
  }

  async stats(filter: StatsFilter): Promise<GameStats> {
    const results = this.results.filter((r) => !filter.modes || filter.modes.includes(r.mode));
    const lines: StatLine[] = results.flatMap((r) =>
      r.players.filter((p) => !filter.humansOnly || !p.isBot).map((p) => ({ isBot: p.isBot, mode: r.mode, heroKey: p.heroKey, placement: p.placement, board: p.board ?? [], relics: p.relics ?? [] })),
    );
    return aggregateStats(lines, results.length);
  }

  /** Usernames are looked up by the caller's user repository, so pass one in to get names (tests may omit it). */
  constructor(private readonly users?: UserRepository) {}

  async leaderboard(limit: number, minGames: number): Promise<Standing[]> {
    const by = new Map<string, Standing>();
    for (const r of this.results) {
      if (r.mode !== "queue") continue;
      for (const p of r.players) {
        if (!p.userId) continue;
        const s = by.get(p.userId) ?? { userId: p.userId, username: p.name, games: 0, wins: 0, top4: 0, avgPlacement: 0 };
        s.avgPlacement = (s.avgPlacement * s.games + p.placement) / (s.games + 1);
        s.games++;
        if (p.placement === 1) s.wins++;
        if (p.placement <= 4) s.top4++;
        by.set(p.userId, s);
      }
    }
    const rows = [...by.values()].filter((s) => s.games >= minGames);
    for (const s of rows) {
      s.username = (await this.users?.findById(s.userId))?.username ?? s.username;
      s.avgPlacement = Math.round(s.avgPlacement * 100) / 100;
    }
    return rankStandings(rows, limit);
  }
}

export class InMemoryContentRepository implements ContentRepository {
  private readonly versions: ContentVersionRecord[] = [];
  private draft: DraftRecord | undefined;
  private readonly log: AuditEntry[] = [];

  async latest(): Promise<ContentVersionRecord | undefined> {
    return this.versions.at(-1);
  }

  async get(number: number): Promise<ContentVersionRecord | undefined> {
    return this.versions.find((v) => v.number === number);
  }

  async list(limit: number): Promise<ContentVersionMeta[]> {
    return [...this.versions].reverse().slice(0, limit).map(({ data: _data, ...meta }) => meta);
  }

  async publish(data: ContentData, notes: string | null, userId: string | null): Promise<ContentVersionRecord> {
    const record: ContentVersionRecord = { number: (this.versions.at(-1)?.number ?? 0) + 1, data: structuredClone(data), notes, publishedAt: new Date(), publishedBy: userId };
    this.versions.push(record);
    return record;
  }

  async loadDraft(): Promise<DraftRecord | undefined> {
    return this.draft && { ...this.draft, data: structuredClone(this.draft.data) };
  }

  async saveDraft(data: ContentData, basedOn: number, userId: string): Promise<DraftRecord> {
    this.draft = { data: structuredClone(data), basedOn, updatedAt: new Date(), updatedBy: userId };
    return this.draft;
  }

  async clearDraft(): Promise<void> {
    this.draft = undefined;
  }

  async audit(adminId: string, entity: string, before: unknown, after: unknown): Promise<void> {
    this.log.push({ id: randomUUID(), adminId, entity, before, after, at: new Date() });
  }

  async recentAudit(limit: number): Promise<AuditEntry[]> {
    return [...this.log].reverse().slice(0, limit);
  }
}

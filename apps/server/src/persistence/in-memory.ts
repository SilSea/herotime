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
  type UserRecord,
  type UserRepository,
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

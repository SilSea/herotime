import { randomUUID } from "node:crypto";
import {
  DuplicateUserError,
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

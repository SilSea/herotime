import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client.js";
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
} from "./repositories.js";

/** Prisma 7 talks to Postgres through a driver adapter. */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

type DbUser = Awaited<ReturnType<PrismaClient["user"]["findUniqueOrThrow"]>>;

const toRecord = (u: DbUser): UserRecord => ({
  id: u.id,
  username: u.username,
  email: u.email,
  passwordHash: u.passwordHash,
  role: u.role,
  createdAt: u.createdAt,
});

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<UserRecord | undefined> {
    const u = await this.db.user.findUnique({ where: { id } });
    return u ? toRecord(u) : undefined;
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const u = await this.db.user.findUnique({ where: { usernameKey: username.toLowerCase() } });
    return u ? toRecord(u) : undefined;
  }

  async create(user: Omit<UserRecord, "id" | "createdAt">): Promise<UserRecord> {
    try {
      const u = await this.db.user.create({
        data: {
          username: user.username,
          usernameKey: user.username.toLowerCase(),
          email: user.email,
          emailKey: user.email.toLowerCase(),
          passwordHash: user.passwordHash,
          role: user.role,
        },
      });
      return toRecord(u);
    } catch (e) {
      // The database is the arbiter: two simultaneous sign-ups cannot both win.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DuplicateUserError();
      throw e;
    }
  }
}

export class PrismaMatchRepository implements MatchRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(result: MatchResult): Promise<void> {
    await this.db.match.create({
      data: {
        id: result.matchId,
        mode: result.mode,
        contentVersion: result.contentVersion,
        seed: result.seed,
        startedAt: result.startedAt,
        endedAt: result.endedAt,
        players: {
          create: result.players.map((p) => ({
            userId: p.userId,
            name: p.name,
            isBot: p.isBot,
            heroKey: p.heroKey,
            placement: p.placement,
          })),
        },
      },
    });
  }

  async recentForUser(userId: string, limit: number): Promise<MatchResult[]> {
    const rows = await this.db.match.findMany({
      where: { players: { some: { userId } } },
      orderBy: { endedAt: "desc" },
      take: limit,
      include: { players: true },
    });
    return rows.map((m) => ({
      matchId: m.id,
      mode: m.mode === "practice" ? ("practice" as const) : ("queue" as const),
      seed: m.seed,
      contentVersion: m.contentVersion,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      players: m.players
        .map((p) => ({ userId: p.userId, name: p.name, isBot: p.isBot, heroKey: p.heroKey, placement: p.placement }))
        .sort((a, b) => a.placement - b.placement),
    }));
  }

  async leaderboard(limit: number, minGames: number): Promise<Standing[]> {
    const ranked = { userId: { not: null }, match: { mode: "queue" } } as const;
    const all = await this.db.matchPlayer.groupBy({ by: ["userId"], where: ranked, _count: { _all: true }, _avg: { placement: true } });
    const eligible = all.filter((r) => r._count._all >= minGames && r.userId !== null);
    if (eligible.length === 0) return [];
    const ids = eligible.map((r) => r.userId as string);
    const [wins, top4, users] = await Promise.all([
      this.db.matchPlayer.groupBy({ by: ["userId"], where: { ...ranked, userId: { in: ids }, placement: 1 }, _count: { _all: true } }),
      this.db.matchPlayer.groupBy({ by: ["userId"], where: { ...ranked, userId: { in: ids }, placement: { lte: 4 } }, _count: { _all: true } }),
      this.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } }),
    ]);
    const count = (rows: { userId: string | null; _count: { _all: number } }[], id: string): number => rows.find((r) => r.userId === id)?._count._all ?? 0;
    const names = new Map(users.map((u) => [u.id, u.username]));
    return rankStandings(
      eligible.map((r) => ({
        userId: r.userId as string,
        username: names.get(r.userId as string) ?? "?",
        games: r._count._all,
        wins: count(wins, r.userId as string),
        top4: count(top4, r.userId as string),
        avgPlacement: Math.round((r._avg.placement ?? 0) * 100) / 100,
      })),
      limit,
    );
  }
}

const DRAFT_ID = "main";
const toJson = (v: unknown) => (v === null || v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue));

export class PrismaContentRepository implements ContentRepository {
  constructor(private readonly db: PrismaClient) {}

  private static record(v: { number: number; snapshot: unknown; notes: string | null; publishedAt: Date; publishedBy: string | null }): ContentVersionRecord {
    return { number: v.number, data: v.snapshot as ContentData, notes: v.notes, publishedAt: v.publishedAt, publishedBy: v.publishedBy };
  }

  async latest(): Promise<ContentVersionRecord | undefined> {
    const v = await this.db.contentVersion.findFirst({ orderBy: { number: "desc" } });
    return v ? PrismaContentRepository.record(v) : undefined;
  }

  async get(number: number): Promise<ContentVersionRecord | undefined> {
    const v = await this.db.contentVersion.findUnique({ where: { number } });
    return v ? PrismaContentRepository.record(v) : undefined;
  }

  async list(limit: number): Promise<ContentVersionMeta[]> {
    const rows = await this.db.contentVersion.findMany({ orderBy: { number: "desc" }, take: limit, select: { number: true, notes: true, publishedAt: true, publishedBy: true } });
    return rows;
  }

  async publish(data: ContentData, notes: string | null, userId: string | null): Promise<ContentVersionRecord> {
    // The unique number is the arbiter: two simultaneous publishes cannot both take the same one.
    for (let attempt = 0; ; attempt++) {
      const last = await this.db.contentVersion.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
      try {
        const v = await this.db.contentVersion.create({ data: { number: (last?.number ?? 0) + 1, snapshot: data as Prisma.InputJsonValue, notes, publishedBy: userId } });
        return PrismaContentRepository.record(v);
      } catch (e) {
        if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }
    }
  }

  async loadDraft(): Promise<DraftRecord | undefined> {
    const d = await this.db.contentDraft.findUnique({ where: { id: DRAFT_ID } });
    return d ? { data: d.data as ContentData, basedOn: d.basedOn, updatedAt: d.updatedAt, updatedBy: d.updatedBy } : undefined;
  }

  async saveDraft(data: ContentData, basedOn: number, userId: string): Promise<DraftRecord> {
    const d = await this.db.contentDraft.upsert({
      where: { id: DRAFT_ID },
      create: { id: DRAFT_ID, data: data as Prisma.InputJsonValue, basedOn, updatedBy: userId },
      update: { data: data as Prisma.InputJsonValue, basedOn, updatedBy: userId },
    });
    return { data: d.data as ContentData, basedOn: d.basedOn, updatedAt: d.updatedAt, updatedBy: d.updatedBy };
  }

  async clearDraft(): Promise<void> {
    await this.db.contentDraft.deleteMany({ where: { id: DRAFT_ID } });
  }

  async audit(adminId: string, entity: string, before: unknown, after: unknown): Promise<void> {
    await this.db.auditLog.create({ data: { adminId, entity, before: toJson(before), after: toJson(after) } });
  }

  async recentAudit(limit: number): Promise<AuditEntry[]> {
    const rows = await this.db.auditLog.findMany({ orderBy: { at: "desc" }, take: limit });
    return rows.map((r) => ({ id: r.id, adminId: r.adminId, entity: r.entity, before: r.before, after: r.after, at: r.at }));
  }
}

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import {
  DuplicateUserError,
  type MatchRepository,
  type MatchResult,
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
      seed: m.seed,
      contentVersion: m.contentVersion,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      players: m.players
        .map((p) => ({ userId: p.userId, name: p.name, isBot: p.isBot, heroKey: p.heroKey, placement: p.placement }))
        .sort((a, b) => a.placement - b.placement),
    }));
  }
}

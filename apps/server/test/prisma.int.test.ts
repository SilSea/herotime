import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DuplicateUserError, type MatchResult } from "../src/persistence/repositories.js";
import { createPrismaClient, PrismaMatchRepository, PrismaUserRepository } from "../src/persistence/prisma.js";
import { api, connect, startServer } from "./e2e-helpers.js";

/**
 * Runs against a real Postgres. Skipped (and reported as skipped, not passed) unless
 * TEST_DATABASE_URL is set, e.g. postgresql://herotime:herotime@localhost:5432/herotime_test
 * after `docker compose up -d postgres`. The test database is created and migrated automatically.
 */
const URL_ = process.env.TEST_DATABASE_URL;

describe.skipIf(!URL_)("Prisma repositories on real Postgres", () => {
  const db = createPrismaClient(URL_ as string);
  const users = new PrismaUserRepository(db);
  const matches = new PrismaMatchRepository(db);

  beforeAll(async () => {
    const target = new URL(URL_ as string);
    const dbName = target.pathname.slice(1);
    const admin = new URL(URL_ as string);
    admin.pathname = "/postgres";
    const adminDb = createPrismaClient(admin.toString());
    try {
      await adminDb.$executeRawUnsafe(`CREATE DATABASE "${dbName.replace(/"/g, "")}"`);
    } catch (e) {
      if (!/already exists/i.test(String(e))) throw e;
    } finally {
      await adminDb.$disconnect();
    }
    execSync("pnpm --workspace-root exec prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: URL_ },
      stdio: "pipe",
    });
  }, 60_000);

  beforeEach(async () => {
    await db.matchPlayer.deleteMany();
    await db.match.deleteMany();
    await db.user.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  const newUser = (name: string, email = `${name}@test.dev`) =>
    users.create({ username: name, email, passwordHash: "$2a$04$hash", role: "PLAYER" });

  describe("users", () => {
    it("stores a user and finds it by id and by username (any case)", async () => {
      const u = await newUser("Rider_One");
      expect(u).toMatchObject({ username: "Rider_One", email: "Rider_One@test.dev", role: "PLAYER", passwordHash: "$2a$04$hash" });
      expect(u.id).toEqual(expect.any(String));
      expect(u.createdAt).toBeInstanceOf(Date);
      expect((await users.findById(u.id))?.username).toBe("Rider_One");
      expect((await users.findByUsername("rider_one"))?.id).toBe(u.id);
      expect((await users.findByUsername("RIDER_ONE"))?.id).toBe(u.id);
    });

    it("returns undefined for unknown users", async () => {
      expect(await users.findById("nope")).toBeUndefined();
      expect(await users.findByUsername("nobody")).toBeUndefined();
    });

    it("refuses a duplicate username or email, ignoring case", async () => {
      await newUser("dupe", "dupe@test.dev");
      await expect(newUser("DUPE", "other@test.dev")).rejects.toBeInstanceOf(DuplicateUserError);
      await expect(newUser("another", "DUPE@test.dev")).rejects.toBeInstanceOf(DuplicateUserError);
      expect(await db.user.count()).toBe(1);
    });

    it("of many simultaneous sign-ups for one name exactly one wins", async () => {
      const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => newUser("racer", `racer${i}@test.dev`)));
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      for (const r of results.filter((r) => r.status === "rejected")) {
        expect((r as PromiseRejectedResult).reason).toBeInstanceOf(DuplicateUserError);
      }
      expect(await db.user.count()).toBe(1);
    });

    it("keeps the role it was given", async () => {
      const a = await users.create({ username: "boss", email: "boss@test.dev", passwordHash: "h", role: "ADMIN" });
      expect((await users.findById(a.id))?.role).toBe("ADMIN");
    });
  });

  describe("matches", () => {
    const result = (id: string, userId: string, placement: number, endedAt: Date): MatchResult => ({
      matchId: id,
      seed: 12345,
      contentVersion: 1,
      startedAt: new Date(endedAt.getTime() - 60_000),
      endedAt,
      players: [
        { userId, name: "Human", isBot: false, heroKey: "red_leader", placement },
        { userId: null, name: "Bot 1", isBot: true, heroKey: null, placement: placement === 1 ? 2 : 1 },
      ],
    });

    it("saves a match with its players and reads it back", async () => {
      const u = await newUser("player");
      const saved = result("m1", u.id, 2, new Date("2026-10-06T10:00:00Z"));
      await matches.save(saved);
      const [got] = await matches.recentForUser(u.id, 5);
      expect(got).toMatchObject({ matchId: "m1", seed: 12345, contentVersion: 1 });
      expect(got?.endedAt.toISOString()).toBe("2026-10-06T10:00:00.000Z");
      expect(got?.players.map((p) => [p.name, p.placement, p.isBot, p.userId, p.heroKey])).toEqual([
        ["Bot 1", 1, true, null, null],
        ["Human", 2, false, u.id, "red_leader"],
      ]);
    });

    it("lists a user's matches newest first, honours the limit, and ignores other people's", async () => {
      const [a, b] = [await newUser("alpha"), await newUser("bravo")];
      await matches.save(result("old", a.id, 3, new Date("2026-10-01T00:00:00Z")));
      await matches.save(result("new", a.id, 1, new Date("2026-10-05T00:00:00Z")));
      await matches.save(result("mid", a.id, 2, new Date("2026-10-03T00:00:00Z")));
      await matches.save(result("theirs", b.id, 1, new Date("2026-10-06T00:00:00Z")));
      expect((await matches.recentForUser(a.id, 10)).map((m) => m.matchId)).toEqual(["new", "mid", "old"]);
      expect((await matches.recentForUser(a.id, 2)).map((m) => m.matchId)).toEqual(["new", "mid"]);
      expect((await matches.recentForUser(b.id, 10)).map((m) => m.matchId)).toEqual(["theirs"]);
      expect(await matches.recentForUser("nobody", 10)).toEqual([]);
    });

    it("refuses the same match twice and a player who does not exist", async () => {
      const u = await newUser("solo");
      await matches.save(result("dup", u.id, 1, new Date()));
      await expect(matches.save(result("dup", u.id, 1, new Date()))).rejects.toThrow();
      await expect(matches.save(result("ghost", "no-such-user", 1, new Date()))).rejects.toThrow();
      expect(await db.match.count()).toBe(1); // the failed save left nothing behind
      expect(await db.matchPlayer.count()).toBe(2);
    });

    it("deleting a match removes its player rows but not the user", async () => {
      const u = await newUser("keeper");
      await matches.save(result("gone", u.id, 1, new Date()));
      await db.match.delete({ where: { id: "gone" } });
      expect(await db.matchPlayer.count()).toBe(0);
      expect(await users.findById(u.id)).toBeDefined();
    });
  });

  describe("the whole server on top of it", () => {
    it("accounts survive a server restart, and a played match is stored in Postgres", async () => {
      const first = await startServer({}, { users, matches });
      const reg = await api(first, "/auth/register", { username: "persistent", email: "p@test.dev", password: "password123" });
      expect(reg.status).toBe(201);
      await first.close();

      // a brand new server process-equivalent with the same database and secret
      const second = await startServer({ jwtSecret: first.config.jwtSecret }, { users, matches });
      expect((await api(second, "/auth/login", { username: "persistent", password: "password123" })).status).toBe(201);
      expect((await api(second, "/me", undefined, reg.body.token)).body.username).toBe("persistent"); // the old token still works
      expect((await api(second, "/auth/register", { username: "PERSISTENT", email: "x@test.dev", password: "password123" })).status).toBe(409);

      const c = await connect(second, reg.body.token);
      await c.call("queue:join");
      const started = await c.waitFor("match:view");
      const ended = await c.waitFor("match:event", (p) => p.event.type === "ENDED", 20_000);
      expect(ended.event.placements).toHaveLength(8);
      await new Promise((r) => setTimeout(r, 300));

      const history = await matches.recentForUser(reg.body.user.id, 5);
      expect(history).toHaveLength(1);
      expect(history[0]?.matchId).toBe(started.matchId);
      expect(history[0]?.players).toHaveLength(8);
      expect(history[0]?.players.filter((p) => p.isBot)).toHaveLength(7);
      expect(history[0]?.players.map((p) => p.placement)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      c.close();
      await second.close();
    }, 60_000);
  });
});

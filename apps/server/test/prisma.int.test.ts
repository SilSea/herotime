import { execSync } from "node:child_process";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DuplicateUserError, type MatchResult } from "../src/persistence/repositories.js";
import { createPrismaClient, PrismaContentRepository, PrismaMatchRepository, PrismaUserRepository } from "../src/persistence/prisma.js";
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
    await db.auditLog.deleteMany(); // rows that point at users go first
    await db.contentDraft.deleteMany();
    await db.contentVersion.deleteMany();
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
    const result = (id: string, userId: string, placement: number, endedAt: Date, mode: MatchResult["mode"] = "queue"): MatchResult => ({
      matchId: id,
      mode,
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

  describe("leaderboard", () => {
    const one = (id: string, players: { userId: string | null; name: string; placement: number }[], mode: "queue" | "practice" = "queue"): MatchResult => ({
      matchId: id,
      mode,
      seed: 1,
      contentVersion: 1,
      startedAt: new Date("2026-10-01T10:00:00Z"),
      endedAt: new Date("2026-10-01T10:20:00Z"),
      players: players.map((p) => ({ ...p, isBot: p.userId === null, heroKey: null })),
    });

    it("ranks by average placement over queue matches only, with wins, top 4 and real usernames", async () => {
      const a = await newUser("alpha");
      const b = await newUser("bravo");
      const c = await newUser("charlie");
      // alpha: 1, 2, 5  -> avg 2.67, 1 win, 2 top-4 ; bravo: 3, 1, 1 -> avg 1.67 ; charlie: only 2 ranked games
      await matches.save(one("q1", [{ userId: a.id, name: "alpha", placement: 1 }, { userId: b.id, name: "bravo", placement: 3 }, { userId: c.id, name: "charlie", placement: 2 }, { userId: null, name: "Bot", placement: 4 }]));
      await matches.save(one("q2", [{ userId: a.id, name: "alpha", placement: 2 }, { userId: b.id, name: "bravo", placement: 1 }, { userId: c.id, name: "charlie", placement: 3 }]));
      await matches.save(one("q3", [{ userId: a.id, name: "alpha", placement: 5 }, { userId: b.id, name: "bravo", placement: 1 }]));
      // practice never counts, however well it went
      for (const id of ["p1", "p2", "p3"]) await matches.save(one(id, [{ userId: c.id, name: "charlie", placement: 1 }], "practice"));

      const board = await matches.leaderboard(10, 3);
      expect(board.map((r) => r.username)).toEqual(["bravo", "alpha"]);
      expect(board[0]).toMatchObject({ games: 3, wins: 2, top4: 3, avgPlacement: 1.67 });
      expect(board[1]).toMatchObject({ games: 3, wins: 1, top4: 2, avgPlacement: 2.67 });
      expect(await matches.leaderboard(1, 3)).toHaveLength(1);
      expect((await matches.leaderboard(10, 2)).map((r) => r.username)).toContain("charlie");

      const recent = await matches.recentForUser(c.id, 10);
      expect(recent.filter((m) => m.mode === "practice")).toHaveLength(3);
    });

    it("is empty when nobody has played enough", async () => {
      expect(await matches.leaderboard(10, 3)).toEqual([]);
    });

    it("stores last boards and relics, and sums them into card, hero and relic statistics", async () => {
      const at = new Date("2026-10-01T10:00:00Z");
      const p = (placement: number, isBot: boolean, board: string[], relics: string[]) => ({ userId: null, name: "x", isBot, heroKey: "h1", placement, board, relics });
      await matches.save({ matchId: "st1", mode: "queue", seed: 1, contentVersion: 1, startedAt: at, endedAt: at, players: [p(1, false, ["a", "b"], ["r1"]), p(2, true, ["b"], [])] });
      await matches.save({ matchId: "st2", mode: "quick", seed: 2, contentVersion: 1, startedAt: at, endedAt: at, players: [p(2, false, ["a"], [])] });
      const all = await matches.stats({});
      expect(all).toMatchObject({ matches: 2, players: 3 });
      expect(all.cards.find((c) => c.key === "a")).toMatchObject({ count: 2, avgPlacement: 1.5, winRate: 0.5 });
      expect(all.relics).toEqual([{ key: "r1", count: 1, pickRate: 0.333, avgPlacement: 1, winRate: 1 }]);
      expect(all.heroes[0]).toMatchObject({ key: "h1", count: 3 });
      const humansInQueue = await matches.stats({ humansOnly: true, modes: ["queue"] });
      expect(humansInQueue).toMatchObject({ matches: 1, players: 1 });
    });
  });

  describe("content versions", () => {
    const content = new PrismaContentRepository(db);
    // audit rows point at users, so they must go before the outer beforeEach clears the users
    const clean = async () => {
      await db.contentDraft.deleteMany();
      await db.auditLog.deleteMany();
      await db.contentVersion.deleteMany();
    };
    beforeEach(clean);
    afterEach(clean);

    it("numbers versions 1, 2, 3 and returns them newest first with the data intact", async () => {
      expect(await content.latest()).toBeUndefined();
      const admin = await newUser("editor");
      const v1 = await content.publish({ cards: [{ key: "a" }], note: "é ✓" }, null, null);
      const v2 = await content.publish({ cards: [] }, "second", admin.id);
      expect([v1.number, v2.number]).toEqual([1, 2]);
      expect((await content.latest())?.number).toBe(2);
      expect((await content.get(1))?.data).toEqual({ cards: [{ key: "a" }], note: "é ✓" });
      expect(await content.get(9)).toBeUndefined();
      const list = await content.list(10);
      expect(list.map((v) => v.number)).toEqual([2, 1]);
      expect(list[0]).toMatchObject({ notes: "second", publishedBy: admin.id });
      expect(list[0]).not.toHaveProperty("data");
    });

    it("two publishes at once never share a number", async () => {
      const results = await Promise.all(Array.from({ length: 4 }, (_, i) => content.publish({ i }, null, null)));
      expect(new Set(results.map((r) => r.number)).size).toBe(4);
      expect((await content.latest())?.number).toBe(4);
    });

    it("keeps one draft that is replaced on save and gone after clear", async () => {
      const admin = await newUser("drafter");
      expect(await content.loadDraft()).toBeUndefined();
      await content.saveDraft({ cards: [1] }, 1, admin.id);
      const second = await content.saveDraft({ cards: [1, 2] }, 3, admin.id);
      expect(second).toMatchObject({ basedOn: 3, updatedBy: admin.id });
      expect((await content.loadDraft())?.data).toEqual({ cards: [1, 2] });
      expect(await db.contentDraft.count()).toBe(1);
      await content.clearDraft();
      await content.clearDraft(); // clearing nothing is fine
      expect(await content.loadDraft()).toBeUndefined();
    });

    it("records an audit trail, newest first, including entries with nothing before or after", async () => {
      const admin = await newUser("auditor");
      await content.audit(admin.id, "content.draft", null, { cards: 3 });
      await content.audit(admin.id, "content.publish", { version: 1 }, { version: 2 });
      const entries = await content.recentAudit(10);
      expect(entries.map((e) => e.entity)).toEqual(["content.publish", "content.draft"]);
      expect(entries[1]).toMatchObject({ adminId: admin.id, before: null, after: { cards: 3 } });
    });

    it("a server restarts into the newest published version, and an edited card survives it", async () => {
      const { ContentService } = await import("../src/content/content.service.js");
      const { getRawContentSet } = await import("@herotime/content");
      const { starterContent } = await import("./fakes.js");
      const first = new ContentService(starterContent(), "prototype", getRawContentSet("prototype"));
      expect(await first.restore(content)).toBe("seeded");
      const admin = await newUser("publisher");
      const edited = structuredClone(first.authored()) as any;
      edited.cards.find((c: any) => c.key === "n1").atk = 4;
      expect(await first.publishData(content, edited, "tuned", admin.id)).toBe(2);

      const second = new ContentService(starterContent(), "prototype", getRawContentSet("prototype"));
      expect(await second.restore(content)).toBe("loaded");
      expect(second.latest.version).toBe(2);
      expect(second.latest.content.card("n1").atk).toBe(4);
      expect(await second.restore(content, true)).toBe("seeded"); // reseed publishes the configured set again
      expect(second.latest.version).toBe(3);
      expect(second.latest.content.card("n1").atk).toBe(2);
    });
  });
});

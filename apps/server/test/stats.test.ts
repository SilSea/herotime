import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { InMemoryMatchRepository } from "../src/persistence/in-memory.js";
import type { MatchResult } from "../src/persistence/repositories.js";
import { api, connect, newUser, startServer, type TestServer } from "./e2e-helpers.js";

let server: TestServer;
beforeAll(async () => {
  server = await startServer();
}, 30_000);
afterAll(() => server.close());

const result = (id: string, mode: MatchResult["mode"], players: { userId: string | null; name: string; placement: number }[]): MatchResult => ({
  matchId: id,
  mode,
  seed: 1,
  contentVersion: 1,
  startedAt: new Date(),
  endedAt: new Date(),
  players: players.map((p) => ({ ...p, isBot: p.userId === null, heroKey: "iron_guard" })),
});

describe("match history", () => {
  it("needs a login and lists only the caller's matches, newest first, without anyone's ids", async () => {
    expect((await api(server, "/me/matches")).status).toBe(401);
    const me = await newUser(server);
    const other = await newUser(server);
    await server.matches.save(result("m-old", "queue", [{ userId: me.id, name: me.username, placement: 3 }, { userId: other.id, name: other.username, placement: 1 }]));
    await server.matches.save(result("m-other", "queue", [{ userId: other.id, name: other.username, placement: 2 }]));
    await server.matches.save(result("m-new", "practice", [{ userId: me.id, name: me.username, placement: 1 }, { userId: null, name: "Bot 1", placement: 2 }]));

    const res = await api(server, "/me/matches", undefined, me.token);
    expect(res.status).toBe(200);
    expect(res.body.matches.map((m: any) => m.matchId)).toEqual(["m-new", "m-old"]);
    expect(res.body.matches[0]).toMatchObject({ mode: "practice", placement: 1, heroKey: "iron_guard" });
    expect(res.body.matches[1].players.find((p: any) => p.me)).toMatchObject({ placement: 3 });
    expect(JSON.stringify(res.body)).not.toContain(other.id);
  });

  it("a real practice match played to the end shows up as practice", async () => {
    const u = await newUser(server);
    const c = await connect(server, u.token);
    expect((await c.call("queue:practice", { bots: 1, speed: "fast" })).ok).toBe(true);
    await c.waitFor("match:view");
    await c.call("match:intent", { type: "SURRENDER" });
    await c.waitFor("match:event", (p) => p.event.type === "ENDED", 10_000);
    await new Promise((r) => setTimeout(r, 100));
    const res = await api(server, "/me/matches", undefined, u.token);
    expect(res.body.matches[0]).toMatchObject({ mode: "practice", placement: 2 });
    c.close();
  }, 30_000);
});

describe("leaderboard", () => {
  it("is public, counts queue matches only, and needs 3 of them", async () => {
    const repo = server.matches as InMemoryMatchRepository;
    const a = await newUser(server);
    const b = await newUser(server);
    for (let i = 0; i < 3; i++) await repo.save(result(`lb-q${i}`, "queue", [{ userId: a.id, name: a.username, placement: 2 }, { userId: b.id, name: b.username, placement: 1 }]));
    for (let i = 0; i < 5; i++) await repo.save(result(`lb-p${i}`, "practice", [{ userId: a.id, name: a.username, placement: 1 }]));

    const res = await api(server, "/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body.minGames).toBe(3);
    const names = res.body.players.map((p: any) => p.username);
    expect(names.indexOf(b.username)).toBeLessThan(names.indexOf(a.username));
    expect(res.body.players.find((p: any) => p.username === a.username)).toMatchObject({ games: 3, wins: 0, top4: 3, avgPlacement: 2 });
    expect(res.body.players.find((p: any) => p.username === b.username)).toMatchObject({ games: 3, wins: 3, avgPlacement: 1 });
    expect(res.body.players[0].rank).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain(a.id);
  });
});

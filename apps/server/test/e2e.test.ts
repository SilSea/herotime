import { JwtService } from "@nestjs/jwt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LobbyService } from "../src/game/lobby.service.js";
import { api, Client, connect, newUser, startServer, type TestServer } from "./e2e-helpers.js";

let server: TestServer;
const clients: Client[] = [];
const track = (c: Client): Client => (clients.push(c), c);

beforeAll(async () => {
  server = await startServer();
}, 30_000);

afterAll(async () => {
  for (const c of clients) c.close();
  await server.close();
});

describe("HTTP auth", () => {
  it("health check needs no login", async () => {
    expect(await api(server, "/health")).toMatchObject({ status: 200, body: { ok: true } });
  });

  it("registers a player and returns a token without ever exposing the password hash", async () => {
    const res = await api(server, "/auth/register", { username: "first_rider", email: "first@test.dev", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ username: "first_rider", role: "PLAYER" });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash|\$2[aby]\$/i);
  });

  it("refuses a duplicate username or email, case-insensitively", async () => {
    await api(server, "/auth/register", { username: "dupe_user", email: "dupe@test.dev", password: "password123" });
    const sameName = await api(server, "/auth/register", { username: "DUPE_USER", email: "other@test.dev", password: "password123" });
    const sameMail = await api(server, "/auth/register", { username: "someone_else", email: "DUPE@test.dev", password: "password123" });
    expect(sameName.status).toBe(409);
    expect(sameMail.status).toBe(409);
  });

  it("rejects malformed registrations with a useful message", async () => {
    const bad = await api(server, "/auth/register", { username: "x", email: "nope", password: "short" });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toMatch(/username/);
    expect(JSON.stringify(bad.body)).toMatch(/email/);
    expect(JSON.stringify(bad.body)).toMatch(/password/);
  });

  it("will not let a client choose its own role", async () => {
    const res = await api(server, "/auth/register", { username: "wannabe_admin", email: "w@test.dev", password: "password123", role: "ADMIN" });
    expect(res.status).toBe(400);
    expect((await server.users.findByUsername("wannabe_admin"))).toBeUndefined();
  });

  it("logs in with the right password and returns the same identity", async () => {
    const reg = await api(server, "/auth/register", { username: "login_user", email: "l@test.dev", password: "password123" });
    const res = await api(server, "/auth/login", { username: "LOGIN_USER", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe(reg.body.user.id);
  });

  it("gives the same error for a wrong password and an unknown user", async () => {
    await api(server, "/auth/register", { username: "known_user", email: "k@test.dev", password: "password123" });
    const wrong = await api(server, "/auth/login", { username: "known_user", password: "wrong-password" });
    const unknown = await api(server, "/auth/login", { username: "nobody_here", password: "wrong-password" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("rate-limits repeated login attempts", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 14; i++) statuses.push((await api(server, "/auth/login", { username: "hammered", password: `guess${i}` })).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10).every((s) => s === 429)).toBe(true);
  });

  it("/me needs a valid token", async () => {
    const u = await newUser(server);
    expect((await api(server, "/me", undefined, u.token)).body).toMatchObject({ id: u.id, username: u.username });
    expect((await api(server, "/me")).status).toBe(401);
    expect((await api(server, "/me", undefined, "garbage")).status).toBe(401);
  });

  it("rejects a token signed with another secret and an expired one", async () => {
    const u = await newUser(server);
    const forged = await new JwtService({ secret: "another-secret-another-secret-12345" }).signAsync({ sub: u.id, name: u.username, role: "ADMIN" });
    expect((await api(server, "/me", undefined, forged)).status).toBe(401);
    const expired = await new JwtService({ secret: server.config.jwtSecret }).signAsync({ sub: u.id, name: u.username, role: "PLAYER" }, { expiresIn: -10 });
    expect((await api(server, "/me", undefined, expired)).status).toBe(401);
  });

  it("a token for a user that no longer exists is useless", async () => {
    const ghost = await new JwtService({ secret: server.config.jwtSecret }).signAsync({ sub: "no-such-user", name: "ghost", role: "PLAYER" });
    expect((await api(server, "/me", undefined, ghost)).status).toBe(401);
  });
});

describe("socket auth", () => {
  it("disconnects a client with no token", async () => {
    const c = track(new Client(server.url, undefined));
    expect((await c.waitFor("auth:error")).error).toMatch(/token/);
    await c.waitForDisconnect();
  });

  it("disconnects a client with a bad or forged token", async () => {
    const bad = track(new Client(server.url, "not-a-jwt"));
    await bad.waitFor("auth:error");
    await bad.waitForDisconnect();

    const forged = await new JwtService({ secret: "another-secret-another-secret-12345" }).signAsync({ sub: "x", name: "x", role: "ADMIN" });
    const c = track(new Client(server.url, forged));
    await c.waitFor("auth:error");
    await c.waitForDisconnect();
  });

  it("does nothing for messages from an unauthenticated socket", async () => {
    const c = track(new Client(server.url, undefined));
    await c.waitForDisconnect(4000).catch(() => undefined);
    // the socket is gone, so any attempt just never gets an ack
    await expect(c.call("queue:join", undefined, 300)).rejects.toThrow(/no ack/);
  });

  it("a valid token starts idle", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    expect(c.seen[0]?.payload).toEqual({ state: "idle" });
  });
});

describe("a full match over sockets", () => {
  it("queue -> hero select -> recruit -> battle -> result saved, then queue again", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));

    const ack = await c.call("queue:join");
    expect(ack).toMatchObject({ ok: true, status: { state: "queued" } });

    const first = await c.waitFor("match:view");
    expect(first.view.phase).toBe("HERO_SELECT");
    expect(first.view.me.id).toBe(u.id);
    expect(first.view.me.heroOptions).toHaveLength(2);
    expect(first.view.players).toHaveLength(8);
    expect((await c.waitFor("queue:status", (s) => s.state === "playing")).matchId).toBe(first.matchId);

    expect(await c.intent({ type: "CHOOSE_HERO", index: 0 })).toEqual({ ok: true });
    const recruit = await c.waitFor("match:view", (p) => p.view.phase === "RECRUIT");
    expect(recruit.view.turn).toBe(1);
    expect(recruit.view.me.state.energy).toBe(3);

    // act like a player: buy, play, ready
    const bought = await c.intent({ type: "BUY", index: 0 });
    expect(bought).toEqual({ ok: true });
    expect(await c.intent({ type: "PLAY", handIndex: 0, position: 0 })).toEqual({ ok: true });
    const mine = await c.waitFor("match:view", (p) => p.view.me.state.board.length === 1);
    expect(mine.view.me.boardStats).toHaveLength(1);
    expect(await c.intent({ type: "READY" })).toEqual({ ok: true });

    const battle = await c.waitFor("match:view", (p) => p.view.phase === "BATTLE");
    expect(battle.view.lastCombat.turn).toBe(1);
    expect(battle.view.lastCombat.result.events.length).toBeGreaterThanOrEqual(0);

    const ended = await c.waitFor("match:event", (p) => p.event.type === "ENDED", 20_000);
    expect(ended.event.placements.map((p: { placement: number }) => p.placement)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    // the result is stored once, with this player attached
    await new Promise((r) => setTimeout(r, 50));
    const saved = server.matches.results.find((r) => r.matchId === first.matchId);
    expect(saved).toBeDefined();
    expect(saved?.players.find((p) => p.userId === u.id)?.placement).toBeGreaterThanOrEqual(1);
    expect(saved?.players.filter((p) => p.isBot)).toHaveLength(7);

    // and the player may queue again straight away
    expect(await c.call("queue:join")).toMatchObject({ ok: true, status: { state: "queued" } });
    await c.call("queue:leave");
  }, 40_000);
});

describe("intent safety", () => {
  it("rejects malformed intents without hurting the connection", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    await c.call("queue:join");
    await c.waitFor("match:view");

    for (const bad of [null, "BUY", {}, { type: "NOPE" }, { type: "BUY", index: "1" }, { type: "BUY", index: -1 }, { type: "READY", cheat: true }, [1, 2, 3]]) {
      expect(await c.intent(bad), JSON.stringify(bad)).toEqual({ ok: false, error: "malformed intent" });
    }
    expect(await c.intent({ type: "CHOOSE_HERO", index: 0 })).toEqual({ ok: true }); // still working
  }, 20_000);

  it("explains rule violations with the engine's message", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    await c.call("queue:join");
    await c.waitFor("match:view");
    const early = await c.intent({ type: "BUY", index: 0 }); // still choosing a hero
    expect(early.ok).toBe(false);
    expect(early.error).toMatch(/recruiting/);
    await c.intent({ type: "CHOOSE_HERO", index: 0 });
    await c.waitFor("match:view", (p) => p.view.phase === "RECRUIT");
    const broke = await c.intent({ type: "UPGRADE" });
    expect(broke.ok).toBe(false);
    expect(broke.error).toMatch(/energy/);
  }, 20_000);

  it("refuses intents when not in a match", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    expect(await c.intent({ type: "READY" })).toEqual({ ok: false, error: "you are not in a match" });
  });

  it("throttles a flood of messages", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    const acks = await Promise.all(Array.from({ length: 120 }, () => c.intent({ type: "READY" })));
    expect(acks.some((a) => a.error === "slow down")).toBe(true);
    expect(acks.filter((a) => a.error === "slow down").length).toBeGreaterThan(50);
  });

  it("never leaks an internal error message", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    const ack = await c.intent({ type: "PLAY", handIndex: 99, position: 99 });
    expect(JSON.stringify(ack)).not.toMatch(/at .*\.ts|stack|node_modules/);
  });
});

describe("queue behaviour", () => {
  it("a queued player who disconnects gives up their seat", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    const lobby = server.app.get(LobbyService);
    const before = lobby.waiting;
    await c.call("queue:join");
    expect(lobby.waiting).toBe(before + 1);
    c.close();
    await new Promise((r) => setTimeout(r, 80));
    expect(lobby.waiting).toBe(before);
  });

  it("a second tab keeps the player in the queue when the first closes", async () => {
    const u = await newUser(server);
    const a = track(await connect(server, u.token));
    const b = track(await connect(server, u.token));
    const lobby = server.app.get(LobbyService);
    await a.call("queue:join");
    const waiting = lobby.waiting;
    a.close();
    await new Promise((r) => setTimeout(r, 80));
    expect(lobby.waiting).toBe(waiting); // still queued through tab b
    await b.call("queue:leave");
  });

  it("two humans end up in the same match, each seeing only their own private data", async () => {
    const [ua, ub] = [await newUser(server), await newUser(server)];
    const [a, b] = [track(await connect(server, ua.token)), track(await connect(server, ub.token))];
    await Promise.all([a.call("queue:join"), b.call("queue:join")]);
    const [va, vb] = await Promise.all([a.waitFor("match:view"), b.waitFor("match:view")]);
    expect(va.matchId).toBe(vb.matchId);
    expect(va.view.me.id).toBe(ua.id);
    expect(vb.view.me.id).toBe(ub.id);
    expect(va.view.players.filter((p: { isBot: boolean }) => !p.isBot)).toHaveLength(2);

    await Promise.all([a.intent({ type: "CHOOSE_HERO", index: 0 }), b.intent({ type: "CHOOSE_HERO", index: 0 })]);
    const [ra, rb] = await Promise.all([
      a.waitFor("match:view", (p) => p.view.phase === "RECRUIT"),
      b.waitFor("match:view", (p) => p.view.phase === "RECRUIT"),
    ]);

    const allowed = ["id", "name", "isBot", "hp", "armor", "alive", "placement", "hero", "rank", "relics", "ready"].sort();
    for (const r of [ra, rb]) {
      for (const p of r.view.players) expect(Object.keys(p).sort().filter((k) => !allowed.includes(k))).toEqual([]);
    }
    // my shop is mine: B's private shop must not appear in A's payload
    const bShop: string[] = rb.view.me.state.shop;
    const aPayload = JSON.stringify({ ...ra.view, me: undefined });
    for (const card of bShop) expect(aPayload).not.toContain(`"shop":["${card}`);
    expect(ra.view.me.state).not.toEqual(rb.view.me.state);
  }, 20_000);
});

describe("reconnecting", () => {
  it("a player who reconnects mid-match is put straight back in and sees the full state", async () => {
    const u = await newUser(server);
    const first = track(await connect(server, u.token));
    await first.call("queue:join");
    const started = await first.waitFor("match:view");
    await first.intent({ type: "CHOOSE_HERO", index: 0 });
    await first.waitFor("match:view", (p) => p.view.phase === "RECRUIT");
    first.close();
    await new Promise((r) => setTimeout(r, 60));

    const again = track(new Client(server.url, u.token));
    const status = await again.waitFor("queue:status");
    expect(status).toMatchObject({ state: "playing", matchId: started.matchId, ended: false });
    const view = await again.waitFor("match:view");
    expect(view.matchId).toBe(started.matchId);
    expect(view.view.me.id).toBe(u.id);
    expect(view.view.me.state.hero).toBeDefined(); // the hero chosen before the drop is still there
    expect(await again.intent({ type: "READY" })).toEqual({ ok: true }); // and it can keep playing
  }, 20_000);

  it("match:sync re-sends the current view on request", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    await c.call("queue:join");
    await c.waitFor("match:view");
    const before = c.views().length;
    expect(await c.call("match:sync")).toMatchObject({ ok: true });
    await c.waitFor("match:view", () => true, 2000, 0);
    await new Promise((r) => setTimeout(r, 50));
    expect(c.views().length).toBeGreaterThan(before);
  }, 20_000);
});

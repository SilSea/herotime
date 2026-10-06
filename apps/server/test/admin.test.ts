import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newUser, startServer, type TestServer } from "./e2e-helpers.js";

let server: TestServer;
let admin: { token: string; id: string };
let player: { token: string };

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${server.url}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

beforeAll(async () => {
  server = await startServer({ adminUsers: ["boss"] });
  admin = await newUser(server, "Boss"); // the list is case-insensitive
  player = await newUser(server);
}, 30_000);

afterAll(() => server.close());

describe("who may edit content", () => {
  it("the role comes from ADMIN_USERS, never from the sign-up request", async () => {
    const me = await call("GET", "/me", admin.token);
    expect(me.body.role).toBe("ADMIN");
    expect((await call("GET", "/me", player.token)).body.role).toBe("PLAYER");

    const sneaky = await call("POST", "/auth/register", undefined, { username: "sneaky_one", email: "s@test.dev", password: "password123", role: "ADMIN" });
    expect(sneaky.status).toBe(400); // unknown fields are refused outright
    expect(await server.users.findByUsername("sneaky_one")).toBeUndefined();
  });

  it("every admin route refuses anonymous callers and plain players", async () => {
    for (const [m, p] of [["GET", "/admin/draft"], ["PUT", "/admin/draft"], ["POST", "/admin/publish"], ["GET", "/admin/versions"], ["GET", "/admin/audit"], ["POST", "/admin/draft/reset"], ["POST", "/admin/versions/1/restore"]] as const) {
      expect((await call(m, p)).status, `${m} ${p} anonymous`).toBe(401);
      expect((await call(m, p, player.token, m === "PUT" ? { data: {} } : undefined)).status, `${m} ${p} player`).toBe(403);
    }
  });
});

describe("content versions", () => {
  it("the seeded set is version 1, and /content says so", async () => {
    const v = await call("GET", "/admin/versions", admin.token);
    expect(v.body.current).toBe(1);
    expect(v.body.versions).toHaveLength(1);
    expect(v.body.versions[0]).toMatchObject({ number: 1, publishedBy: null });
    expect((await call("GET", "/content")).body).toMatchObject({ set: "prototype", version: 1 });
  });

  it("with no draft saved, the working copy is the published content, as authored", async () => {
    const d = await call("GET", "/admin/draft", admin.token);
    expect(d.body).toMatchObject({ saved: false, published: 1, basedOn: 1, issues: [] });
    expect(d.body.data.cards.length).toBeGreaterThan(10);
    // rules text is generated at load time, so the stored copy has none to go stale
    expect(d.body.data.cards.find((c: any) => c.key === "rd1").text ?? "").toBe("");
    expect(d.body.snapshot.cards.find((c: any) => c.key === "rd1").text).toMatch(/Henshin/);
  });

  it("saves a draft, reports problems instead of refusing work in progress, and refuses to publish it", async () => {
    const d = (await call("GET", "/admin/draft", admin.token)).body;
    const broken = structuredClone(d.data);
    broken.cards.find((c: any) => c.key === "rd1").series = "no-such-series";
    const saved = await call("PUT", "/admin/draft", admin.token, { data: broken });
    expect(saved.status).toBe(200);
    expect(saved.body.saved).toBe(true);
    expect(saved.body.issues.join("\n")).toMatch(/unknown series "no-such-series"/);
    expect(saved.body.snapshot).toBeNull();

    const refused = await call("POST", "/admin/publish", admin.token, {});
    expect(refused.status).toBe(422);
    expect(refused.body.issues.join("\n")).toMatch(/no-such-series/);
    expect((await call("GET", "/content")).body.version).toBe(1);
    await call("POST", "/admin/draft/reset", admin.token);
  });

  it("rejects a body that is not content", async () => {
    expect((await call("PUT", "/admin/draft", admin.token, { data: [1, 2] })).status).toBe(400);
    expect((await call("PUT", "/admin/draft", admin.token, {})).status).toBe(400);
  });

  it("publishing a fixed draft makes a new version that new matches use; reset discards a draft", async () => {
    const d = (await call("GET", "/admin/draft", admin.token)).body;
    const edited = structuredClone(d.data);
    edited.cards.find((c: any) => c.key === "n1").atk = 3;
    edited.cards.find((c: any) => c.key === "n1").name = "Veteran Fighter";
    const saved = await call("PUT", "/admin/draft", admin.token, { data: edited });
    expect(saved.body.issues, JSON.stringify(saved.body.issues)).toEqual([]);
    expect(saved.body.snapshot.cards.find((c: any) => c.key === "n1")).toMatchObject({ atk: 3, name: "Veteran Fighter" });

    const pub = await call("POST", "/admin/publish", admin.token, { notes: "  buff the fighter  " });
    expect(pub.status).toBe(201);
    expect(pub.body.version).toBe(2);

    const live = (await call("GET", "/content")).body;
    expect(live.version).toBe(2);
    expect(live.cards.find((c: any) => c.key === "n1")).toMatchObject({ atk: 3, name: "Veteran Fighter" });
    expect(server.content.latest.version).toBe(2);
    expect(server.content.latest.content.card("n1").atk).toBe(3);

    // the draft is spent, and the old version is still there for clients that need it
    expect((await call("GET", "/admin/draft", admin.token)).body.saved).toBe(false);
    const old = await call("GET", "/content/1");
    expect(old.status).toBe(200);
    expect(old.body.cards.find((c: any) => c.key === "n1").atk).toBe(2);
    expect((await call("GET", "/content/99")).status).toBe(404);

    const versions = (await call("GET", "/admin/versions", admin.token)).body;
    expect(versions.current).toBe(2);
    expect(versions.versions.map((v: any) => v.number)).toEqual([2, 1]);
    expect(versions.versions[0]).toMatchObject({ notes: "buff the fighter", publishedBy: admin.id });
  });

  it("publishing with no draft is an error, and a stale draft needs force", async () => {
    expect((await call("POST", "/admin/publish", admin.token, {})).status).toBe(400);

    const d = (await call("GET", "/admin/draft", admin.token)).body;
    await call("PUT", "/admin/draft", admin.token, { data: d.data }); // started from version 2
    // someone else publishes meanwhile
    server.content.publish(server.content.latest.content);
    const stale = await call("POST", "/admin/publish", admin.token, {});
    expect(stale.status).toBe(409);
    expect(stale.body.message).toMatch(/force/);
    const forced = await call("POST", "/admin/publish", admin.token, { force: true });
    expect(forced.status).toBe(201);
    expect(forced.body.version).toBeGreaterThan(3 - 1);
  });

  it("restoring an old version copies it into the draft; it is live only once published", async () => {
    const before = server.content.latest.version;
    const r = await call("POST", "/admin/versions/1/restore", admin.token);
    expect(r.status).toBe(201);
    expect(r.body.saved).toBe(true);
    expect(r.body.snapshot.cards.find((c: any) => c.key === "n1").atk).toBe(2);
    expect(server.content.latest.version).toBe(before);
    expect((await call("POST", "/admin/versions/777/restore", admin.token)).status).toBe(404);

    expect((await call("POST", "/admin/draft/reset", admin.token)).body.saved).toBe(false);
  });

  it("keeps an audit trail of who did what", async () => {
    const a = (await call("GET", "/admin/audit", admin.token)).body.entries;
    const kinds = a.map((e: any) => e.entity);
    expect(kinds).toEqual(expect.arrayContaining(["content.draft", "content.publish", "content.restore", "content.draft.reset"]));
    expect(a.every((e: any) => e.adminId === admin.id)).toBe(true);
  });
});

describe("matches keep the content they started with", () => {
  it("a match started before a publish still reports its own version", async () => {
    const { MatchRegistry } = await import("../src/game/match.registry.js");
    const before = server.content.latest.version;
    const registry = server.app.get(MatchRegistry);
    const runner = registry.startMatch([{ id: "h1", name: "H" }], { size: 2 });
    expect(runner.meta.contentVersion).toBe(before);

    const d = (await call("GET", "/admin/draft", admin.token)).body;
    await call("PUT", "/admin/draft", admin.token, { data: d.data });
    await call("POST", "/admin/publish", admin.token, { force: true });
    expect(server.content.latest.version).toBe(before + 1);
    expect(runner.meta.contentVersion).toBe(before);
    registry.release("h1");
  });
});

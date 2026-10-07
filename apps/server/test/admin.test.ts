import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newUser, startServer, type TestServer } from "./e2e-helpers.js";

let server: TestServer;
const uploadDir = mkdtempSync(join(tmpdir(), "herotime-art-"));
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
  server = await startServer({ adminUsers: ["boss"], uploadDir });
  admin = await newUser(server, "Boss"); // the list is case-insensitive
  player = await newUser(server);
}, 30_000);

afterAll(async () => {
  await server.close();
  rmSync(uploadDir, { recursive: true, force: true });
});

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
    runner.stop(); // nobody plays it: left running, it would end (and be saved) during a later test
    registry.release("h1");
  });
});

describe("sandbox simulation", () => {
  it("needs an admin, and reports on the draft or the published content", async () => {
    expect((await call("POST", "/admin/simulate", player.token, {})).status).toBe(403);
    const r = await call("POST", "/admin/simulate", admin.token, { matches: 3, seed: 2 });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ target: "draft", requested: 3, expected: 4.5 });
    expect(r.body.matches).toBeGreaterThan(0);
    expect(r.body.heroes.length).toBeGreaterThan(0);
    const pub = await call("POST", "/admin/simulate", admin.token, { matches: 2, target: "published" });
    expect(pub.body.target).toBe("published");
  }, 60_000);

  it("caps the number of matches and refuses a draft that is not playable", async () => {
    const big = await call("POST", "/admin/simulate", admin.token, { matches: 100000, seed: 1 });
    expect(big.body.requested).toBe(300);
    const d = (await call("GET", "/admin/draft", admin.token)).body;
    const broken = structuredClone(d.data);
    broken.cards[0].series = "nope";
    await call("PUT", "/admin/draft", admin.token, { data: broken });
    const refused = await call("POST", "/admin/simulate", admin.token, {});
    expect(refused.status).toBe(422);
    expect(refused.body.issues.join()).toMatch(/nope/);
    await call("POST", "/admin/draft/reset", admin.token);
  }, 90_000);
});

describe("statistics from saved matches", () => {
  it("needs an admin; counts cards on last boards, heroes and relics; filters bots and modes; suggests relic weights", async () => {
    expect((await call("GET", "/admin/stats", player.token)).status).toBe(403);
    const relic = [...server.content.latest.content.relics.keys()][0] as string;
    const at = new Date();
    const line = (placement: number, isBot: boolean, board: string[], relics: string[] = []) => ({ userId: isBot ? null : "u", name: "x", isBot, heroKey: "h1", placement, board, relics });
    for (let i = 0; i < 6; i++) {
      await server.matches.save({ matchId: `s${i}`, mode: "queue", seed: i, contentVersion: 1, startedAt: at, endedAt: at, players: [line(1, false, ["a", "a", "b"], [relic]), line(2, true, ["b"])] });
    }
    await server.matches.save({ matchId: "p", mode: "practice", seed: 9, contentVersion: 1, startedAt: at, endedAt: at, players: [line(2, false, ["c"])] });

    const all = (await call("GET", "/admin/stats", admin.token)).body;
    expect(all).toMatchObject({ matches: 7, players: 13 });
    expect(all.cards.find((c: { key: string }) => c.key === "a")).toMatchObject({ count: 6, avgPlacement: 1, winRate: 1 }); // a card counts once per board
    expect(all.cards.find((c: { key: string }) => c.key === "b")).toMatchObject({ count: 12, avgPlacement: 1.5 });

    const humans = (await call("GET", "/admin/stats?humans=1&modes=queue", admin.token)).body;
    expect(humans).toMatchObject({ matches: 6, players: 6 });
    expect(humans.cards.find((c: { key: string }) => c.key === "c")).toBeUndefined();

    const w = all.relicWeights.find((x: { key: string }) => x.key === relic);
    expect(w.samples).toBe(6);
    expect(w.suggested).toBeLessThan(w.weight); // its holders always win: offer it less
  });
});

describe("request size", () => {
  it("only the admin upload accepts bodies over 4 MB", async () => {
    const big = "x".repeat(5 * 1024 * 1024);
    const signup = await fetch(`${server.url}/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "big", email: "big@x.dev", password: big }) });
    expect(signup.status).toBe(413);
    const upload = await call("POST", "/admin/upload", admin.token, { data: big });
    expect(upload.status).toBe(400); // let through, then refused as not a picture or a sound
  });
});

describe("card art upload", () => {
  // 1x1 transparent PNG
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const b64 = (b: Buffer): string => b.toString("base64");

  it("is for admins only", async () => {
    expect((await call("POST", "/admin/upload", undefined, { data: b64(PNG) })).status).toBe(401);
    expect((await call("POST", "/admin/upload", player.token, { data: b64(PNG) })).status).toBe(403);
    expect((await call("GET", "/admin/uploads", player.token)).status).toBe(403);
  });

  it("stores a PNG under a name made from its bytes, serves it, and stores a duplicate once", async () => {
    const a = await call("POST", "/admin/upload", admin.token, { data: b64(PNG) });
    expect(a.status).toBe(201);
    expect(a.body.file).toMatch(/^[0-9a-f]{16}\.png$/);
    expect(a.body.url).toBe("/art/" + a.body.file);
    const again = await call("POST", "/admin/upload", admin.token, { data: "data:image/png;base64," + b64(PNG) });
    expect(again.body.file).toBe(a.body.file);
    expect(readdirSync(uploadDir)).toEqual([a.body.file]);

    const res = await fetch(server.url + a.body.url);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/image\/png/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toMatch(/immutable/);
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);

    const list = await call("GET", "/admin/uploads", admin.token);
    expect(list.body.files.map((f: any) => f.file)).toEqual([a.body.file]);
  });

  it("decides the type from the bytes, not from anything the client says", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await call("POST", "/admin/upload", admin.token, { data: b64(svg), name: "x.png" })).status).toBe(400);
    expect((await call("POST", "/admin/upload", admin.token, { data: b64(Buffer.from("just text")) })).status).toBe(400);
    const disguised = Buffer.concat([Buffer.from("<html>"), PNG]);
    expect((await call("POST", "/admin/upload", admin.token, { data: b64(disguised) })).status).toBe(400);
    for (const bad of [undefined, "", 5, "!!!!"]) expect((await call("POST", "/admin/upload", admin.token, { data: bad })).status, String(bad)).toBe(400);
    const jpg = await call("POST", "/admin/upload", admin.token, { data: b64(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20, 1)])) });
    expect(jpg.body.file).toMatch(/\.jpg$/);
  });

  it("refuses an image over the size limit before decoding it", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(1_600_000)]);
    const r = await call("POST", "/admin/upload", admin.token, { data: b64(big) });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/too large/);
  });

  it("never turns a client-supplied path into a file path", async () => {
    expect((await fetch(server.url + "/art/..%2f..%2fpackage.json")).status).toBe(404);
    expect((await fetch(server.url + "/art/../package.json")).status).toBe(404);
    expect((await fetch(server.url + "/art/0000000000000000.png")).status).toBe(404);
  });
});

describe("game rules in content", () => {
  it("a draft can set rule numbers; bad ones are reported; published ones reach /content", async () => {
    const d = (await call("GET", "/admin/draft", admin.token)).body;
    const bad = structuredClone(d.data);
    bad.rules = { buyCost: -1, boardSize: 99, nonsense: 1 };
    const refused = await call("PUT", "/admin/draft", admin.token, { data: bad });
    expect(refused.body.issues.join("\n")).toMatch(/rules/);

    const good = structuredClone(d.data);
    good.rules = { buyCost: 2, giantSentaiScale: 0.75 };
    const saved = await call("PUT", "/admin/draft", admin.token, { data: good });
    expect(saved.body.issues).toEqual([]);
    expect((await call("POST", "/admin/publish", admin.token, { force: true })).status).toBe(201);
    const live = (await call("GET", "/content")).body;
    expect(live.rules).toEqual({ buyCost: 2, giantSentaiScale: 0.75 });
    expect(server.content.latest.content.rules).toEqual({ buyCost: 2, giantSentaiScale: 0.75 });
  });
});

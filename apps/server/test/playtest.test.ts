import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, connect, getJson, newUser, startServer, type TestServer } from "./e2e-helpers.js";

let server: TestServer;
let webDir: string;
const clients: Client[] = [];
const track = (c: Client): Client => (clients.push(c), c);

beforeAll(async () => {
  webDir = mkdtempSync(join(tmpdir(), "herotime-web-"));
  writeFileSync(join(webDir, "index.html"), "<!doctype html><title>herotime test page</title>");
  writeFileSync(join(webDir, "app.js"), "export const hello = 1;");
  server = await startServer({ webDir });
}, 30_000);

afterAll(async () => {
  for (const c of clients) c.close();
  await server.close();
  rmSync(webDir, { recursive: true, force: true });
});

describe("GET /content", () => {
  it("serves everything the client needs to draw cards", async () => {
    const res = await fetch(`${server.url}/content`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/json/);
    expect(res.headers.get("cache-control")).toBe("no-cache");
    const body: any = await res.json();
    expect(body).toMatchObject({ set: "prototype", version: 1 });
    expect(body.factions).toHaveLength(7);
    expect(body.cards.length).toBeGreaterThan(50);
    expect(body.heroes.length).toBeGreaterThanOrEqual(6);
    expect(body.relics.length).toBe(21);
    expect(body.series.length).toBeGreaterThan(0);
    expect(body.gauges.length).toBe(2);
  });

  it("includes generated rules text and display names", async () => {
    const body = await getJson(`${server.url}/content`);
    const owner = body.cards.find((c: { key: string }) => c.key === "al1");
    expect(owner.name).toBe("Cafe Owner");
    expect(owner.text).toMatch(/End of turn/);
    const hero = body.heroes.find((h: { key: string }) => h.key === "red_leader");
    expect(hero.text).toMatch(/Hero Power/);
  });

  it("needs no login and exposes nothing private", async () => {
    const text = await (await fetch(`${server.url}/content`)).text();
    expect(text).not.toMatch(/password|secret|token_|jwt/i);
  });
});

describe("static web files", () => {
  it("serves the client at / and its files", async () => {
    const index = await fetch(`${server.url}/`);
    expect(index.status).toBe(200);
    expect(await index.text()).toContain("herotime test page");
    const js = await fetch(`${server.url}/app.js`);
    expect(js.status).toBe(200);
    expect(await js.text()).toContain("hello");
  });

  it("does not let a path climb out of the web folder", async () => {
    for (const path of ["/../package.json", "/%2e%2e/package.json", "/..%2fpackage.json", "/%2e%2e%2f%2e%2e%2fpackage.json"]) {
      const res = await fetch(`${server.url}${path}`);
      const text = await res.text();
      expect(text, path).not.toContain("@herotime/server");
    }
  });

  it("API routes still win over static files", async () => {
    expect((await fetch(`${server.url}/health`)).status).toBe(200);
  });
});

describe("practice mode over sockets", () => {
  it("starts a match right away with the chosen factions, table size and a private view", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    const ack = await c.call("queue:practice", { factions: ["rider", "sentai"], bots: 3 });
    expect(ack).toMatchObject({ ok: true, status: { state: "playing", ended: false } });

    const first = await c.waitFor("match:view");
    expect(first.view.phase).toBe("HERO_SELECT");
    expect(first.view.players).toHaveLength(4);
    expect(first.view.players.filter((p: { isBot: boolean }) => p.isBot)).toHaveLength(3);
    expect(first.view.factions).toEqual(["rider", "sentai"]);
    expect((await c.waitFor("queue:status", (s) => s.state === "playing")).matchId).toBe(first.matchId);
  });

  it("with no options it is a full 8-player table with the random faction pick", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    await c.call("queue:practice", {});
    const first = await c.waitFor("match:view");
    expect(first.view.players).toHaveLength(8);
    expect(first.view.factions).toHaveLength(5); // 5 of the 7 factions
  });

  it("accepts no payload at all", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    expect(await c.call("queue:practice")).toMatchObject({ ok: true });
  });

  it("rejects bad options and unknown factions with a clear message, without starting anything", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    expect(await c.call("queue:practice", { bots: 99 })).toEqual({ ok: false, error: "malformed practice options" });
    expect(await c.call("queue:practice", { speed: "warp" })).toEqual({ ok: false, error: "malformed practice options" });
    expect(await c.call("queue:practice", { cheat: true })).toEqual({ ok: false, error: "malformed practice options" });
    const unknown = await c.call("queue:practice", { factions: ["ghost"] });
    expect(unknown.ok).toBe(false);
    expect(unknown.error).toMatch(/unknown faction: ghost \(available: rider, sentai, mecha/);
    expect(await c.call("queue:join")).toMatchObject({ ok: true, status: { state: "queued" } }); // still free to queue
    await c.call("queue:leave");
  });

  it("is refused while already in a match", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    await c.call("queue:practice", { bots: 1 });
    expect(await c.call("queue:practice", { bots: 1 })).toEqual({ ok: false, error: "you are already in a match" });
  });

  it("the fast speed preset shortens the phases", async () => {
    const slow = await startServer({ match: {} }); // real timers: hero select is 30s
    try {
      const u = await newUser(slow);
      const normal = track(await connect(slow, u.token));
      await normal.call("queue:practice", { speed: "normal", bots: 1 });
      const n = await normal.waitFor("match:view");
      expect(n.view.deadline - Date.now()).toBeGreaterThan(25_000);

      const v = await newUser(slow);
      const fast = track(await connect(slow, v.token));
      await fast.call("queue:practice", { speed: "fast", bots: 1 });
      const f = await fast.waitFor("match:view");
      expect(f.view.deadline - Date.now()).toBeLessThan(5_000);
    } finally {
      await slow.close();
    }
  });

  it("a practice match plays to the end and is saved", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    await c.call("queue:practice", { bots: 1 });
    const first = await c.waitFor("match:view");
    await c.intent({ type: "CHOOSE_HERO", index: 0 });
    const ended = await c.waitFor("match:event", (p) => p.event.type === "ENDED", 20_000);
    expect(ended.event.placements.map((p: { placement: number }) => p.placement)).toEqual([1, 2]);
    await new Promise((r) => setTimeout(r, 100));
    expect(server.matches.results.some((r) => r.matchId === first.matchId)).toBe(true);
  }, 30_000);

  it("is refused when the server has practice switched off", async () => {
    const strict = await startServer({ practice: false });
    try {
      const u = await newUser(strict);
      const c = track(await connect(strict, u.token));
      expect(await c.call("queue:practice", {})).toEqual({ ok: false, error: "practice mode is disabled on this server" });
      expect(await c.call("queue:join")).toMatchObject({ ok: true }); // the normal queue is unaffected
      await c.call("queue:leave");
    } finally {
      await strict.close();
    }
  });

  it("an unauthenticated socket cannot start one", async () => {
    const anon = track(new Client(server.url, undefined));
    await anon.waitForDisconnect(4000).catch(() => undefined);
    await expect(anon.call("queue:practice", {}, 300)).rejects.toThrow(/no ack/);
  });
});

describe("the content a match really uses", () => {
  it("a practice view and /content agree on faction keys", async () => {
    const u = await newUser(server);
    const c = track(await connect(server, u.token));
    await c.call("queue:practice", { bots: 1 });
    const view = await c.waitFor("match:view");
    const content = await getJson(`${server.url}/content`);
    const known = new Set(content.factions.map((f: { key: string }) => f.key));
    for (const f of view.view.factions) expect(known.has(f)).toBe(true);
    // every hero offered can be drawn from the content the client downloaded
    const heroKeys = new Set(content.heroes.map((h: { key: string }) => h.key));
    for (const h of view.view.me.heroOptions) expect(heroKeys.has(h)).toBe(true);
    // and so can every card in the first shop
    await c.intent({ type: "CHOOSE_HERO", index: 0 });
    const recruit = await c.waitFor("match:view", (p) => p.view.phase === "RECRUIT");
    const cardKeys = new Set(content.cards.map((x: { key: string }) => x.key));
    for (const k of recruit.view.me.state.shop) expect(cardKeys.has(k)).toBe(true);
  });
});

describe("the real web client served by the real server", () => {
  let real: TestServer;
  beforeAll(async () => {
    const { execFileSync } = await import("node:child_process");
    const web = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "web");
    execFileSync(process.execPath, [join(web, "scripts", "build.mjs")], { stdio: "pipe" });
    real = await startServer({ webDir: join(web, "public") });
  }, 60_000);
  afterAll(async () => {
    await real.close();
  });

  it("serves the page, its script, its styles and the socket.io client", async () => {
    const page = await fetch(`${real.url}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("HeroTime");

    const main = await fetch(`${real.url}/js/main.js`);
    expect(main.status).toBe(200);
    expect(main.headers.get("content-type")).toMatch(/javascript/);

    expect((await fetch(`${real.url}/styles.css`)).status).toBe(200);
    const io = await fetch(`${real.url}/socket.io/socket.io.js`);
    expect(io.status).toBe(200);
    expect(await io.text()).toContain("io");
  });

  it("every script the browser will import is reachable over HTTP", async () => {
    const main = await (await fetch(`${real.url}/js/main.js`)).text();
    const seen = new Set<string>();
    const queue = ["/js/main.js"];
    let body = main;
    while (queue.length) {
      const path = queue.pop() as string;
      if (seen.has(path)) continue;
      seen.add(path);
      const res = await fetch(`${real.url}${path}`);
      expect(res.status, path).toBe(200);
      body = await res.text();
      for (const m of body.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
        const next = new URL(m[1] as string, `${real.url}${path}`).pathname;
        queue.push(next);
      }
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});

import { Logger } from "@nestjs/common";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { INTERNAL_ERROR } from "../src/errors.js";
import { MatchRegistry } from "../src/game/match.registry.js";
import { connect, newUser, startServer, type TestServer } from "./e2e-helpers.js";

let server: TestServer;
const logged: string[] = [];

beforeAll(async () => {
  server = await startServer();
  // Capture what goes to the server log instead of printing it.
  vi.spyOn(Logger.prototype, "error").mockImplementation((msg: unknown) => void logged.push(String(msg)));
  vi.spyOn(Logger.prototype, "warn").mockImplementation((msg: unknown) => void logged.push(String(msg)));
});
afterAll(async () => {
  vi.restoreAllMocks();
  await server.close();
});
afterEach(() => {
  logged.length = 0;
});

const post = (path: string, body: string) => fetch(`${server.url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body });

describe("errors never reach the client raw", () => {
  it("a body that is not JSON gets a plain message; the parser's wording goes to the log", async () => {
    const res = await post("/auth/login", "{bad");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("the request body is not valid JSON");
    expect(JSON.stringify(body)).not.toMatch(/position|Unexpected|Expected/);
    expect(logged.join("\n")).toMatch(/not valid JSON/);
  });

  it("an unexpected failure answers 500 with a reference only; the error and stack are logged under it", async () => {
    vi.spyOn(server.content, "snapshot").mockImplementationOnce(() => {
      throw new Error("db password=hunter2 at /srv/secret.ts");
    });
    const res = await fetch(`${server.url}/content`);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { message: string };
    expect(body.message).toMatch(new RegExp(`^${INTERNAL_ERROR} \\(ref [0-9a-f]{8}\\)$`));
    expect(JSON.stringify(body)).not.toContain("hunter2");
    const ref = body.message.match(/ref ([0-9a-f]{8})/)?.[1] as string;
    const line = logged.find((l) => l.includes(ref)) ?? "";
    expect(line).toContain("hunter2");
    expect(line).toContain("GET /content");
  });

  it("deliberate refusals keep their message (bad input, not found)", async () => {
    const short = await post("/auth/login", JSON.stringify({ username: "a" }));
    expect(short.status).toBe(400);
    expect(JSON.stringify(await short.json())).toContain("username");
    const missing = await fetch(`${server.url}/content/99999`);
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { message: string }).message).toBe("no content version 99999");
  });

  it("the web client's errors are written to the server log, clipped and without control characters", async () => {
    const res = await post("/client-errors", JSON.stringify({ where: "match", message: "TypeError: x is undefined\u001b[31m", stack: "at a (app.js:1)", page: "/" }));
    expect(res.status).toBe(204);
    const line = logged.find((l) => l.includes("TypeError: x is undefined")) ?? "";
    expect(line).toContain("match @ /");
    expect(line).not.toContain("\u001b");
    const huge = await post("/client-errors", JSON.stringify({ message: "y".repeat(10_000) }));
    expect(huge.status).toBe(204);
    expect(Math.max(...logged.map((l) => l.length))).toBeLessThan(3000);
  });

  it("a socket action that crashes on the server answers with a reference only", async () => {
    const u = await newUser(server);
    const c = await connect(server, u.token);
    const registry = server.app.get(MatchRegistry);
    vi.spyOn(registry, "activeFor").mockReturnValueOnce({
      dispatch: () => {
        throw new TypeError("Cannot read properties of undefined (reading 'secretField')");
      },
    } as never);
    const ack = (await c.intent({ type: "REFRESH" })) as { ok: boolean; error: string };
    c.close();
    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(new RegExp(`^${INTERNAL_ERROR} \\(ref [0-9a-f]{8}\\)$`));
    expect(logged.join("\n")).toContain("secretField");
  });
});

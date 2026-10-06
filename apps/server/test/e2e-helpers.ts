import "reflect-metadata";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { io, type Socket } from "socket.io-client";
import { AppModule } from "../src/app.module.js";
import type { ServerConfig } from "../src/config.js";
import { ContentService } from "../src/content/content.service.js";
import { AppIoAdapter } from "../src/io-adapter.js";
import { InMemoryMatchRepository, InMemoryUserRepository } from "../src/persistence/in-memory.js";
import type { MatchRepository, UserRepository } from "../src/persistence/repositories.js";
import { starterContent, testConfig } from "./fakes.js";

/** Real timers, but a match that finishes in about four seconds. */
export const FAST_MATCH = {
  heroSelectMs: 400,
  recruitBaseMs: 600,
  recruitStepMs: 0,
  recruitMaxMs: 600,
  relicBonusMs: 0,
  battleMs: 250,
  maxTurns: 4,
};

export interface TestServer<U extends UserRepository = InMemoryUserRepository, M extends MatchRepository = InMemoryMatchRepository> {
  app: NestExpressApplication;
  url: string;
  config: ServerConfig;
  users: U;
  matches: M;
  close(): Promise<void>;
}

export function startServer(over?: Partial<ServerConfig>): Promise<TestServer>;
export function startServer<U extends UserRepository, M extends MatchRepository>(
  over: Partial<ServerConfig>,
  repos: { users: U; matches: M },
): Promise<TestServer<U, M>>;
export async function startServer(
  over: Partial<ServerConfig> = {},
  repos?: { users: UserRepository; matches: MatchRepository },
): Promise<TestServer<any, any>> {
  const config = testConfig({
    match: FAST_MATCH,
    lobby: { matchSize: 8, fillAfterMs: 150 },
    host: "127.0.0.1",
    authLimits: { registerPerMin: 10_000, loginPerMin: 10 },
    ...over,
  });
  const users = repos?.users ?? new InMemoryUserRepository();
  const matches = repos?.matches ?? new InMemoryMatchRepository();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot({ config, content: new ContentService(starterContent()), users, matches })],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useWebSocketAdapter(new AppIoAdapter(app, config));
  app.enableShutdownHooks();
  await app.listen(0, "127.0.0.1");
  const port = (app.getHttpServer().address() as { port: number }).port;
  return { app, url: `http://127.0.0.1:${port}`, config, users, matches, close: () => app.close() };
}

export async function api(server: { url: string }, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${server.url}${path}`, {
    method: body === undefined ? "GET" : "POST",
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

let counter = 0;
/** Register a fresh user and return their credentials. */
export async function newUser(server: { url: string }, name?: string) {
  const username = name ?? `rider_${Date.now().toString(36)}_${counter++}`;
  const res = await api(server, "/auth/register", { username, email: `${username}@test.dev`, password: "password123" });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { username, token: res.body.token as string, id: res.body.user.id as string };
}

interface Seen {
  event: string;
  payload: any;
}

/** A socket plus a log of everything it received, with promise-based waiting. */
export class Client {
  readonly socket: Socket;
  readonly seen: Seen[] = [];
  private waiters: { event: string; pred: (p: any) => boolean; resolve: (p: any) => void }[] = [];

  constructor(url: string, token: string | undefined) {
    this.socket = io(url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      auth: token === undefined ? {} : { token },
    });
    this.socket.onAny((event, payload) => {
      this.seen.push({ event, payload });
      this.waiters = this.waiters.filter((w) => {
        if (w.event === event && w.pred(payload)) {
          w.resolve(payload);
          return false;
        }
        return true;
      });
    });
  }

  /** Resolve with the first matching message, looking at ones already received too. */
  waitFor(event: string, pred: (p: any) => boolean = () => true, ms = 12_000, from = 0): Promise<any> {
    const old = this.seen.slice(from).find((s) => s.event === event && pred(s.payload));
    if (old) return Promise.resolve(old.payload);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event} (saw: ${this.seen.map((s) => s.event).join(",")})`)), ms);
      this.waiters.push({ event, pred, resolve: (p) => (clearTimeout(timer), resolve(p)) });
    });
  }

  waitForDisconnect(ms = 3000): Promise<void> {
    if (this.socket.disconnected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("still connected")), ms);
      this.socket.once("disconnect", () => (clearTimeout(timer), resolve()));
    });
  }

  /** Emit with an acknowledgement. */
  call(event: string, payload?: unknown, ms = 3000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no ack for ${event}`)), ms);
      const done = (ack: unknown) => (clearTimeout(timer), resolve(ack));
      if (payload === undefined) this.socket.emit(event, done);
      else this.socket.emit(event, payload, done);
    });
  }

  intent(i: unknown): Promise<any> {
    return this.call("match:intent", i);
  }

  views(): any[] {
    return this.seen.filter((s) => s.event === "match:view").map((s) => s.payload.view);
  }

  close(): void {
    this.socket.close();
  }
}

/** Connect and wait until the server has authenticated us (it always sends queue:status first). */
export async function connect(server: { url: string }, token: string): Promise<Client> {
  const c = new Client(server.url, token);
  await c.waitFor("queue:status");
  return c;
}

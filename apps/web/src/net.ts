import type { Ack, AdminDraft, SimulationReport, AuditEntry, AuthResult, ContentSnapshot, EventMessage, Intent, PracticeOptions, QueueStatus, VersionMeta, ViewMessage } from "./protocol.js";

/** The slice of a socket.io client we use, so tests can plug in a fake. */
export interface SocketLike {
  connected: boolean;
  on(event: string, fn: (...args: any[]) => void): unknown;
  emit(event: string, ...args: any[]): unknown;
  disconnect(): unknown;
}

export type SocketFactory = (token: string) => SocketLike;

type Handlers = {
  connection: (connected: boolean) => void;
  status: (s: QueueStatus) => void;
  view: (m: ViewMessage) => void;
  event: (m: EventMessage) => void;
  authError: (error: string) => void;
  matchError: (error: string) => void;
};

/** How long we wait for the server to acknowledge a request before giving up. */
export const ACK_TIMEOUT_MS = 6000;

export class Net {
  private socket: SocketLike | undefined;
  private handlers: Partial<Handlers> = {};

  constructor(private readonly factory: SocketFactory) {}

  on<K extends keyof Handlers>(name: K, fn: Handlers[K]): void {
    this.handlers[name] = fn;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  connect(token: string): void {
    this.disconnect();
    const s = this.factory(token);
    this.socket = s;
    s.on("connect", () => this.handlers.connection?.(true));
    s.on("disconnect", () => this.handlers.connection?.(false));
    s.on("queue:status", (m: QueueStatus) => this.handlers.status?.(m));
    s.on("match:view", (m: ViewMessage) => this.handlers.view?.(m));
    s.on("match:event", (m: EventMessage) => this.handlers.event?.(m));
    s.on("auth:error", (m: { error: string }) => this.handlers.authError?.(m.error));
    s.on("match:error", (m: { error: string }) => this.handlers.matchError?.(m.error));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  /** Emit and wait for the acknowledgement. Never rejects: a failure is an `{ ok: false }` ack. */
  call(event: string, payload?: unknown, timeoutMs: number = ACK_TIMEOUT_MS): Promise<Ack> {
    const s = this.socket;
    if (!s?.connected) return Promise.resolve({ ok: false, error: "not connected to the server" });
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, error: "the server did not answer" }), timeoutMs);
      const done = (ack: Ack): void => {
        clearTimeout(timer);
        resolve(ack ?? { ok: false, error: "empty reply" });
      };
      if (payload === undefined) s.emit(event, done);
      else s.emit(event, payload, done);
    });
  }

  intent(i: Intent): Promise<Ack> {
    return this.call("match:intent", i);
  }
  joinQueue = (): Promise<Ack> => this.call("queue:join");
  leaveQueue = (): Promise<Ack> => this.call("queue:leave");
  practice = (o: PracticeOptions): Promise<Ack> => this.call("queue:practice", o);
  sync = (): Promise<Ack> => this.call("match:sync");
  leaveMatch = (): Promise<Ack> => this.call("match:leave");
}

// ------------------------------------------------------------------ REST

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly issues: string[] = []) {
    super(message);
  }
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** The server reports problems as { message: string | string[] }. */
async function readError(res: Response): Promise<{ message: string; issues: string[] }> {
  try {
    const body = (await res.json()) as { message?: string | string[]; issues?: string[] };
    return { message: Array.isArray(body.message) ? body.message.join("; ") : (body.message ?? `HTTP ${res.status}`), issues: body.issues ?? [] };
  } catch {
    return { message: `HTTP ${res.status}`, issues: [] };
  }
}

export class Api {
  constructor(private readonly base: string = "", private readonly fetcher: Fetch = (u, i) => fetch(u, i)) {}

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetcher(`${this.base}${path}`, init);
    if (!res.ok) {
      const e = await readError(res);
      throw new ApiError(res.status, e.message, e.issues);
    }
    return (await res.json()) as T;
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.json<T>(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  register = (username: string, email: string, password: string): Promise<AuthResult> => this.post("/auth/register", { username, email, password });
  login = (username: string, password: string): Promise<AuthResult> => this.post("/auth/login", { username, password });
  content = (version?: number): Promise<ContentSnapshot> => this.json(version === undefined ? "/content" : `/content/${version}`);

  // ---- admin (the server refuses anyone who is not an admin)
  private admin<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
    return this.json<T>(`/admin/${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  adminDraft = (t: string): Promise<AdminDraft> => this.admin(t, "GET", "draft");
  adminSave = (t: string, data: unknown): Promise<AdminDraft> => this.admin(t, "PUT", "draft", { data });
  adminReset = (t: string): Promise<AdminDraft> => this.admin(t, "POST", "draft/reset", {});
  adminPublish = (t: string, notes: string, force: boolean): Promise<{ version: number }> => this.admin(t, "POST", "publish", { notes, force });
  adminVersions = (t: string): Promise<{ current: number; versions: VersionMeta[] }> => this.admin(t, "GET", "versions");
  adminRestore = (t: string, n: number): Promise<AdminDraft> => this.admin(t, "POST", `versions/${n}/restore`, {});
  adminSimulate = (t: string, matches: number, target: "draft" | "published"): Promise<SimulationReport> => this.admin(t, "POST", "simulate", { matches, target });
  adminAudit = (t: string): Promise<{ entries: AuditEntry[] }> => this.admin(t, "GET", "audit");
  me = (token: string): Promise<AuthResult["user"]> => this.json("/me", { headers: { authorization: `Bearer ${token}` } });
}

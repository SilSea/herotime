import "reflect-metadata";
import type { Content } from "@herotime/engine";
import { loadConfig, type ServerConfig } from "../src/config.js";
import { getContentSet } from "@herotime/content";
import { parseContent } from "../src/content/content.service.js";
import type { Publisher, Timers } from "../src/game/ports.js";

/** The prototype content set, parsed and cross-checked exactly as the server does at startup. */
export function starterContent(): Content {
  return parseContent(getContentSet("prototype"));
}

/** A manual clock: nothing fires until the test calls advance(). */
export class FakeTimers implements Timers {
  private t = 1_000_000;
  private nextId = 1;
  private readonly pending = new Map<number, { at: number; fn: () => void }>();

  now(): number {
    return this.t;
  }

  after(ms: number, fn: () => void): () => void {
    const id = this.nextId++;
    this.pending.set(id, { at: this.t + Math.max(0, ms), fn });
    return () => void this.pending.delete(id);
  }

  /** Move time forward, firing timers in order (including ones they schedule along the way). */
  advance(ms: number): void {
    const target = this.t + ms;
    for (let guard = 0; guard < 10_000; guard++) {
      const due = [...this.pending.entries()].filter(([, p]) => p.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.pending.delete(due[0]);
      this.t = Math.max(this.t, due[1].at);
      due[1].fn();
    }
    this.t = target;
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}

export interface Sent {
  userId: string;
  event: string;
  payload: any;
}

export class RecordingPublisher implements Publisher {
  readonly sent: Sent[] = [];

  toUser(userId: string, event: string, payload: unknown): void {
    this.sent.push({ userId, event, payload });
  }

  of(userId: string, event?: string): Sent[] {
    return this.sent.filter((s) => s.userId === userId && (event === undefined || s.event === event));
  }

  clear(): void {
    this.sent.length = 0;
  }
}

export function testConfig(over: Partial<ServerConfig> = {}): ServerConfig {
  const base = loadConfig(
    { JWT_SECRET: "test-secret-test-secret-test-secret-123", BCRYPT_COST: "4", LOBBY_FILL_MS: "5000", CONTENT_SET: "prototype" },
    () => undefined,
  );
  return { ...base, ...over };
}

import type { ServerClock } from "../clock.js";
import type { ContentIndex } from "../content-index.js";
import type { Api, Net } from "../net.js";
import type { AuthResult, Intent, PracticeOptions } from "../protocol.js";
import type { Store } from "../store.js";

/** Everything a screen may use. Screens never reach for globals. */
export interface Ctx {
  store: Store;
  net: Net;
  api: Api;
  clock: ServerClock;
  /** The content, once downloaded. Screens are only drawn after that. */
  ix: ContentIndex;
  /** Send a game intent; failures show up as a toast. Resolves true when the server accepted it. */
  act(intent: Intent): Promise<boolean>;
  toast(text: string, kind?: "info" | "error"): void;
  login(result: AuthResult): Promise<void>;
  logout(): void;
  startPractice(options: PracticeOptions): Promise<void>;
  joinQueue(kind?: "standard" | "quick"): Promise<void>;
  leaveQueue(): Promise<void>;
  /** Friend rooms: open one, join one by its code, or (host) start it with some bots. Leaving uses leaveQueue. */
  createRoom(): Promise<void>;
  joinRoom(code: string): Promise<void>;
  startRoom(bots: number): Promise<void>;
  /** After a match: go back to the lobby. */
  leaveMatch(): Promise<void>;
  go(screen: "lobby" | "library" | "admin"): void;
  /** Download the latest published content again (after an admin publishes, or when a match uses another version). */
  refreshContent(version?: number): Promise<void>;
}

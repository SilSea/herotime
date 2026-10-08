import { ServerClock } from "./clock.js";
import type { ContentIndex } from "./content-index.js";
import { describeCombat, ordinal } from "./format.js";
import type { CombatRecord, EventMessage, QueueStatus, ViewMessage } from "./protocol.js";

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "error";
}

export type Selection = { zone: "board" | "hand" | "shop"; index: number } | undefined;

export interface AppState {
  user?: { id: string; username: string; role?: string };
  token?: string;
  content?: ContentIndex;
  connected: boolean;
  status: QueueStatus;
  matchId?: string;
  view?: ViewMessage["view"];
  /** The most recent fight we have replay data for. */
  combat?: CombatRecord;
  /** A fight the player has not watched yet; the UI plays it, then clears this. */
  replayPending?: CombatRecord;
  /** Whose fight `replayPending` is when it is not your own (a knocked-out player watching someone). */
  replayOwner?: string;
  /** Knocked out: this turn's fights of the others, by player id (kept, since ordinary updates leave them out). */
  watch?: Record<string, CombatRecord>;
  /** Highest turn whose fight was played while spectating, so each turn plays once by itself. */
  watchedTurn: number;
  /** Highest turn whose replay was already offered, so a reconnect does not replay old fights. */
  replayedTurn: number;
  placements?: { playerId: string; placement: number }[];
  log: string[];
  toasts: Toast[];
  screen: "auth" | "lobby" | "library" | "admin" | "match";
  showDebug: boolean;
  showLog: boolean;
  /** The card book (every card in the match by rank) and which rank it shows. */
  showBook: boolean;
  bookRank: number;
  /** Book filters: a faction key, "_neutral", or "" for all; a keyword or "". */
  bookFaction: string;
  bookKeyword: string;
  /** After being knocked out: whose board is on show, and whether the defeat notice was closed (by match id). */
  spectating?: string;
  defeatAck?: string;
  hideOffers: boolean;
  /** Interface language (the i18n module holds it; kept here so switching redraws). */
  lang?: "en" | "th";
  /** A hand gear waiting for the player to click the unit it goes on. */
  selected: Selection;
}

export const initialState = (): AppState => ({
  connected: false,
  status: { state: "idle" },
  replayedTurn: 0,
  watchedTurn: 0,
  log: [],
  toasts: [],
  screen: "auth",
  showDebug: false,
  showLog: false,
  showBook: false,
  bookRank: 0,
  bookFaction: "",
  bookKeyword: "",
  hideOffers: false,
  selected: undefined,
});

const MAX_LOG = 200;
const push = (log: string[], line: string): string[] => [...log, line].slice(-MAX_LOG);

/** Fold a `match:view` message into the state. Pure: returns the next state. */
export function applyView(state: AppState, msg: ViewMessage, clock: ServerClock, clientNow: number = Date.now()): AppState {
  clock.sync(msg.serverNow, clientNow);
  const view = msg.view;
  const prev = state.view;
  let log = state.log;

  const newMatch = state.matchId !== msg.matchId;
  if (newMatch) log = [`Match started (${view.players.length} players${view.factions.length ? `, factions: ${view.factions.join(", ")}` : ""})`];

  if (!newMatch && prev && (prev.phase !== view.phase || prev.turn !== view.turn)) {
    if (view.phase === "RECRUIT") log = push(log, `Turn ${view.turn}: recruit phase`);
  }
  if (newMatch && view.phase === "RECRUIT") log = push(log, `Turn ${view.turn}: recruit phase`);

  let next: AppState = { ...state, view, matchId: msg.matchId, log, screen: "match", status: { state: "playing", matchId: msg.matchId, ended: view.phase === "ENDED" } };
  if (newMatch) next = { ...next, placements: undefined, combat: undefined, replayPending: undefined, replayOwner: undefined, watch: undefined, replayedTurn: 0, watchedTurn: 0, hideOffers: false, selected: undefined };

  const record = view.lastCombat;
  if (record) {
    next = { ...next, combat: record };
    if (record.turn > next.replayedTurn) {
      // Two empty boards produce no events: log the result but do not interrupt the player with a blank replay.
      const watchable = record.result.events.length > 0;
      next = { ...next, ...(watchable ? { replayPending: record, replayOwner: undefined } : {}), replayedTurn: record.turn, log: push(next.log, describeCombat(record)) };
    }
  }
  if (view.watch) next = { ...next, watch: view.watch };
  next = { ...next, ...watchReplay(next, next.spectating) };
  if (prev && (prev.phase !== view.phase || prev.turn !== view.turn)) next = { ...next, hideOffers: false, selected: undefined };

  const lost = unitsDestroyed(state, view, newMatch);
  if (lost.length > 0) {
    const names = lost.map((k) => state.content?.cardName(k) ?? k).join(", ");
    const text = `${names} was destroyed by a card effect`;
    next = addToast({ ...next, log: push(next.log, text) }, text, "info");
  }
  return next;
}

/**
 * Once you are out and watching someone, their fight this turn plays by itself (once a turn).
 * `now` = play it even if a fight is on screen or this turn was already played (the player picked someone else).
 */
export function watchReplay(state: AppState, playerId: string | undefined, now = false): Partial<AppState> {
  const view = state.view;
  if (!view || view.me.alive || view.phase !== "BATTLE" || state.defeatAck !== state.matchId || playerId === undefined) return {};
  if (!now && (state.replayPending || state.watchedTurn >= view.turn)) return {};
  const record = state.watch?.[playerId];
  if (!record || record.turn !== view.turn || record.result.events.length === 0) return {};
  return { replayPending: record, replayOwner: playerId, watchedTurn: view.turn };
}

/**
 * Own units an effect destroyed since the last view (a Deploy or Gear that destroys or consumes allies).
 * The server counts them, so transforms, triples, sales and Gattai never show up here.
 */
export function unitsDestroyed(state: AppState, view: ViewMessage["view"], newMatch: boolean): string[] {
  const prev = state.view;
  if (newMatch || !prev) return [];
  const before = prev.me?.state?.moments?.destroyed ?? 0;
  const now = view.me?.state?.moments;
  const n = (now?.destroyed ?? 0) - before;
  return n > 0 ? (now?.lastDestroyed ?? []).slice(-n) : [];
}

export function applyEvent(state: AppState, msg: EventMessage, content?: ContentIndex): AppState {
  const e = msg.event;
  const nameOf = (id: string): string => state.view?.players.find((p) => p.id === id)?.name ?? id;
  if (e.type === "ELIMINATED") {
    return { ...state, log: push(state.log, `${nameOf(e.playerId)} was eliminated (${ordinal(e.placement)})`) };
  }
  if (e.type === "ENDED") {
    const mine = e.placements.find((p) => p.playerId === state.user?.id);
    const line = mine ? `Match over: you finished ${ordinal(mine.placement)}` : "Match over";
    void content;
    return { ...state, placements: e.placements, log: push(state.log, line) };
  }
  return state;
}

export function applyStatus(state: AppState, status: QueueStatus): AppState {
  // Once a match is on screen, queue:status 'playing' must not drag the player back out of it.
  if (status.state === "idle" && state.screen === "match" && state.view && state.view.phase !== "ENDED") {
    return { ...state, status };
  }
  return { ...state, status };
}

let nextToast = 1;
export const addToast = (state: AppState, text: string, kind: Toast["kind"] = "info"): AppState => ({
  ...state,
  toasts: [...state.toasts, { id: nextToast++, text, kind }].slice(-5),
});
export const removeToast = (state: AppState, id: number): AppState => ({ ...state, toasts: state.toasts.filter((t) => t.id !== id) });

type Listener = (state: AppState) => void;

/** A tiny observable box. The UI re-renders whenever it changes. */
export class Store {
  private current: AppState;
  private readonly listeners = new Set<Listener>();

  constructor(initial: AppState = initialState()) {
    this.current = initial;
  }

  get state(): AppState {
    return this.current;
  }

  update(fn: (s: AppState) => AppState): void {
    const next = fn(this.current);
    if (next === this.current) return;
    this.current = next;
    for (const l of [...this.listeners]) l(next);
  }

  set(patch: Partial<AppState>): void {
    this.update((s) => ({ ...s, ...patch }));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
}

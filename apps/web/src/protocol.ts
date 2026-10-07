import type { CombatEvent, CombatRecord, CombatUnitInput, Intent, MatchEvent, MatchView } from "@herotime/engine";
import type { CardDef, FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";

export type { CardDef, CombatEvent, CombatRecord, CombatUnitInput, FactionDef, GaugeDef, HeroDef, Intent, MatchEvent, MatchView, RelicDef, SeriesDef };

/** `match:view`: the full private view, minus the replay unless this update is a battle or final one. */
export interface ViewMessage {
  matchId: string;
  serverNow: number;
  /** Content version the match uses (absent from older servers). */
  contentVersion?: number;
  view: Omit<MatchView, "lastCombat"> & { lastCombat?: CombatRecord };
}

export interface EventMessage {
  matchId: string;
  event: MatchEvent;
}

export type QueueStatus =
  | { state: "idle" }
  | { state: "queued"; kind?: "standard" | "quick"; waiting: number; matchSize: number; fillAt: number | null }
  | { state: "playing"; matchId: string; ended: boolean }
  | { state: "room"; code: string; host: boolean; members: string[]; max: number };

export type Ack = { ok: true; status?: QueueStatus } | { ok: false; error: string };

/** What GET /content returns. */
export interface ContentSnapshot {
  set: string;
  version: number;
  factions: FactionDef[];
  series: SeriesDef[];
  cards: CardDef[];
  gauges: GaugeDef[];
  relics: RelicDef[];
  heroes: HeroDef[];
  /** Game-rule numbers the set overrides (missing = engine default). */
  rules?: Partial<Record<string, number>>;
  /** Uploaded sounds and music. */
  sounds?: { slots?: Record<string, { file: string; volume?: number }>; music?: Record<string, { file: string; volume?: number }> };
}

export interface AuthResult {
  token: string;
  user: { id: string; username: string; role: string };
}

export interface PracticeOptions {
  factions?: string[];
  speed?: "normal" | "fast" | "quick";
  bots?: number;
}

/** What /admin/draft returns: the working copy and everything the editor shows about it. */
export interface AdminDraft {
  data: Record<string, any[]>;
  saved: boolean;
  basedOn: number;
  updatedAt: string | null;
  updatedBy: string | null;
  published: number;
  issues: string[];
  /** The cards as players would see them, or null while the draft has problems. */
  snapshot: ContentSnapshot | null;
}

export interface VersionMeta {
  number: number;
  notes: string | null;
  publishedAt: string;
  publishedBy: string | null;
}

export interface AuditEntry {
  id: string;
  adminId: string;
  entity: string;
  before: unknown;
  after: unknown;
  at: string;
}

export interface SimRow {
  key: string;
  name: string;
  count: number;
  avgPlacement: number;
  winRate: number;
}

export interface SimulationReport {
  target: "draft" | "published";
  matches: number;
  requested: number;
  expected: number;
  avgTurns: number;
  heroes: SimRow[];
  cards: SimRow[];
  factions: SimRow[];
  relics: SimRow[];
  forced?: SimRow;
  neverUsed: string[];
}

/** A card, hero or relic over saved matches (GET /admin/stats). */
export interface StatRow {
  key: string;
  count: number;
  pickRate: number;
  avgPlacement: number;
  winRate: number;
}

export interface GameStats {
  matches: number;
  players: number;
  cards: StatRow[];
  heroes: StatRow[];
  relics: StatRow[];
  relicWeights: { key: string; weight: number; suggested: number; samples: number }[];
}

export interface MyMatch {
  matchId: string;
  mode: "queue" | "quick" | "practice" | "friends";
  endedAt: string;
  contentVersion: number;
  placement: number | null;
  heroKey: string | null;
  players: { name: string; isBot: boolean; heroKey: string | null; placement: number; me: boolean }[];
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  mmr: number;
  games: number;
  wins: number;
  top4: number;
  avgPlacement: number;
}

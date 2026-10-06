import type { CombatEvent, CombatRecord, CombatUnitInput, Intent, MatchEvent, MatchView } from "@herotime/engine";
import type { CardDef, FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";

export type { CardDef, CombatEvent, CombatRecord, CombatUnitInput, FactionDef, GaugeDef, HeroDef, Intent, MatchEvent, MatchView, RelicDef, SeriesDef };

/** `match:view`: the full private view, minus the replay unless this update is a battle or final one. */
export interface ViewMessage {
  matchId: string;
  serverNow: number;
  view: Omit<MatchView, "lastCombat"> & { lastCombat?: CombatRecord };
}

export interface EventMessage {
  matchId: string;
  event: MatchEvent;
}

export type QueueStatus =
  | { state: "idle" }
  | { state: "queued"; waiting: number; matchSize: number; fillAt: number | null }
  | { state: "playing"; matchId: string; ended: boolean };

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
}

export interface AuthResult {
  token: string;
  user: { id: string; username: string; role: string };
}

export interface PracticeOptions {
  factions?: string[];
  speed?: "normal" | "fast";
  bots?: number;
}

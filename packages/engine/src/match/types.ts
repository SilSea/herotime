import type { PlayerState } from "../shop/economy.js";
import type { CombatResult, CombatSideExtras, CombatUnitInput } from "../types.js";

export type Phase = "HERO_SELECT" | "RECRUIT" | "BATTLE" | "ENDED";

/** Everything a player can ask the server to do. The server validates payload shape; the engine validates the rules. */
export type Intent =
  | { type: "CHOOSE_HERO"; index: number }
  | { type: "BUY"; index: number }
  | { type: "BUY_GEAR" }
  | { type: "COMBINE"; index: number }
  | { type: "SELL"; from: "board" | "hand"; index: number }
  | { type: "PLAY"; handIndex: number; position: number }
  | { type: "REORDER"; from: number; to: number }
  | { type: "REFRESH" }
  | { type: "FREEZE" }
  | { type: "UPGRADE" }
  | { type: "USE_GEAR"; handIndex: number; target?: number }
  | { type: "HERO_POWER" }
  | { type: "PICK_DISCOVER"; index: number }
  | { type: "CHOOSE_RELIC"; index: number }
  | { type: "READY" }
  | { type: "SURRENDER" };

export interface Entrant {
  id: string;
  name: string;
  isBot: boolean;
}

/** A board frozen at the moment its owner fought; used as a Ghost after they are eliminated. */
export interface GhostBoard {
  ownerId: string;
  units: CombatUnitInput[];
  extras: CombatSideExtras;
  rank: number;
}

export interface MatchPlayer {
  id: string;
  name: string;
  isBot: boolean;
  state: PlayerState;
  hp: number;
  armor: number;
  alive: boolean;
  placement?: number;
  heroOptions: string[];
  ready: boolean;
  /** Opponent ids, oldest first (for pairing). */
  opponents: string[];
  lastCombat?: CombatRecord;
  lastBoard?: BoardSummary;
  lastFightBoard?: SeenUnit[];
}

/** One finished fight, from the viewpoint of whoever's `lastCombat` it is. */
export interface CombatRecord {
  turn: number;
  /** null when the opponent was a Ghost. */
  opponentId: string | null;
  opponentName: string;
  ghost: boolean;
  /** Which side of `result` this player was. */
  meSide: "A" | "B";
  seed: number;
  boardA: CombatUnitInput[];
  boardB: CombatUnitInput[];
  extrasA: CombatSideExtras;
  extrasB: CombatSideExtras;
  result: CombatResult;
  /** Damage this player took (after armor is applied: `damageTaken` is HP actually lost). */
  damageTaken: number;
  damageDealt: number;
}

export type MatchEvent =
  | { type: "PHASE"; phase: Phase; turn: number; deadline: number | null }
  | { type: "ELIMINATED"; playerId: string; placement: number }
  | { type: "ENDED"; placements: { playerId: string; placement: number }[] };

export interface PublicPlayer {
  id: string;
  name: string;
  isBot: boolean;
  hp: number;
  armor: number;
  alive: boolean;
  placement?: number;
  hero?: string;
  rank: number;
  relics: string[];
  ready: boolean;
  /** The board this player last fought with (public: everyone sees it in replays). Absent before the first fight. */
  lastBoard?: BoardSummary;
  /** That board unit by unit, sent only to players who are out (spectating) or once the match has ended. */
  lastFightBoard?: SeenUnit[];
}

/** One unit of a board as it went into a fight. */
export interface SeenUnit {
  cardKey: string;
  atk: number;
  hp: number;
  golden: boolean;
  keywords: string[];
}

/** What a board was made of, without its cards: unit count and how many units carry each faction. */
export interface BoardSummary {
  turn: number;
  units: number;
  /** A unit with two factions counts for both. */
  factions: Record<string, number>;
  /** Units with no faction. */
  neutral: number;
}

/** What one player is allowed to see. Other players' shops, hands and boards are never included. */
export interface MatchView {
  phase: Phase;
  turn: number;
  /** Absolute time (ms) the current phase ends, null once the match is over. */
  deadline: number | null;
  /** Factions in play this match (empty when the content declares none). */
  factions: string[];
  /** Series whose cards are in this match (undefined = no restriction). */
  series?: string[];
  me: {
    id: string;
    state: PlayerState;
    hp: number;
    armor: number;
    alive: boolean;
    placement?: number;
    heroOptions: string[];
    ready: boolean;
    upgradeCost: number | null;
    /** What things cost for this player right now, after their relics and hero changed the rules. */
    limits: { buyCost: number; refreshCost: number; sellValue: number; maxEnergy: number; boardSize: number; handSize: number };
    /** The hero power, or null if the hero has none. */
    heroPower: { mode: "ACTIVE" | "ONCE" | "PASSIVE"; cost: number; usable: boolean } | null;
    /** Current ATK/HP of each hand/board unit (hand cards that are not units get 0/0). */
    handStats: { atk: number; hp: number }[];
    /** Board indexes of Gattai cores that COMBINE would merge into their form now. */
    combinable: number[];
    boardStats: { atk: number; hp: number }[];
  };
  players: PublicPlayer[];
  lastCombat?: CombatRecord;
}

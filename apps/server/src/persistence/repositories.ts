export type Role = "PLAYER" | "ADMIN";

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export class DuplicateUserError extends Error {
  constructor() {
    super("username or email already taken");
    this.name = "DuplicateUserError";
  }
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | undefined>;
  findByUsername(username: string): Promise<UserRecord | undefined>;
  /** Throws DuplicateUserError when the username or email exists (compared case-insensitively). */
  create(user: Omit<UserRecord, "id" | "createdAt">): Promise<UserRecord>;
}

/** queue = standard matchmaking (the leaderboard counts only these), quick = Quick Mode queue, practice = vs bots. */
export type MatchMode = "queue" | "quick" | "practice";

export interface MatchResult {
  matchId: string;
  mode: MatchMode;
  seed: number;
  contentVersion: number;
  startedAt: Date;
  endedAt: Date;
  players: {
    userId: string | null;
    name: string;
    isBot: boolean;
    heroKey: string | null;
    placement: number;
    /** Card keys of the board they last fought with. */
    board?: string[];
    relics?: string[];
  }[];
}

/** One player's line for statistics. */
export interface StatLine {
  isBot: boolean;
  mode: MatchMode;
  heroKey: string | null;
  placement: number;
  board: string[];
  relics: string[];
}

/** A card, hero or relic over real matches. */
export interface StatRow {
  key: string;
  /** Players who had it (on their last board / as hero / held). */
  count: number;
  /** count / all players counted. */
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
}

/** Shared by both repositories: sum the lines up into rows, best average placement first. */
export function aggregateStats(lines: readonly StatLine[], matches: number): GameStats {
  const acc = { cards: new Map<string, number[]>(), heroes: new Map<string, number[]>(), relics: new Map<string, number[]>() };
  const add = (m: Map<string, number[]>, key: string, place: number): void => {
    m.set(key, [...(m.get(key) ?? []), place]);
  };
  for (const l of lines) {
    for (const k of new Set(l.board)) add(acc.cards, k, l.placement);
    if (l.heroKey) add(acc.heroes, l.heroKey, l.placement);
    for (const k of new Set(l.relics)) add(acc.relics, k, l.placement);
  }
  const rows = (m: Map<string, number[]>): StatRow[] =>
    [...m]
      .map(([key, places]) => ({
        key,
        count: places.length,
        pickRate: lines.length === 0 ? 0 : Math.round((places.length / lines.length) * 1000) / 1000,
        avgPlacement: Math.round((places.reduce((a, b) => a + b, 0) / places.length) * 100) / 100,
        winRate: Math.round((places.filter((p) => p === 1).length / places.length) * 1000) / 1000,
      }))
      .sort((a, b) => a.avgPlacement - b.avgPlacement || b.count - a.count);
  return { matches, players: lines.length, cards: rows(acc.cards), heroes: rows(acc.heroes), relics: rows(acc.relics) };
}

export interface StatsFilter {
  /** Leave bots out (default: count everyone). */
  humansOnly?: boolean;
  /** Only these modes (default: all). */
  modes?: MatchMode[];
}

/** One player's record over ranked (queue) matches. */
export interface Standing {
  userId: string;
  username: string;
  games: number;
  wins: number;
  top4: number;
  avgPlacement: number;
}

export interface MatchRepository {
  save(result: MatchResult): Promise<void>;
  recentForUser(userId: string, limit: number): Promise<MatchResult[]>;
  /** Queue matches only; players with fewer than `minGames` are left out. Best average placement first. */
  leaderboard(limit: number, minGames: number): Promise<Standing[]>;
  /** Card, hero and relic statistics over saved matches. */
  stats(filter: StatsFilter): Promise<GameStats>;
}

/** Shared by both repositories so they rank the same way. */
export function rankStandings(rows: Standing[], limit: number): Standing[] {
  return [...rows].sort((a, b) => a.avgPlacement - b.avgPlacement || b.games - a.games || a.username.localeCompare(b.username)).slice(0, limit);
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
export const MATCH_REPOSITORY = Symbol("MATCH_REPOSITORY");

// ------------------------------------------------------------------ content

/** Content as JSON (the shape of @herotime/content's ContentSetData). The repository never looks inside. */
export type ContentData = Record<string, unknown>;

export interface ContentVersionMeta {
  number: number;
  notes: string | null;
  publishedAt: Date;
  publishedBy: string | null;
}

export interface ContentVersionRecord extends ContentVersionMeta {
  data: ContentData;
}

export interface DraftRecord {
  data: ContentData;
  /** Version the draft was started from, to warn when someone else published in between. */
  basedOn: number;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface AuditEntry {
  id: string;
  adminId: string;
  entity: string;
  before: unknown;
  after: unknown;
  at: Date;
}

export interface ContentRepository {
  latest(): Promise<ContentVersionRecord | undefined>;
  get(number: number): Promise<ContentVersionRecord | undefined>;
  /** Newest first. */
  list(limit: number): Promise<ContentVersionMeta[]>;
  /** Stores the data as the next version number. */
  publish(data: ContentData, notes: string | null, userId: string | null): Promise<ContentVersionRecord>;
  loadDraft(): Promise<DraftRecord | undefined>;
  saveDraft(data: ContentData, basedOn: number, userId: string): Promise<DraftRecord>;
  clearDraft(): Promise<void>;
  audit(adminId: string, entity: string, before: unknown, after: unknown): Promise<void>;
  /** Newest first. */
  recentAudit(limit: number): Promise<AuditEntry[]>;
}

export const CONTENT_REPOSITORY = Symbol("CONTENT_REPOSITORY");

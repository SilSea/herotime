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
  players: { userId: string | null; name: string; isBot: boolean; heroKey: string | null; placement: number }[];
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

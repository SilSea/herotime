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

export interface MatchResult {
  matchId: string;
  seed: number;
  contentVersion: number;
  startedAt: Date;
  endedAt: Date;
  players: { userId: string | null; name: string; isBot: boolean; heroKey: string | null; placement: number }[];
}

export interface MatchRepository {
  save(result: MatchResult): Promise<void>;
  recentForUser(userId: string, limit: number): Promise<MatchResult[]>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
export const MATCH_REPOSITORY = Symbol("MATCH_REPOSITORY");

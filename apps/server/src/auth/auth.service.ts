import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { LoginInput, RegisterInput } from "@herotime/shared";
import bcrypt from "bcryptjs";
import type { ServerConfig } from "../config.js";
import { CONFIG } from "../tokens.js";
import {
  DuplicateUserError,
  USER_REPOSITORY,
  type Role,
  type UserRecord,
  type UserRepository,
} from "../persistence/repositories.js";

export interface TokenPayload {
  sub: string;
  name: string;
  role: Role;
}

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
}

const toPublic = (u: UserRecord): PublicUser => ({ id: u.id, username: u.username, role: u.role });

@Injectable()
export class AuthService {
  /** Checked against when the username is unknown, so a miss costs as much as a wrong password. */
  private readonly decoyHash: string;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(CONFIG) private readonly config: ServerConfig,
  ) {
    this.decoyHash = bcrypt.hashSync("decoy-password", config.bcryptCost);
  }

  async register(input: RegisterInput): Promise<{ token: string; user: PublicUser }> {
    const passwordHash = await bcrypt.hash(input.password, this.config.bcryptCost);
    try {
      // Role is never taken from the request: everyone registers as a plain player.
      const user = await this.users.create({ username: input.username, email: input.email, passwordHash, role: "PLAYER" });
      return { token: await this.sign(user), user: toPublic(user) };
    } catch (e) {
      if (e instanceof DuplicateUserError) throw new ConflictException(e.message);
      throw e;
    }
  }

  async login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
    const user = await this.users.findByUsername(input.username);
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? this.decoyHash);
    if (!user || !ok) throw new UnauthorizedException("invalid username or password");
    return { token: await this.sign(user), user: toPublic(user) };
  }

  /** The user a valid token belongs to, or undefined (expired, forged, or the user is gone). */
  async authenticate(token: string): Promise<PublicUser | undefined> {
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      const user = await this.users.findById(payload.sub);
      return user ? toPublic(user) : undefined;
    } catch {
      return undefined;
    }
  }

  private sign(user: UserRecord): Promise<string> {
    const payload: TokenPayload = { sub: user.id, name: user.username, role: user.role };
    return this.jwt.signAsync(payload);
  }
}

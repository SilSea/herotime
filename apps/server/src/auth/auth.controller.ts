import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { LoginSchema, RegisterSchema } from "@herotime/shared";
import type { Request } from "express";
import type { ZodType } from "zod";
import type { ServerConfig } from "../config.js";
import { RateLimiter } from "../rate-limiter.js";
import { CONFIG } from "../tokens.js";
import { AuthService, type PublicUser } from "./auth.service.js";

type AuthedRequest = Request & { user?: PublicUser };

function parse<T>(schema: ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  throw new BadRequestException(r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`));
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const user = token ? await this.auth.authenticate(token) : undefined;
    if (!user) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}

@Controller()
export class AuthController {
  // Slow down password guessing and mass sign-ups without needing a reverse proxy in front.
  private readonly loginLimit: RateLimiter;
  private readonly registerLimit: RateLimiter;

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(CONFIG) config: ServerConfig,
  ) {
    this.loginLimit = new RateLimiter(config.authLimits.loginPerMin, 60_000);
    this.registerLimit = new RateLimiter(config.authLimits.registerPerMin, 60_000);
  }

  @Get("health")
  health(): { ok: true } {
    return { ok: true };
  }

  @Post("auth/register")
  register(@Body() body: unknown, @Req() req: Request) {
    if (!this.registerLimit.allow(req.ip ?? "?")) throw new HttpException("too many attempts", HttpStatus.TOO_MANY_REQUESTS);
    return this.auth.register(parse(RegisterSchema, body));
  }

  @Post("auth/login")
  login(@Body() body: unknown, @Req() req: Request) {
    const input = parse(LoginSchema, body);
    const key = `${req.ip ?? "?"}|${input.username.toLowerCase()}`;
    if (!this.loginLimit.allow(key)) throw new HttpException("too many attempts", HttpStatus.TOO_MANY_REQUESTS);
    return this.auth.login(input);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthedRequest): PublicUser {
    return req.user as PublicUser;
  }
}

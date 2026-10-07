import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { RuleError } from "@herotime/engine";
import { IntentSchema, PracticeSchema, QueueJoinSchema } from "@herotime/shared";
import type { Server, Socket } from "socket.io";
import { AuthService, type PublicUser } from "../auth/auth.service.js";
import { RateLimiter } from "../rate-limiter.js";
import { LobbyService } from "./lobby.service.js";
import { MatchRegistry } from "./match.registry.js";
import type { Publisher } from "./ports.js";

export type Ack = { ok: true; [k: string]: unknown } | { ok: false; error: string };

/** Publishes through whatever Socket.IO server the gateway attached. */
@Injectable()
export class SocketPublisher implements Publisher {
  private server: Server | undefined;

  attach(server: Server): void {
    this.server = server;
  }

  toUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}

type GameSocket = Socket & { data: { user?: PublicUser } };

@WebSocketGateway()
@Injectable()
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private server!: Server;
  private readonly log = new Logger("GameGateway");
  /** Open sockets per user, so closing one tab does not drop a player who has another open. */
  private readonly sockets = new Map<string, number>();
  private readonly limiter = new RateLimiter(40, 2_000);

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(LobbyService) private readonly lobby: LobbyService,
    @Inject(MatchRegistry) private readonly registry: MatchRegistry,
    @Inject(SocketPublisher) private readonly publisher: SocketPublisher,
  ) {}

  afterInit(server: Server): void {
    this.publisher.attach(server);
  }

  async handleConnection(socket: GameSocket): Promise<void> {
    const token = socket.handshake.auth?.token;
    const user = typeof token === "string" ? await this.auth.authenticate(token) : undefined;
    if (!user) {
      socket.emit("auth:error", { error: "invalid or expired token" });
      socket.disconnect(true);
      return;
    }
    socket.data.user = user;
    await socket.join(`user:${user.id}`);
    this.sockets.set(user.id, (this.sockets.get(user.id) ?? 0) + 1);

    // Reconnect: a player who is mid-match gets straight back into it.
    const runner = this.registry.runnerFor(user.id);
    if (runner) runner.sync(user.id);
    socket.emit("queue:status", this.lobby.statusFor(user.id));
  }

  handleDisconnect(socket: GameSocket): void {
    const user = socket.data.user;
    if (!user) return;
    this.limiter.forget(socket.id);
    const left = (this.sockets.get(user.id) ?? 1) - 1;
    if (left > 0) {
      this.sockets.set(user.id, left);
      return;
    }
    this.sockets.delete(user.id);
    this.lobby.leave(user.id); // a queued player who vanished should not hold a seat
  }

  @SubscribeMessage("queue:join")
  onJoin(@ConnectedSocket() socket: GameSocket, @MessageBody() body: unknown): Ack {
    return this.guarded(socket, (user) => {
      const parsed = QueueJoinSchema.safeParse(body ?? {});
      if (!parsed.success) return { ok: false, error: "malformed queue options" };
      return { ok: true, status: this.lobby.join({ id: user.id, name: user.username }, parsed.data.kind ?? "standard") };
    });
  }

  @SubscribeMessage("queue:practice")
  onPractice(@ConnectedSocket() socket: GameSocket, @MessageBody() body: unknown): Ack {
    return this.guarded(socket, (user) => {
      const parsed = PracticeSchema.safeParse(body ?? {});
      if (!parsed.success) return { ok: false, error: "malformed practice options" };
      return { ok: true, status: this.lobby.practice({ id: user.id, name: user.username }, parsed.data) };
    });
  }

  @SubscribeMessage("queue:leave")
  onLeave(@ConnectedSocket() socket: GameSocket): Ack {
    return this.guarded(socket, (user) => {
      this.lobby.leave(user.id);
      return { ok: true, status: this.lobby.statusFor(user.id) };
    });
  }

  @SubscribeMessage("match:sync")
  onSync(@ConnectedSocket() socket: GameSocket): Ack {
    return this.guarded(socket, (user) => {
      this.registry.runnerFor(user.id)?.sync(user.id);
      return { ok: true, status: this.lobby.statusFor(user.id) };
    });
  }

  @SubscribeMessage("match:leave")
  onMatchLeave(@ConnectedSocket() socket: GameSocket): Ack {
    return this.guarded(socket, (user) => {
      this.registry.release(user.id);
      return { ok: true, status: this.lobby.statusFor(user.id) };
    });
  }

  @SubscribeMessage("match:intent")
  onIntent(@ConnectedSocket() socket: GameSocket, @MessageBody() body: unknown): Ack {
    return this.guarded(socket, (user) => {
      const parsed = IntentSchema.safeParse(body);
      if (!parsed.success) return { ok: false, error: "malformed intent" };
      const runner = this.registry.activeFor(user.id);
      if (!runner) return { ok: false, error: "you are not in a match" };
      runner.dispatch(user.id, parsed.data);
      return { ok: true };
    });
  }

  /** Authenticate + rate-limit + turn exceptions into acks. Only RuleError text reaches the client. */
  private guarded(socket: GameSocket, fn: (user: PublicUser) => Ack): Ack {
    const user = socket.data.user;
    if (!user) return { ok: false, error: "not authenticated" };
    if (!this.limiter.allow(socket.id)) return { ok: false, error: "slow down" };
    try {
      return fn(user);
    } catch (e) {
      if (e instanceof RuleError) return { ok: false, error: e.message };
      this.log.error(`unexpected error for ${user.username}`, e instanceof Error ? e.stack : String(e));
      return { ok: false, error: "internal error" };
    }
  }
}

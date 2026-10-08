import { DynamicModule, Module, OnApplicationShutdown, Inject } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController, JwtAuthGuard } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import type { ServerConfig } from "./config.js";
import { ClientErrorsController } from "./client-errors.controller.js";
import { AdminController, AdminGuard } from "./content/admin.controller.js";
import { UploadStore } from "./content/uploads.js";
import { ContentController } from "./content/content.controller.js";
import { StatsController } from "./game/stats.controller.js";
import { ContentService } from "./content/content.service.js";
import { GameGateway, SocketPublisher } from "./game/game.gateway.js";
import { LobbyService } from "./game/lobby.service.js";
import { MatchRegistry } from "./game/match.registry.js";
import { realTimers, type Timers } from "./game/ports.js";
import { InMemoryContentRepository, InMemoryMatchRepository, InMemoryUserRepository } from "./persistence/in-memory.js";
import {
  CONTENT_REPOSITORY,
  MATCH_REPOSITORY,
  USER_REPOSITORY,
  type ContentRepository,
  type MatchRepository,
  type UserRepository,
} from "./persistence/repositories.js";
import { CONFIG, PUBLISHER, SHUTDOWN_HOOK, TIMERS } from "./tokens.js";

export interface AppDeps {
  config: ServerConfig;
  content: ContentService;
  users?: UserRepository;
  matches?: MatchRepository;
  contentRepo?: ContentRepository;
  timers?: Timers;
  /** Closes anything the caller opened for us (a database connection) on shutdown. */
  onShutdown?: () => Promise<void>;
}

@Module({})
export class AppModule implements OnApplicationShutdown {
  constructor(
    @Inject(MatchRegistry) private readonly registry: MatchRegistry,
    @Inject(LobbyService) private readonly lobby: LobbyService,
    @Inject(SHUTDOWN_HOOK) private readonly hook: (() => Promise<void>) | undefined,
  ) {}

  /** Everything environment-specific comes in through `deps`, which keeps tests free of globals. */
  static forRoot(deps: AppDeps): DynamicModule {
    const users = deps.users ?? new InMemoryUserRepository();
    return {
      module: AppModule,
      imports: [
        JwtModule.register({
          secret: deps.config.jwtSecret,
          signOptions: { expiresIn: deps.config.jwtTtl as never, algorithm: "HS256" },
          verifyOptions: { algorithms: ["HS256"] },
        }),
      ],
      controllers: [AuthController, ContentController, AdminController, StatsController, ClientErrorsController],
      providers: [
        { provide: CONFIG, useValue: deps.config },
        { provide: SHUTDOWN_HOOK, useValue: deps.onShutdown },
        { provide: TIMERS, useValue: deps.timers ?? realTimers },
        { provide: USER_REPOSITORY, useValue: users },
        { provide: MATCH_REPOSITORY, useValue: deps.matches ?? new InMemoryMatchRepository(users) },
        { provide: CONTENT_REPOSITORY, useValue: deps.contentRepo ?? new InMemoryContentRepository() },
        { provide: ContentService, useValue: deps.content },
        AdminGuard,
        { provide: UploadStore, useValue: new UploadStore(deps.config.uploadDir) },
        SocketPublisher,
        { provide: PUBLISHER, useExisting: SocketPublisher },
        AuthService,
        JwtAuthGuard,
        MatchRegistry,
        LobbyService,
        GameGateway,
      ],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    this.lobby.shutdown();
    this.registry.shutdown();
    await this.hook?.();
  }
}

import {
  BadRequestException,
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import type { PublicUser } from "../auth/auth.service.js";
import { JwtAuthGuard } from "../auth/auth.controller.js";
import { CONTENT_REPOSITORY, type ContentData, type ContentRepository } from "../persistence/repositories.js";
import { ContentInvalidError, ContentService, inspectContent, snapshotOf } from "./content.service.js";
import { simulate } from "./simulate.js";

type AuthedRequest = Request & { user?: PublicUser };

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (user?.role !== "ADMIN") throw new ForbiddenException("admins only");
    return true;
  }
}

const counts = (data: unknown): Record<string, number> => {
  const d = (data ?? {}) as Record<string, unknown>;
  return Object.fromEntries(["factions", "series", "cards", "gauges", "relics", "heroes"].map((k) => [k, Array.isArray(d[k]) ? (d[k] as unknown[]).length : 0]));
};

interface DraftMeta {
  basedOn: number;
  updatedAt: Date;
  updatedBy: string | null;
}

/** The content editor's API. Everything here needs an admin account. */
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository,
  ) {}

  /** The working copy: the saved draft, or the published version when nobody has started one. */
  @Get("draft")
  async draft() {
    const saved = await this.repo.loadDraft();
    const published = this.content.latest.version;
    return this.describe(saved?.data ?? (this.content.authored() as unknown as ContentData), saved, published);
  }

  /** Save the working copy. Work in progress may be invalid: the problems are returned, not refused. */
  @Put("draft")
  async saveDraft(@Body() body: unknown, @Req() req: AuthedRequest) {
    const data = (body as { data?: unknown } | null)?.data;
    if (typeof data !== "object" || data === null || Array.isArray(data)) throw new BadRequestException("body must be { data: { cards, heroes, ... } }");
    const admin = (req.user as PublicUser).id;
    const published = this.content.latest.version;
    const before = await this.repo.loadDraft();
    const saved = await this.repo.saveDraft(data as ContentData, before?.basedOn ?? published, admin);
    await this.repo.audit(admin, "content.draft", before ? counts(before.data) : null, counts(data));
    return this.describe(saved.data, saved, published);
  }

  /** Throw the working copy away and go back to what is published. */
  @Post("draft/reset")
  async reset(@Req() req: AuthedRequest) {
    await this.repo.clearDraft();
    await this.repo.audit((req.user as PublicUser).id, "content.draft.reset", null, null);
    return this.describe(this.content.authored() as unknown as ContentData, null, this.content.latest.version);
  }

  /** Make the working copy the content new matches use. Matches already running keep theirs. */
  @Post("publish")
  async publish(@Body() body: { notes?: string; force?: boolean } | undefined, @Req() req: AuthedRequest) {
    const draft = await this.repo.loadDraft();
    if (!draft) throw new BadRequestException("nothing to publish: there is no saved draft");
    const current = this.content.latest.version;
    if (draft.basedOn !== current && !body?.force) {
      throw new ConflictException(`version ${current} was published after this draft was started (from ${draft.basedOn}); publish with force to overwrite it`);
    }
    const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;
    const admin = (req.user as PublicUser).id;
    try {
      const version = await this.content.publishData(this.repo, draft.data, notes, admin);
      await this.repo.clearDraft();
      await this.repo.audit(admin, "content.publish", { version: current }, { version, notes, ...counts(draft.data) });
      return { version };
    } catch (e) {
      if (e instanceof ContentInvalidError) throw new UnprocessableEntityException({ message: "the draft is not playable", issues: e.issues });
      throw e;
    }
  }

  /**
   * Play bot-only matches on the working copy (or the published content) and report how heroes, cards and
   * factions fare. Runs on this thread, so it is capped; it stops early after about ten seconds.
   */
  @Post("simulate")
  simulate(@Body() body: { matches?: number; seed?: number; target?: "draft" | "published" } | undefined) {
    const matches = Math.min(300, Math.max(1, Math.trunc(Number(body?.matches ?? 40)) || 40));
    const seed = Number.isInteger(body?.seed) ? (body?.seed as number) : 1;
    return this.simulateTarget(body?.target === "published" ? "published" : "draft", matches, seed);
  }

  private async simulateTarget(target: "draft" | "published", matches: number, seed: number) {
    let content = this.content.latest.content;
    if (target === "draft") {
      const saved = await this.repo.loadDraft();
      const r = inspectContent(saved?.data ?? this.content.authored());
      if (!r.content) throw new UnprocessableEntityException({ message: "the draft is not playable, so it cannot be simulated", issues: r.issues });
      content = r.content;
    }
    return { target, ...simulate(content, { matches, seed, budgetMs: 10_000 }) };
  }

  @Get("versions")
  async versions() {
    return { current: this.content.latest.version, versions: await this.repo.list(50) };
  }

  /** Copy an old version into the working copy (publish it to roll back). */
  @Post("versions/:n/restore")
  async restore(@Param("n", ParseIntPipe) n: number, @Req() req: AuthedRequest) {
    const record = await this.repo.get(n);
    if (!record) throw new NotFoundException(`no version ${n}`);
    const admin = (req.user as PublicUser).id;
    const published = this.content.latest.version;
    const saved = await this.repo.saveDraft(record.data, published, admin);
    await this.repo.audit(admin, "content.restore", { version: n }, null);
    return this.describe(saved.data, saved, published);
  }

  @Get("audit")
  async audit() {
    return { entries: await this.repo.recentAudit(100) };
  }

  /** The draft plus everything the editor needs to show it: problems, and the cards as players would see them. */
  private describe(data: ContentData, meta: DraftMeta | null | undefined, published: number) {
    const r = inspectContent(data);
    return {
      data,
      saved: !!meta,
      basedOn: meta?.basedOn ?? published,
      updatedAt: meta?.updatedAt ?? null,
      updatedBy: meta?.updatedBy ?? null,
      published,
      issues: r.issues,
      snapshot: r.content ? snapshotOf(r.content, "draft", published) : null,
    };
  }
}

import { Controller, Get, Header, Inject, NotFoundException, Param, ParseIntPipe } from "@nestjs/common";
import { CONTENT_REPOSITORY, type ContentRepository } from "../persistence/repositories.js";
import { ContentService } from "./content.service.js";

/** Public card data for the web client. Contains no secrets: it is what players see on the cards. */
@Controller("content")
export class ContentController {
  constructor(
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository,
  ) {}

  @Get()
  @Header("Cache-Control", "no-cache")
  get(): Record<string, unknown> {
    return this.content.snapshot();
  }

  /** An older version, so a player still in a match started before a publish keeps seeing that match's cards. */
  @Get(":version")
  @Header("Cache-Control", "no-cache")
  async at(@Param("version", ParseIntPipe) version: number): Promise<Record<string, unknown>> {
    const snap = await this.content.snapshotAt(this.repo, version);
    if (!snap) throw new NotFoundException(`no content version ${version}`);
    return snap;
  }
}

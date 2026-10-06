import { Controller, Get, Header, Inject } from "@nestjs/common";
import { ContentService } from "./content.service.js";

/** Public card data for the web client. Contains no secrets: it is what players see on the cards. */
@Controller("content")
export class ContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Get()
  @Header("Cache-Control", "no-cache")
  get(): Record<string, unknown> {
    return this.content.snapshot();
  }
}

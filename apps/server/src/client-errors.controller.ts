import { Body, Controller, HttpCode, Logger, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { RateLimiter } from "./rate-limiter.js";

/** Cut a client-sent string down to size and strip control characters, so it cannot flood or forge log lines. */
const clip = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").slice(0, max) : "");

/**
 * The web client's errors (a bug in the page, a failed request it did not expect) are reported here and
 * written to the server log, instead of being shown to the player.
 */
@Controller("client-errors")
export class ClientErrorsController {
  private readonly log = new Logger("Client");
  private readonly limit = new RateLimiter(20, 60_000);

  @Post()
  @HttpCode(204)
  report(@Req() req: Request, @Body() body: unknown): void {
    if (!this.limit.allow(req.ip ?? "?")) return;
    if (Math.random() < 0.01) this.limit.sweep();
    const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    const where = clip(b.where, 80) || "page";
    const message = clip(b.message, 500) || "(no message)";
    const stack = clip(b.stack, 2000);
    const page = clip(b.page, 200);
    this.log.error(`${where} @ ${page}: ${message}${stack ? `\n${stack}` : ""}`);
  }
}

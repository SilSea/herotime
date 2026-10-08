import { randomBytes } from "node:crypto";
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

/**
 * What a player or admin sees when the server itself failed. The details (stack, cause) only ever go to the
 * server log, under the reference shown here, so a report can be matched to its log line.
 */
export const INTERNAL_ERROR = "something went wrong on the server";

/** A short id that ties a generic error message to its full entry in the server log. */
export const errorRef = (): string => randomBytes(4).toString("hex");

/** Log an unexpected error with its stack and return the message the client may see. */
export function logInternal(log: Logger, context: string, e: unknown): string {
  const ref = errorRef();
  log.error(`[ref ${ref}] ${context}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  return `${INTERNAL_ERROR} (ref ${ref})`;
}

/**
 * Every HTTP error goes through here. Deliberate refusals (4xx thrown by our controllers: bad input, not
 * allowed, not found) keep their message; anything else (a bug, the database, a body that is not JSON)
 * is logged in full and answered with a generic message, never the raw error.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger("HTTP");

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<{ method?: string; url?: string }>();
    const where = `${req.method ?? "?"} ${req.url ?? "?"}`;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // The JSON body parser reports the parser's own wording ("Unexpected token ... at position 5").
      const badJson = status === HttpStatus.BAD_REQUEST && (exception.cause instanceof SyntaxError || isParserError(exception));
      if (badJson) {
        this.log.warn(`${where}: body is not valid JSON (${exception.message})`);
        res.status(status).json({ statusCode: status, message: "the request body is not valid JSON" });
        return;
      }
      if (status < 500) {
        res.status(status).json(exception.getResponse());
        return;
      }
    }

    // Errors from Express middleware (the body parser) are plain http-errors: { status, type, expose }.
    const httpError = bodyParserError(exception);
    if (httpError) {
      this.log.warn(`${where}: ${httpError.type} (${(exception as Error).message})`);
      res.status(httpError.status).json({ statusCode: httpError.status, message: httpError.message });
      return;
    }

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = logInternal(this.log, where, exception);
    res.status(status).json({ statusCode: status, message });
  }
}

const PARSER_MESSAGES: Record<string, string> = {
  "entity.parse.failed": "the request body is not valid JSON",
  "entity.too.large": "request body too large",
  "encoding.unsupported": "unsupported request encoding",
  "charset.unsupported": "unsupported request charset",
  "request.aborted": "the request was aborted",
};

/** A body-parser failure, with a message of our own (its own wording quotes the body back). */
function bodyParserError(e: unknown): { status: number; type: string; message: string } | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  const { type, status } = e as { type?: unknown; status?: unknown };
  if (typeof type !== "string" || typeof status !== "number" || status < 400 || status >= 500) return undefined;
  return { status, type, message: PARSER_MESSAGES[type] ?? "the request could not be read" };
}

/** body-parser errors carry a `type` such as "entity.parse.failed"; Nest keeps the original as the response. */
function isParserError(e: HttpException): boolean {
  const r = e.getResponse();
  const msg = typeof r === "object" && r !== null ? (r as { message?: unknown }).message : r;
  return typeof msg === "string" && /\bJSON\b|Unexpected token|Unexpected end of/.test(msg) && !/^[a-z]+(\.[a-z0-9]+)*: /i.test(msg);
}

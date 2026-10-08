import { resolve } from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { ServerConfig } from "./config.js";
import { AllExceptionsFilter } from "./errors.js";
import { AppIoAdapter } from "./io-adapter.js";

/** Request bodies other than the admin upload. */
export const SMALL_BODY = 4 * 1024 * 1024;

/** Everything that turns a bare Nest app into the real server. Shared by main.ts and the tests. */
export function configureApp(app: NestExpressApplication, config: ServerConfig): void {
  app.disable("x-powered-by");
  // Raw errors (stacks, parser and database messages) stay in the server log; clients get a generic message.
  app.useGlobalFilters(new AllExceptionsFilter());
  // Only the admin upload may send big bodies (a 6 MB music file is about 8 MB as base64); everything else,
  // including the public sign-up, keeps the old 4 MB cap. Checked before parsing, from Content-Length.
  app.use((req: { path: string; headers: Record<string, unknown> }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
    const size = Number(req.headers["content-length"] ?? 0);
    if (size > SMALL_BODY && req.path !== "/admin/upload") return res.status(413).json({ statusCode: 413, message: "request body too large" });
    next();
  });
  app.useBodyParser("json", { limit: "10mb" });
  app.enableCors({ origin: config.corsOrigin });
  app.useWebSocketAdapter(new AppIoAdapter(app, config));
  // Uploaded card art: names are content hashes, so they never change and can be cached for good.
  app.useStaticAssets(resolve(config.uploadDir), {
    prefix: "/art/",
    index: false,
    immutable: true,
    maxAge: "365d",
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  });
  if (config.webDir) {
    // The playtest client is plain static files; no build server needed.
    app.useStaticAssets(resolve(config.webDir));
  }
  app.enableShutdownHooks();
}

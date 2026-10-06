import { resolve } from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { ServerConfig } from "./config.js";
import { AppIoAdapter } from "./io-adapter.js";

/** Everything that turns a bare Nest app into the real server. Shared by main.ts and the tests. */
export function configureApp(app: NestExpressApplication, config: ServerConfig): void {
  app.disable("x-powered-by");
  app.enableCors({ origin: config.corsOrigin });
  app.useWebSocketAdapter(new AppIoAdapter(app, config));
  if (config.webDir) {
    // The playtest client is plain static files; no build server needed.
    app.useStaticAssets(resolve(config.webDir));
  }
  app.enableShutdownHooks();
}

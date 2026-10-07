import { resolve } from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { ServerConfig } from "./config.js";
import { AppIoAdapter } from "./io-adapter.js";

/** Everything that turns a bare Nest app into the real server. Shared by main.ts and the tests. */
export function configureApp(app: NestExpressApplication, config: ServerConfig): void {
  app.disable("x-powered-by");
  app.useBodyParser("json", { limit: "10mb" }); // a 6 MB music upload is about 8 MB as base64
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

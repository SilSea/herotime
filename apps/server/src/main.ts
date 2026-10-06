import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { loadConfig, type ServerConfig } from "./config.js";
import { ContentService } from "./content/content.service.js";
import { AppIoAdapter } from "./io-adapter.js";

export async function bootstrap(config: ServerConfig = loadConfig()): Promise<NestExpressApplication> {
  const content = ContentService.fromFile(new URL("../content/starter.json", import.meta.url));
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot({ config, content }));
  app.disable("x-powered-by");
  app.enableCors({ origin: config.corsOrigin });
  app.useWebSocketAdapter(new AppIoAdapter(app, config));
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
  return app;
}

// Run only when started directly (not when imported by tests).
if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href) {
  bootstrap()
    .then((app) => app.getUrl().then((url) => console.log(`herotime server listening on ${url}`)))
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
}

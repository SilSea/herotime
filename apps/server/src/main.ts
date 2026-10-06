import "reflect-metadata";
import { pathToFileURL } from "node:url";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule, type AppDeps } from "./app.module.js";
import { configureApp } from "./configure-app.js";
import { loadConfig, type ServerConfig } from "./config.js";
import { ContentService } from "./content/content.service.js";

export async function bootstrap(config: ServerConfig = loadConfig()): Promise<NestExpressApplication> {
  const deps: AppDeps = { config, content: ContentService.fromSet(config.contentSet) };
  if (config.databaseUrl) {
    // Loaded lazily so a database-free local run never needs the generated client.
    const { createPrismaClient, PrismaMatchRepository, PrismaUserRepository } = await import("./persistence/prisma.js");
    const db = createPrismaClient(config.databaseUrl);
    deps.users = new PrismaUserRepository(db);
    deps.matches = new PrismaMatchRepository(db);
    deps.onShutdown = () => db.$disconnect();
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(deps));
  configureApp(app, config);
  await app.listen(config.port, config.host);
  return app;
}

// Run only when started directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrap()
    .then((app) => app.getUrl().then((url) => console.log(`herotime server listening on ${url}`)))
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
}

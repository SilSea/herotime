import "reflect-metadata";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule, type AppDeps } from "./app.module.js";
import { configureApp } from "./configure-app.js";
import { loadConfig, type ServerConfig } from "./config.js";
import { ContentService } from "./content/content.service.js";

/** In development the game serves its own web client when it sits next to the server in the repo. */
function withDefaultWebDir(config: ServerConfig): ServerConfig {
  if (config.webDir || config.production) return config;
  const dir = fileURLToPath(new URL("../../web/public", import.meta.url));
  return existsSync(dir) ? { ...config, webDir: dir } : config;
}

export async function bootstrap(initial: ServerConfig = loadConfig()): Promise<NestExpressApplication> {
  const config = withDefaultWebDir(initial);
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

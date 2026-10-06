import { IoAdapter } from "@nestjs/platform-socket.io";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { ServerOptions } from "socket.io";
import type { ServerConfig } from "./config.js";

/** Applies the configured CORS policy and a small message size cap to Socket.IO. */
export class AppIoAdapter extends IoAdapter {
  constructor(app: NestExpressApplication, private readonly config: ServerConfig) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.config.corsOrigin },
      maxHttpBufferSize: 16 * 1024,
    } as ServerOptions);
  }
}

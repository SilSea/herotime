# syntax=docker/dockerfile:1
# One image: the game server, which also serves the web client.
FROM node:22-slim AS app
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1
# Prisma needs OpenSSL; curl is for the healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@12.9.1
WORKDIR /app

# Dependencies first so they stay cached until a manifest changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/
COPY packages/content/package.json packages/content/
RUN pnpm install --frozen-lockfile

COPY . .
# Prisma client for the server, and the browser bundle (public/js) for the web client.
RUN pnpm --filter @herotime/server run prisma:generate \
 && pnpm --filter @herotime/web run build

ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIR=/app/apps/web/public
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/content >/dev/null || exit 1
RUN chmod +x docker/entrypoint.sh
ENTRYPOINT ["docker/entrypoint.sh"]

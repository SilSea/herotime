#!/bin/sh
set -e
# Apply pending migrations before the server accepts players (no-op without a database).
if [ -n "$DATABASE_URL" ]; then
  echo "applying database migrations..."
  pnpm exec prisma migrate deploy
fi
exec pnpm --filter @herotime/server run start

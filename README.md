# herotime

Auto-battler (แนว Hearthstone Battlegrounds) ธีม Kamen Rider × Super Sentai เล่นผ่านเว็บ แบบ online multiplayer
เอกสาร: [docs/FEATURES.md](docs/FEATURES.md) · [docs/PLAN.md](docs/PLAN.md) · [docs/RULES.md](docs/RULES.md)

## สถานะ
| ส่วน | สถานะ |
|---|---|
| `packages/engine` — กฎเกม, combat, effect, match state machine, bot | เสร็จ (เฟส 1–2) |
| `apps/server` — NestJS + Socket.IO, auth, lobby, reconnect | เสร็จ (เฟส 2) |
| `apps/web` — หน้าเว็บ | ยังไม่เริ่ม (เฟส 3) |
| admin editor, เนื้อหาจริง | ยังไม่เริ่ม (เฟส 4–5) |

## รันบนเครื่อง
ต้องมี Node 22 หรือ 24 (LTS) และ pnpm. Node 25 ใช้ได้ในการทดสอบแต่ Prisma ยังไม่รองรับอย่างเป็นทางการ

```bash
pnpm install

# แบบเร็ว: ไม่ต้องมีฐานข้อมูล (บัญชีและผลแมตช์อยู่ใน memory หายเมื่อปิดเซิร์ฟเวอร์)
HEROTIME_FAST=1 pnpm --filter @herotime/server start      # http://localhost:3000, แมตช์ ~1 นาที

# แบบมีฐานข้อมูล (Postgres ผ่าน Docker)
docker compose up -d postgres
export DATABASE_URL=postgresql://herotime:herotime@localhost:5432/herotime
pnpm exec prisma migrate deploy
pnpm --filter @herotime/server start
```

ตัวแปรสภาพแวดล้อม: `PORT`, `HOST` (ค่าเริ่มต้น 0.0.0.0 เพื่อให้เพื่อนใน LAN ต่อได้), `JWT_SECRET`, `CORS_ORIGIN`,
`DATABASE_URL`, `HEROTIME_FAST=1`, `LOBBY_FILL_MS`. โหมด production บังคับให้ตั้ง `JWT_SECRET` (≥32 ตัว) และ `CORS_ORIGIN`

## ทดสอบ
```bash
pnpm -r typecheck
pnpm -r test                                   # engine, shared, server (ไม่ต้องมี DB; test ของ DB จะแสดงเป็น skipped)

# test กับ Postgres จริง
docker compose up -d postgres
TEST_DATABASE_URL=postgresql://herotime:herotime@localhost:5432/herotime_test pnpm --filter @herotime/server test:db
```

## โปรโตคอล (Socket.IO)
เชื่อมต่อด้วย `auth: { token }` (JWT จาก `POST /auth/login`)

| ทิศทาง | event | หมายเหตุ |
|---|---|---|
| → | `queue:join` / `queue:leave` / `match:sync` / `match:leave` | ตอบ ack `{ ok, ... }` |
| → | `match:intent` `{ type: "BUY", index: 0 }` | ตรวจด้วย zod (`IntentSchema`), ack `{ ok }` หรือ `{ ok:false, error }` |
| ← | `queue:status` | `idle` / `queued` / `playing` |
| ← | `match:view` | มุมมองส่วนตัวของผู้เล่น (`lastCombat` มีเฉพาะตอนต่อสู้/จบเกม) |
| ← | `match:event` | `ELIMINATED`, `ENDED` |

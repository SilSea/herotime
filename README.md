# herotime

Auto-battler (แนว Hearthstone Battlegrounds) เล่นผ่านเว็บ แบบ online multiplayer

เอกสาร: [PLAN](docs/PLAN.md) (architecture, งานที่เหลือ) · [RULES](docs/RULES.md) (กฎเกม) · [FEATURES](docs/FEATURES.md) · [ADMIN_GUIDE](docs/ADMIN_GUIDE.md) (คู่มือ Admin) · [FACTIONS](docs/FACTIONS.md) (แนวเผ่า, สมดุล) · [CARD_SET_V1](docs/CARD_SET_V1.md) (ชุดการ์ดที่ใช้อยู่) · [CARD_SET_V2](docs/CARD_SET_V2.md) (ซีรีส์ที่ 2 ร่าง)

## รันบนเครื่อง
ต้องมี Node 22 หรือ 24 (LTS) และ pnpm

```bash
pnpm install

# แบบเร็ว: ไม่มีฐานข้อมูล (ข้อมูลอยู่ใน memory หายเมื่อปิด server)
HEROTIME_FAST=1 pnpm --filter @herotime/server start      # http://localhost:3000

# แบบมีฐานข้อมูล
docker compose up -d postgres
export DATABASE_URL=postgresql://herotime:herotime@localhost:5432/herotime
pnpm exec prisma migrate deploy
pnpm --filter @herotime/server start
```

### ทั้งเกมใน Docker (server + เว็บ + Postgres)
```bash
docker compose up -d --build     # http://localhost:3000 (migrate อัตโนมัติ)
docker compose logs -f server
docker compose down              # ข้อมูลอยู่ใน volume pgdata / uploads; down -v = ล้าง
```

### ตัวแปร (`.env`, ดู `.env.example`)
| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `JWT_SECRET`, `CORS_ORIGIN` | บังคับใน production (`JWT_SECRET` ≥ 32 ตัว) |
| `ADMIN_USERS` | ชื่อผู้ใช้ที่เป็น admin (คั่นด้วย `,`) |
| `CONTENT_SET` | ชุดเนื้อหาตอน DB ว่าง: `prototype` / `production` / `blank` |
| `CONTENT_RESEED=1` | publish `CONTENT_SET` ทับเป็นเวอร์ชันใหม่ทุกครั้งที่เริ่ม (ใช้ครั้งเดียวแล้วตั้งกลับเป็น 0) |
| `PORT`, `HOST` | ค่าเริ่ม 3000, `0.0.0.0` (เพื่อนใน LAN ต่อได้) |
| `DATABASE_URL`, `UPLOAD_DIR` | ฐานข้อมูล, ที่เก็บรูป/เสียง |
| `HEROTIME_FAST=1`, `LOBBY_FILL_MS`, `PRACTICE` | ใช้ตอนทดสอบ |

## ทดสอบ
```bash
pnpm -r typecheck
pnpm -r test          # ไม่ต้องมี DB (test ที่ต้องใช้ DB แสดงเป็น skipped)

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
| ← | `match:view` | มุมมองส่วนตัวของผู้เล่น (`lastCombat` เฉพาะตอนต่อสู้/จบเกม, `watch` เฉพาะคนที่ตกรอบ) |
| ← | `match:event` | `ELIMINATED`, `ENDED` |

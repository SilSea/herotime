# herotime

Auto-battler (แนว Hearthstone Battlegrounds) ธีม Kamen Rider × Super Sentai เล่นผ่านเว็บ แบบ online multiplayer
เอกสาร: [docs/FEATURES.md](docs/FEATURES.md) · [docs/PLAN.md](docs/PLAN.md) · [docs/RULES.md](docs/RULES.md) · [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) (คู่มือ Admin) · [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) (รายงานตรวจบัคล่าสุด)

## สถานะ
| ส่วน | สถานะ |
|---|---|
| `packages/engine` — กฎเกม, combat, effect, match state machine, bot | เสร็จ (เฟส 1–2) |
| `apps/server` — NestJS + Socket.IO, auth, lobby, reconnect | เสร็จ (เฟส 2) |
| `apps/web` — หน้าเว็บ (TH/EN, มือถือ, เสียง) | เสร็จ (เฟส 3, 6) |
| admin editor, เนื้อหาจริง | เสร็จ (เฟส 4–5) — คู่มือ: [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) |

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

### ทั้งเกมใน Docker (server + เว็บ + Postgres)
```bash
docker compose up -d --build     # http://localhost:3000
docker compose logs -f server
docker compose down              # ข้อมูลอยู่ใน volume pgdata; ใช้ down -v เพื่อล้าง
```
Image เดียว (`Dockerfile`) รันเซิร์ฟเวอร์ที่เสิร์ฟเว็บด้วย, `docker/entrypoint.sh` รัน `prisma migrate deploy` ก่อนเริ่ม,
postgres มี healthcheck และ server รอจน healthy. ตัวแปรตั้งผ่าน `.env` (ดู `.env.example`): `JWT_SECRET`, `CORS_ORIGIN`,
`CONTENT_SET` (`prototype` = ชุดทดสอบ: 8 เผ่า การ์ดครบ + การ์ดตัวอย่างกลไกใหม่ / `production` = ชุดเปล่า เริ่มทำการ์ดจริงเองใน Admin / `blank` = เหมือน production), `PRACTICE`, `HEROTIME_FAST`. ค่าเริ่มต้นของ `JWT_SECRET` ใน compose ใช้ลองบนเครื่องตัวเองเท่านั้น
Redis ยังไม่ถูกใช้: `docker compose --profile scale up -d`

ตัวแปรสภาพแวดล้อม: `PORT`, `HOST` (ค่าเริ่มต้น 0.0.0.0 เพื่อให้เพื่อนใน LAN ต่อได้), `JWT_SECRET`, `CORS_ORIGIN`,
`DATABASE_URL`, `HEROTIME_FAST=1`, `LOBBY_FILL_MS`. โหมด production บังคับให้ตั้ง `JWT_SECRET` (≥32 ตัว) และ `CORS_ORIGIN`

## แก้ content ในเกม (Admin editor)
ตั้ง `ADMIN_USERS=ชื่อผู้ใช้` (คั่นด้วย , ได้หลายคน) แล้วสมัคร/ล็อกอินด้วยชื่อนั้น จะเห็นแท็บ **Admin**:
เลือกการ์ด/hero/relic/faction/series/gauge → แก้ด้วยฟอร์ม (หรือโหมด JSON) → **Save draft** (ตรวจให้ ปัญหาทั้งหมดแสดงในกล่องแดง) →
**Publish** เป็นเวอร์ชันใหม่ ผู้เล่นที่เริ่มแมตช์หลังจากนั้นได้ค่าใหม่ ส่วนแมตช์ที่กำลังเล่นใช้เวอร์ชันเดิมจนจบ.
ช่อง `art` ของการ์ด/hero/relic มีปุ่มเลือกรูป: อัพโหลดแล้วใส่ชื่อไฟล์ให้เอง (รูปอยู่ใน `UPLOAD_DIR`, ใน Docker เป็น volume `uploads`).
**Versions** ดูประวัติและ restore เวอร์ชันเก่าเข้า draft (แล้ว publish เพื่อย้อนกลับ), **History** ดูว่าใครแก้อะไรเมื่อไหร่.
มี database: เวอร์ชันที่ publish เก็บใน Postgres และ server เริ่มต้นจากเวอร์ชันล่าสุดเสมอ (`CONTENT_SET` ใช้ตอน DB ว่างเท่านั้น,
`CONTENT_RESEED=1` เพื่อ publish ชุดนั้นใหม่). ไม่มี database: แก้ได้แต่หายเมื่อปิด server.

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

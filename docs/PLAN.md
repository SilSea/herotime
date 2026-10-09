# HeroTime — Architecture

เกม auto-battler แนว Hearthstone Battlegrounds บนเว็บ แบบ online multiplayer (8 คน/ล็อบบี้ ซื้อยูนิตจากร้าน สู้อัตโนมัติ คนสุดท้ายที่รอดชนะ) · เนื้อหา (การ์ด Hero Relic ฯลฯ) แก้ได้ใน Admin editor โดยไม่แก้ code

> ⚠️ **IP**: ชื่อตัวละครเป็นเครื่องหมายการค้าของเจ้าของ (Toei, Toho, Satelight, Akita Shoten, Shueisha) ใช้ได้กับโปรเจกต์เล่นกันเอง ถ้าจะเปิดสาธารณะหรือหารายได้ควรเปลี่ยนเป็นของ original — เนื้อหาอยู่ใน DB เปลี่ยนชื่อ/รูปได้โดยไม่แก้ code

เอกสารอื่น: [RULES.md](RULES.md) กฎเกม · [FEATURES.md](FEATURES.md) รายการ feature · [ADMIN_GUIDE.md](ADMIN_GUIDE.md) คู่มือ Admin · [FACTIONS.md](FACTIONS.md) แนวเผ่า · [CARD_SET_V1.md](CARD_SET_V1.md) ชุดการ์ดที่ใช้อยู่ · [CARD_SET_V2.md](CARD_SET_V2.md) ซีรีส์ที่ 2 (ร่าง)

## Stack
| ส่วน | เทคโนโลยี |
|---|---|
| Monorepo | pnpm workspaces |
| `packages/shared` | zod schemas (content, effect, intent) ใช้ร่วมกันทุก package |
| `packages/engine` | game logic pure TS แบบ deterministic (seeded RNG, ไม่มี IO): shop/pool, combat, effect DSL, match state machine, bot |
| `packages/content` | ชุดเนื้อหาเริ่มต้น (`prototype`, `production`, `blank`) + สร้างข้อความการ์ด EN/TH จาก effect |
| `apps/server` | NestJS + Socket.IO (เกม) + REST (auth, admin) · Prisma + PostgreSQL · ไม่มี DB ก็รันได้ (เก็บใน memory) |
| `apps/web` | vanilla TypeScript ไม่มี bundler (`typescript.transpileModule` → `public/js`) server เสิร์ฟให้ |
| Auth | JWT + role (`ADMIN_USERS` เป็น admin) |
| Dev / run | Docker Compose: image เดียว (server + เว็บ) + Postgres · Redis อยู่หลัง profile `scale` (ยังไม่ใช้) |

## Flow (server-authoritative)
1. Client ส่งแค่ **intent** (`BUY`, `SELL`, `PLAY`, `USE_GEAR`, `REFRESH`, `FREEZE`, `UPGRADE`, `HERO_POWER` …) ตรวจด้วย zod
2. Engine validate แล้ว server ส่ง `match:view` ส่วนตัวกลับ (ซ่อนร้าน/มือของคนอื่น)
3. หมดเวลา Recruit → จับคู่ (สุ่มไว้ตั้งแต่เริ่ม Recruit) → combat ด้วย seed → client เล่น replay จาก log
4. Reconnect: `match:sync` ขอ view ใหม่ · Bot ใช้ intent ชุดเดียวกับผู้เล่น

## ข้อมูล
- **เนื้อหา** เก็บเป็น JSON ก้อนเดียวตาม schema `ContentSetData` (`packages/shared`):
  - `ContentDraft` = draft ที่ Admin กำลังแก้ (ล้างหลัง publish)
  - `ContentVersion` = snapshot ที่ publish แล้ว เปลี่ยนไม่ได้ · server เริ่มจากเวอร์ชันล่าสุดเสมอ · แมตช์ lock เวอร์ชันตอนเริ่ม
  - `CONTENT_SET` ใช้ตอน DB ว่างเท่านั้น (`CONTENT_RESEED=1` = publish ชุดนั้นทับใหม่)
  - ตาราง `Card`, `Faction`, `Hero` … ใน `schema.prisma` ยังไม่ถูกใช้
- **ผู้เล่น/แมตช์**: `User`, `Match`, `MatchPlayer` (อันดับ, บอร์ดสุดท้าย, Relic) ใช้กับประวัติ, MMR, Stats
- **รูป/เสียง**: อัปโหลดเก็บใน `UPLOAD_DIR` (Docker volume `uploads`) ชื่อไฟล์ = hash เสิร์ฟที่ `/art/`
- `AuditLog`: ใคร save/publish/upload เมื่อไหร่

## โครงสร้างไดเรกทอรี
```
apps/server/src/{auth,content,game,persistence}   content = admin/simulate/uploads, game = lobby/match runner/gateway
apps/web/src/{ui,...}                              ui = หน้าจอ (match, lobby, admin, card wizard, library)
packages/engine/src/{shop,combat,game,match,rng}  game = session/effects, match = state machine/bot/pairing
packages/content/src/                              ชุดเนื้อหา + text EN/TH
packages/shared/src/schemas/                       zod
prisma/schema.prisma · docker-compose.yml · docs/sets/*.json (ชุดการ์ดสำรอง)
```

## งานที่ยังไม่ทำ / ความเสี่ยง
| เรื่อง | หมายเหตุ |
|---|---|
| 1 ซีรีส์ต่อเผ่าต่อเกม (ยูนิต, Gear, Hero, Relic) | ตัดสินใจแล้ว ยังไม่ทำ · ต้องมีก่อนเพิ่มซีรีส์ที่ 2 ดู [CARD_SET_V2.md](CARD_SET_V2.md) |
| Redis scale หลาย instance | รอสั่ง |
| Deploy cloud | ตอนนี้รัน local / LAN เท่านั้น |
| Diff ระหว่างเวอร์ชันใน Admin | มี rollback แล้ว ยังไม่มี diff |
| MMR และหน้า Stats โหลดทุกแมตช์ทุกครั้ง | ช้าถ้ามีหลายหมื่นเกม → เก็บ MMR ในตาราง user / cache สถิติ |
| ตรวจชนิดไฟล์ MP3 จาก byte หัวไฟล์ | MP3 แปลกๆ อาจถูกปฏิเสธ → แปลงเป็น OGG/WAV |
| เสียงเล่นหลังผู้เล่นคลิกครั้งแรก | ข้อจำกัดของเบราว์เซอร์ |
| Balance | Beast อ่อนสุดใน Simulate · ตัวเลขจากบอท ต้องดูจากการเล่นจริง |

# HeroTime — Development Plan

## Context
เกม auto-battler แนว Hearthstone Battlegrounds (8 คน/ล็อบบี้, ซื้อยูนิตจากร้าน, สู้อัตโนมัติ, คนสุดท้ายที่รอดชนะ) ธีม Kamen Rider × Super Sentai ใช้ชื่อตัวจริงผสมตัวละคร original และขยายไป anime ได้ในอนาคต

ข้อกำหนดหลัก
- เล่นบนเว็บ, **online multiplayer** ตั้งแต่เวอร์ชันแรก
- ความสามารถของการ์ด/ฮีโร่ เพิ่ม ลด ปรับได้ผ่าน **admin editor ในเกม** ที่เชื่อม DB

> ⚠️ **IP**: Kamen Rider / Super Sentai เป็นเครื่องหมายการค้าของ Toei/Ishimori. เล่นกันเองหรือเป็น fan project ไม่หากำไรได้ แต่ถ้าจะเปิด public หรือหารายได้ ควรเปลี่ยนเป็นตัว original — content ทั้งหมดอยู่ใน DB เลยเปลี่ยนชื่อ/รูปได้โดยไม่ต้องแก้ code

เอกสารที่เกี่ยวข้อง: [FEATURES.md](FEATURES.md) · [RULES.md](RULES.md)

---

## 1. Architecture

### Stack
| ส่วน | เทคโนโลยี |
|---|---|
| Monorepo | pnpm workspaces (+ Turborepo ถ้าต้องการ) |
| `apps/web` | **vanilla TypeScript ไม่มี bundler** (build = `typescript.transpileModule` → `public/js`, DOM helper `h()`, store ของตัวเอง, socket.io client จาก server) — เปลี่ยนจาก React + Vite ที่วางไว้เดิมเพื่อไม่ต้องติดตั้งเพิ่ม; logic (store/net/replay/clock) ไม่ผูก DOM และมี test; ย้ายไป React ภายหลังได้ |
| `apps/server` | NestJS, `@nestjs/websockets` (Socket.IO) สำหรับเกม, REST สำหรับ auth/admin |
| `packages/engine` | game logic เป็น pure TS แบบ deterministic (seeded RNG, ไม่มี IO) |
| `packages/shared` | types, zod schemas, socket event contracts |
| DB | PostgreSQL + Prisma |
| Cache/scale | Redis (เฟสหลัง) — เฟสแรกเก็บสถานะล็อบบี้ใน memory |
| Auth | JWT + role (`player`, `admin`) |
| Dev | Docker Compose (postgres, redis) |

> NestJS = backend, Vite = build tool ของ frontend — ใช้คู่กัน. Engine แยกเป็น package ทำให้ server กับ admin sandbox ใช้ logic ชุดเดียวกัน

### Server-authoritative flow
1. Client ส่งแค่ **intent**: `buy`, `sell`, `play{handIdx, boardPos, target}`, `reorder`, `refresh`, `freeze`, `upgrade`, `heroPower`, `endTurn`
2. Server ให้ engine validate แล้วส่ง `PlayerView` กลับ (ซ่อนร้าน/มือของคนอื่น)
3. หมดเวลา Recruit → จับคู่ → `engine.simulateCombat(boardA, boardB, seed)` → `CombatEvent[]` → client เล่น replay
4. Reconnect: client ขอ snapshot ใหม่ด้วย `matchId` + token
5. Bot รันบน server ใช้ intent API เดียวกับผู้เล่น

### Data model (Prisma คร่าวๆ)
- `User(id, name, email, passwordHash, role)`
- `Faction(id, key, name, color, icon)`
- `Keyword(id, key, name, description, engineKey)`
- `Universe(id, key, name)`
- `Franchise(id, universeId, key, name)`
- `Series(id, franchiseId, key, name, bondEffects Json, signature Json, enabled)`
- `Card(id, key, name, rank, atk, hp, seriesId?, factions[], sentaiColors[], keywords[], effects Json, transformInto?, goldenOverrides Json?, art, enabled, isToken, inShop, slot)`
  - Giant Robo = Card ที่ `inShop=false`, `slot=GIANT`, มี `entryRules Json`
- `Gauge(id, key, name, max, sources Json, thresholds Json, franchiseId?)`
- `Relic(id, key, name, tier LESSER|GREATER, cost, factions[], seriesId?, effects Json, art, weight, enabled)` — อยู่ใน ContentVersion snapshot เหมือนการ์ด
- `Hero(id, key, name, armor, power Json, art, enabled)`
- `ContentVersion(id, number, snapshot Json, publishedAt, publishedBy, notes)`
- `Match(id, contentVersionId, seed, startedAt, endedAt)`
- `MatchPlayer(matchId, userId | bot, heroId, placement)`
- `AuditLog(adminId, entity, before, after, at)`

### Admin Editor (`/admin`, role admin เท่านั้น)
- CRUD Card / Hero / Faction / Keyword / Series / Gauge + live preview
- **Effect builder**: trigger → condition → target → actions (dropdown สร้างจาก zod) + โหมด raw JSON
- **Sandbox**: จัดบอร์ด 2 ฝั่ง simulate ×1000 ดู win-rate
- Draft → Publish version, diff, rollback
- Upload รูป (เฟสแรกเก็บ local `/uploads`, ต่อไปเปลี่ยนเป็น S3/R2)

### โครงสร้างไดเรกทอรี
```
herotime/
  apps/web/src/{game,lobby,admin,components,net}
  apps/server/src/{auth,users,content,admin,lobby,match,bot,prisma}
  packages/engine/src/{state,shop,combat,effects/{triggers,selectors,actions},gauge,rng}
  packages/shared/src/{schemas,events,types}
  prisma/schema.prisma
  prisma/seed.ts
  docker-compose.yml
  docs/{FEATURES,PLAN,RULES}.md
```

---

## 2. Roadmap

| เฟส | เป้าหมาย | Deliverable |
|---|---|---|
| **0 Docs + Setup** | เอกสาร + วางโครง | docs, monorepo, lint/tsconfig, docker-compose, Prisma schema |
| **1 Engine** | logic ครบไม่มี UI | shop/economy, pool, triple, combat, keyword หลัก, effect DSL + action registry, Henshin / Team-Up / Gattai / Kyodaika, Series Bond, Gauge + Giant Slot (Roll Call → Giant Robo), Relic (player-scope effect + `RuleContext`/`MODIFY_RULE`), unit test |
| **2 Server MVP** | เล่นออนไลน์ได้ | auth, lobby/matchmaking, game gateway, timer, ghost, bot, reconnect |
| **3 Web client** | เล่นได้จริง | lobby, เลือก hero, ร้าน/บอร์ด drag-drop, combat replay, leaderboard, Gauge UI, แถบ Relic + modal เลือก |
| **4 Admin editor** | ปรับ content ได้ | CRUD (รวม Relic), effect builder, sandbox, publish version |
| **5 Content & balance** | 60–80 ยูนิต, 12+ hero | seed data, playtest, balance |
| **6 Polish / Scale** | | Gear/spell, Redis, เสียง/VFX, ranking/MMR, deploy |

**MVP เล่นได้จริง** = จบเฟส 0–3 ใช้ content ราว 30 ยูนิต 6 hero

---

## 3. Verification
- **Engine** (Vitest): seed เดิมได้ combat log เดิม (determinism), test แยกทุก keyword, triple, pool, Gattai merge, Team-Up นับสี, Roll Call/Gauge, Giant Robo entry
- **Fuzz**: สุ่มบอร์ดสู้กัน 10k ครั้ง ต้องไม่ crash ไม่มี infinite loop (มี action cap)
- **Server e2e**: socket client/bot 8 ตัวเล่นจนจบ ต้องได้อันดับครบ 1–8
- **Web**: browser 2 แท็บ + bot 6 ตัว เล่นจนจบ, ทดสอบ reconnect
- **Relic**: ตัวเลือกไม่ซ้ำกันในล็อบบี้, มีตัวราคา 0 เสมอ, `MODIFY_RULE` มีผลเฉพาะผู้เล่นเจ้าของ (เช่น Team Spirit Banner → Roll Call 4 สี)
- **Admin**: แก้ stat → publish → ล็อบบี้ใหม่ได้ค่าใหม่ ล็อบบี้ที่เล่นอยู่ยังใช้ค่าเดิม

---

## 4. Decisions
- **Hosting**: ตอนนี้รัน **local บนเครื่อง** เท่านั้น
  - `docker compose up -d` → Postgres + Redis
  - `pnpm dev` → web `:5173`, server `:3000`
  - เล่นกับเพื่อนใน LAN ได้ผ่าน IP ของเครื่อง (bind `0.0.0.0`)
  - Cloud (Railway → Fly.io/VPS) ค่อยตัดสินใจทีหลัง ใช้ Docker setup เดิมย้ายได้
- **Content sets**: `packages/content` มี `prototype` (เล่นทดลอง/ปรับเร็ว) กับ `production` (ชุดเปิดตัว 7 ซีรีส์, 74 การ์ด) เลือกด้วย env `CONTENT_SET`; ข้อมูลเป็น data ล้วนผ่าน DSL builder → ภายหลังย้ายเข้า DB/admin editor ได้
- **Docker**: image เดียว (server เสิร์ฟเว็บเอง) + Postgres healthcheck + `prisma migrate deploy` ตอนเริ่ม; Redis อยู่หลัง profile `scale` (ยังไม่ใช้)
- **Phase ตอนนี้**: เฟส 0–3 เสร็จ (เล่นจริงได้), เฟส 4 admin editor ใช้งานได้ (ยังไม่มี upload รูป / sandbox / diff), เฟส 5 เริ่มแล้ว (production content)
- **Admin**: บัญชีที่อยู่ใน `ADMIN_USERS` เป็น admin (role ไม่เคยมาจากคำขอสมัคร) → แท็บ Admin: แก้ draft → Save (ตรวจและแสดงปัญหาทั้งหมด) → Publish เป็นเวอร์ชันใหม่ แมตช์ที่กำลังเล่นใช้เวอร์ชันเดิมจนจบ; ถ้า DB มีเวอร์ชันอยู่แล้ว server เริ่มจากเวอร์ชันล่าสุดที่ publish (`CONTENT_RESEED=1` เพื่อ publish ชุดจาก `CONTENT_SET` ใหม่)
- **ซีรีส์ชุดแรก**: Sentai 3 + Rider 3 + original 1 — ดู [RULES.md §11](RULES.md#11-launch-series-ชุดแรก)

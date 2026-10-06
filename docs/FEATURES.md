# HeroTime — Feature List

Priority: **P0** = MVP ต้องมี · **P1** = หลัง MVP · **P2** = อนาคต
เฟสอ้างอิง roadmap ใน [PLAN.md](PLAN.md) · กฎละเอียดดู [RULES.md](RULES.md)

## F1. Core Gameplay
- [x] **F1.1** (P0) ล็อบบี้ 8 คน, เลือก Hero 1 จาก 2
- [x] **F1.2** (P0) Economy: Energy 3→10, ซื้อ 3 / ขาย 1 / Refresh 1 / Freeze 0
- [x] **F1.3** (P0) Base Rank 1–6 + ราคาอัปลดลง 1 ทุกเทิร์นที่ยังไม่อัป
- [x] **F1.4** (P0) Shared pool จำกัดจำนวนตาม Rank
- [x] **F1.5** (P0) Board 7 / Hand 10, จัดลำดับยูนิต
- [x] **F1.6** (P0) Triple → Final Form + Discover Rank+1
- [x] **F1.7** (P0) Auto combat (seeded, deterministic) + combat log
- [x] **F1.8** (P0) Damage = Base Rank + Rank ยูนิตที่รอด (cap 15 เทิร์น 1–8)
- [x] **F1.9** (P0) จับคู่ไม่ซ้ำ 3 รอบล่าสุด + Ghost
- [x] **F1.10** (P0) Timer: Hero 30s, Recruit 40s→75s, ไม่มีปุ่ม Ready (ทุกเทิร์นใช้เวลาเต็ม) → replay + นับถอยหลังเริ่มเทิร์นใหม่พร้อมกัน
- [x] **F1.11** (P0) Hero Power (active / passive / ครั้งเดียวต่อเกม)
- [ ] **F1.12** (P1) Gear/Spell ในร้าน
- [ ] **F1.13** (P2) Quick Mode (Recruit 35s, HP 20)
- [x] **F1.14** (P0) ปุ่มยอมแพ้ (Surrender): ออกทันที ได้อันดับล่างสุดของคนที่ยังอยู่ ใช้ได้ทุก phase

## F2. Faction & Keyword
- [x] **F2.1** (P0) 7 Faction: Rider, Sentai, Mecha, Kaijin, Grunt, Ally, Dark Rider — สุ่ม 5 ต่อล็อบบี้
- [x] **F2.2** (P0) Keyword มาตรฐาน: Guard, Barrier, Last Stand, Henshin Call, Rapid, Lethal, Revive, Start of Combat, End of Turn, Avenge(N)
- [x] **F2.3** (P0) Keyword ธีม: Henshin(N), Team-Up(k), Gattai, Kyodaika, Rider Kick
- [x] **F2.4** (P0) Sentai color (Red/Blue/Yellow/Green/Pink) + Extra = wildcard

## F3. Series & Giant Robo
- [x] **F3.1** (P0) ลำดับชั้น Universe → Franchise → Series
- [x] **F3.2** (P0) Series Template (Core / Extra / Mecha / Villain / Bond / Signature)
- [x] **F3.3** (P0) Series Bond (≥2 / ≥4 ยูนิตซีรีส์เดียวกัน)
- [ ] **F3.4** (P1) Featured Series 3 ซีรีส์ต่อ franchise ต่อล็อบบี้
- [x] **F3.5** (P0) Gauge system กลาง (sources / thresholds เก็บใน DB)
- [x] **F3.6** (P0) Roll Call 5 สี → Mecha Gauge → การ์ด "Kyodai Gattai!" → Giant Slot
- [x] **F3.7** (P0) Giant Robo ลงสนามเมื่อเหลือ ≤2 ตัว หรือศัตรูเกิด Kyodaika
- [ ] **F3.8** (P1) Super Gattai (Gauge 6 + Extra Ranger)
- [ ] **F3.9** (P1) Rider Gauge → Ultimate Form
- [ ] **F3.10** (P2) Universe Anime + faction ใหม่
- [x] **F3.11** (P0) Launch series (production set; signature ที่ต้องมี action ใหม่ เช่น Den-O possession / W pairing / OOO medals ใช้ของที่ใกล้เคียงใน DSL ปัจจุบันไปก่อน): Gokaiger, Kyoryuger, Shinkenger, W, Den-O, OOO, Himmapan Sentai (original) — ดู [RULES.md §11](RULES.md#11-launch-series-ชุดแรก)

## F4. Online / Server
- [x] **F4.1** (P0) สมัคร/ล็อกอิน JWT, role `player` / `admin`
- [x] **F4.2** (P0) Matchmaking queue + เติม bot
- [x] **F4.3** (P0) Server-authoritative intent API (Socket.IO)
- [x] **F4.4** (P0) ซ่อนข้อมูลของคนอื่น (PlayerView)
- [x] **F4.5** (P0) Reconnect กลางเกม
- [x] **F4.6** (P0) Bot AI พื้นฐาน
- [ ] **F4.7** (P1) ประวัติแมตช์ + อันดับ
- [ ] **F4.8** (P2) MMR/Ranked, friend lobby
- [ ] **F4.9** (P2) Redis scale หลาย instance
- [x] **F4.10** (P0) รัน local: `pnpm dev` หรือ `docker compose up -d --build` (server + เว็บ + Postgres, migrate อัตโนมัติ), เล่นใน LAN ได้
- [x] **F4.12** (P0) Practice mode: เล่นคนเดียวกับ bot 1–7 ตัว, เลือก faction/ความเร็วได้ (`queue:practice`)
- [x] **F4.13** (P0) Content set เลือกด้วย `CONTENT_SET`: `prototype` (ปรับเร็ว) / `production` (ชุดเปิดตัว), ดูได้ที่ `GET /content`
- [ ] **F4.11** (P2) Deploy cloud (Railway → Fly.io/VPS)

## F5. Web Client
- [x] **F5.1** (P0) หน้า Login, Lobby/Queue
- [x] **F5.2** (P0) เลือก Hero
- [x] **F5.3** (P0) ร้าน/มือ/บอร์ด drag-drop + ปุ่ม Refresh / Freeze / Upgrade (ไม่มี Ready)
- [x] **F5.4** (P0) Leaderboard ข้างจอ (HP, Rank, Faction หลัก)
- [x] **F5.5** (P0) Combat replay + ปุ่มเร่ง
- [x] **F5.6** (P0) Giant Slot + Gauge UI (ไฟ 5 สี)
- [x] **F5.7** (P0) Tooltip keyword/การ์ด
- [x] **F5.10** (P0) หน้าตาแบบ Battlegrounds: โต๊ะ tavern/warband/มือ/รูป hero, การ์ดกรอบ parchment + ATK/HP gem, hover ดูการ์ดขนาดใหญ่ + คำอธิบาย keyword, banner เปลี่ยน phase, fuse bar นับเวลา
- [x] **F5.11** (P0) แจ้งเมื่อการ์ดที่เพิ่งลง (Henshin Call) ทำลายยูนิตของตัวเอง
- [ ] **F5.8** (P1) เสียง, VFX แปลงร่าง/รวมร่าง
- [ ] **F5.9** (P2) Mobile layout

## F6. Admin Editor
- [ ] **F6.1** (P0) CRUD Card / Hero / Faction / Keyword / Series / Gauge
- [ ] **F6.2** (P0) Effect builder (dropdown สร้างจาก zod schema) + โหมด raw JSON
- [ ] **F6.3** (P0) Live card preview
- [ ] **F6.4** (P0) Draft → Publish ContentVersion, ล็อบบี้ lock เวอร์ชันตอนเริ่มเกม
- [ ] **F6.5** (P0) Upload รูป
- [ ] **F6.6** (P1) Sandbox simulate ×1000 + win-rate
- [ ] **F6.7** (P1) Diff / rollback version, Audit log
- [ ] **F6.8** (P2) Stat dashboard (pick rate, win rate ต่อการ์ด)

## F7. Relic (ระบบสมบัติ) — ดู [RULES.md §13](RULES.md#13-relic-ระบบสมบัติ)
- [x] **F7.1** (P0) เลือก Lesser Relic เทิร์น 5, Greater Relic เทิร์น 9 (1 จาก 4, มีราคา Energy, เลือกไม่ทันได้ตัวราคา 0)
- [x] **F7.2** (P0) กฎสุ่มตัวเลือก (faction หลัก + series + สุ่ม 2) — Relic ซ้ำกันระหว่างผู้เล่นได้
- [x] **F7.3** (P0) Effect DSL owner scope `PLAYER` + trigger ระดับผู้เล่น
- [x] **F7.4** (P0) `RuleContext` + action `MODIFY_RULE`
- [x] **F7.5** (P0) UI: แถบ Relic ข้างรูป Hero, modal เลือก, tooltip, เห็น Relic คนอื่นใน leaderboard
- [ ] **F7.6** (P0) Admin CRUD Relic + `weight` การสุ่ม
- [x] **F7.7** (P0) Bot เลือก Relic
- [x] **F7.8** (P0) Content: production 10 Lesser + 8 Greater, prototype 9 + 7
- [ ] **F7.9** (P1) ใส่ Relic ใน admin sandbox
- [ ] **F7.10** (P1) ปรับ weight จากสถิติ pick/win rate, เพิ่ม content

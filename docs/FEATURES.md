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
- [x] **F1.10** (P0) Timer: Hero 30s, Recruit 40s→75s (+10s เทิร์น relic), Battle 20s, ไม่มีปุ่ม Ready (server ปฏิเสธ READY ด้วย) (ทุกเทิร์นใช้เวลาเต็ม) → replay + นับถอยหลังเริ่มเทิร์นใหม่พร้อมกัน
- [x] **F1.11** (P0) Hero Power (active / passive / ครั้งเดียวต่อเกม)
- [x] **F1.12** (P1) Gear ในร้าน: ช่อง Gear 1 ช่อง ราคาตามการ์ด สุ่มจาก Gear ที่ rank ≤ ร้าน, Refresh สุ่มใหม่, Freeze เก็บไว้, ซื้อแล้วเข้ามือกด Use; ไม่อยู่ใน pool (หลายคนได้ชิ้นเดียวกันได้); bot ซื้อใช้ด้วย; 18 ชิ้นทั้ง prototype และ production. Gear เลือกเป้าหมายได้ (`CHOSEN_FRIENDLY`, ลากวางบนยูนิตหรือ Use → คลิก), Gear ให้ keyword, Gear `X Call` Discover ยูนิตตามเผ่า (`DISCOVER_UNIT`), ร้านมี Gear 1 ใบเสมอ, ราคา Gear เป็น Energy หรือ Health (`costType`), Freeze แล้วช่องที่ซื้อไปเติมใหม่ตอนเริ่มเทิร์น, Book แท็บ Special แสดงการ์ดจาก Gauge + Giant Robo
- [x] **F1.13** (P2) Quick Mode (Recruit 35s, HP 20): คิวแยก + ตัวเลือกในโหมดฝึก, ไม่นับ leaderboard
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
- [x] **F3.4** (P1) Featured Series 3 ซีรีส์ต่อ franchise ต่อล็อบบี้ (`featuredSeriesPerFranchise`, franchise ที่มีซีรีส์ไม่เกิน 3 ใช้ทั้งหมด; หนังสือการ์ดแสดงเฉพาะซีรีส์ในเกม)
- [x] **F3.5** (P0) Gauge system กลาง (sources / thresholds เก็บใน DB)
- [x] **F3.6** (P0) Roll Call 5 สี → Mecha Gauge → การ์ด "Kyodai Gattai!" → Giant Slot
- [x] **F3.7** (P0) Giant Robo ลงสนามเมื่อเหลือ ≤2 ตัว หรือศัตรูเกิด Kyodaika
- [x] **F3.8** (P1) Super Gattai (Gauge 6 + Extra Ranger): Mecha Gauge ถึง 6 ได้ action `SUPER_GATTAI` — การต่อสู้ที่มี Extra Ranger บนบอร์ด Giant Robo +4/+4 และได้ keyword ของ Extra Ranger; ช่อง Giant มีป้าย SUPER GATTAI
- [x] **F3.12** (P1) Gattai เป็นการ์ดใหม่: core (ซ้ายสุด, มี `gattaiInto`) + ชิ้นส่วน Gattai ติดกันครบ → กด Combine ตอนซื้อของ รวมถาวร (stat ร่าง + ผลรวมชิ้นส่วน, keyword ทั้งหมด, effect ของร่าง) แล้วบัฟต่อได้; ไม่รวมระหว่างสู้; รวมได้ชั้นเดียว; ขายแล้วชิ้นส่วนคืน pool
- [x] **F3.9** (P1) Rider Gauge → Ultimate Form
- [x] **F3.10** (P2) Universe Anime + faction ใหม่: SeriesDef มี `universe` (tokusatsu/anime); production มี faction **Shonen** (Power-Up: โจมตีแล้วโตถาวร, Avenge) + ซีรีส์ original "Star Blade Academy" 7 ยูนิต + token, Hero Hot-Blooded Captain, Relic 2, Shonen Call; ล็อบบี้สุ่ม 5 จาก 8 เผ่า
- [x] **F3.11** (P0) Launch series (production set; signature ที่ต้องมี action ใหม่ เช่น Den-O possession / W pairing / OOO medals ใช้ของที่ใกล้เคียงใน DSL ปัจจุบันไปก่อน): Gokaiger, Kyoryuger, Shinkenger, W, Den-O, OOO, Himmapan Sentai (original) — ดู [RULES.md §11](RULES.md#11-launch-series-ชุดแรก)

## F4. Online / Server
- [x] **F4.1** (P0) สมัคร/ล็อกอิน JWT, role `player` / `admin`
- [x] **F4.2** (P0) Matchmaking queue + เติม bot
- [x] **F4.3** (P0) Server-authoritative intent API (Socket.IO)
- [x] **F4.4** (P0) ซ่อนข้อมูลของคนอื่น (PlayerView)
- [x] **F4.5** (P0) Reconnect กลางเกม
- [x] **F4.6** (P0) Bot AI พื้นฐาน
- [x] **F4.7** (P1) ประวัติแมตช์ (20 นัดล่าสุดของตัวเอง รวม practice) + leaderboard (เฉพาะ matchmaking, ≥3 นัด, เรียงตามอันดับเฉลี่ย) ใน lobby
- [x] **F4.8** (P2) MMR/Ranked, friend lobby: MMR แบบ Elo หลายผู้เล่น (เริ่ม 1000, คำนวณจากแมตช์จัดอันดับทั้งหมดตามลำดับเวลา) ตารางอันดับเรียงตาม MMR; ห้องเล่นกับเพื่อน: สร้างห้องได้รหัส 5 ตัว เพื่อนกรอกรหัสเข้า เจ้าของห้องเลือกจำนวน bot แล้วกดเริ่ม (ไม่นับอันดับ, mode `friends`)
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
- [x] **F5.14** (P1) 2 ภาษา TH/EN: ปุ่มสลับที่หัวจอ (หน้า login, lobby, ในเกม) จำไว้ในเครื่อง; ข้อความ UI, คำอธิบาย keyword/ability, gauge, replay, ข้อความ error ที่เจอบ่อยจาก server แปลไทย; การ์ด/Relic/Hero/เผ่ามี `textTh` สร้างอัตโนมัติจาก effect (แก้เองได้ใน Admin ช่อง "text (Thai)"); ชื่อการ์ดและ keyword คงเป็นอังกฤษ; หน้า Admin เป็นอังกฤษ
- [x] **F5.13** (P1) Game rules ใน content (ราคา, ขนาดบอร์ด/มือ, Roll Call, Gattai, หุ่นยักษ์, Kyodaika) แก้ได้ในแท็บ Admin → Rules และ publish เป็นเวอร์ชัน; หุ่นยักษ์ได้ stat Sentai เต็ม (giantSentaiScale 1); ชี้การ์ดเห็นคำอธิบาย keyword/ability; gauge ชี้แล้วมีคำอธิบาย + ตัวอย่างการ์ด; Giant Slot ขวาสุด; ตัวบอกตำแหน่งวางตอนลาก
- [x] **F5.12** (P1) ลากการ์ดในร้านไปที่ hero/มือ = ซื้อ, ไปที่บอร์ด = ซื้อแล้ววาง, ลากยูนิตกลับเข้าร้าน = ขาย (พื้นที่วางกว้างทั้งโซน); หนังสือการ์ดกรอง faction/keyword; คำอธิบาย Mecha/Rider Gauge; ป้าย rank ทุกคน; แพ้แล้วมีหน้าบอกอันดับ + ดูบอร์ดคนอื่น (บอร์ดตอนสู้ล่าสุด)
- [x] **F5.11** (P0) แจ้งเมื่อการ์ดที่เพิ่งลง (Henshin Call) ทำลายยูนิตของตัวเอง
- [x] **F5.8** (P1) เสียง, VFX แปลงร่าง/รวมร่าง: เสียงสังเคราะห์ด้วย Web Audio (ไม่มีไฟล์เสียง) ทุก action และทุก event ใน replay, ปุ่มเปิด/ปิดเสียง (จำในเครื่อง); ตัวอักษรใหญ่ HENSHIN! / GATTAI! / KYODAI GATTAI! / KYODAIKA! / ROLL CALL! ใน replay และตอนกด Combine
- [x] **F5.9** (P2) Mobile layout: จอ ≤640px จัดเป็นคอลัมน์เดียว การ์ดเล็กลง ไม่มีสกรอลแนวนอน; จอสัมผัส (ไม่มี hover) ปุ่ม Play/Use/Sell โชว์ตลอด เพราะลากวางใช้ได้กับเมาส์เท่านั้น

## F6. Admin Editor
- [x] **F6.1** (P0) CRUD Card / Hero / Relic / Faction / Series / Gauge (Keyword ยังเป็น enum ใน engine)
- [x] **F6.2** (P0) Effect builder (form จาก descriptor ที่มี test ตรวจว่าตรงกับ zod) + โหมด raw JSON
- [x] **F6.3** (P0) Live card preview (ข้อความกฎที่สร้างจาก effect อัพเดตตอน Save)
- [x] **F6.4** (P0) Draft → Publish ContentVersion, ล็อบบี้ lock เวอร์ชันตอนเริ่มเกม
- [x] **F6.5** (P0) Upload รูป (PNG/JPEG/GIF/WebP ≤ ~1.4 MB, ตรวจชนิดจาก bytes ไม่รับ SVG, ตั้งชื่อไฟล์จาก hash, เก็บใน `UPLOAD_DIR`, เสิร์ฟที่ `/art/`)
- [x] **F6.6** (P1) Sandbox: bot 8 ตัวเล่นเต็มแมตช์บน draft หรือชุดที่ publish (สูงสุด 300 แมตช์) สรุป hero/faction/การ์ดที่ชนะมากหรือน้อยผิดปกติ (ยังไม่ใช่การเลือกบอร์ด 2 ฝั่งเอง)
- [~] **F6.7** (P1) Rollback (restore เวอร์ชันเก่าเข้า draft แล้ว publish) + Audit log ทำแล้ว; Diff ยังไม่ทำ
- [x] **F6.10** (P1) กลไกใหม่: ได้ Gear/ยูนิตแบบสุ่ม (`RANDOM_CARD`) หรือใบที่กำหนด (`ADD_TO_HAND`), เปลี่ยน/อัปเกรดร่างทุกเผ่า (`ultimateInto` + `ULTIMATE_FORM`, ร่างสุดท้าย Rider ต่อซีรีส์, หุ่นร่างอัปเกรด + Gear Robo Upgrade ผ่านเป้าหมาย `GIANT_SLOT`), เพิ่มพลังยูนิตในร้าน (`BUFF_SHOP`), กลืนกินยูนิตในร้าน (`DEVOUR_SHOP`), เรียกยูนิตจากมือ (`SUMMON_FROM_HAND`), trigger ขาย/ทิ้ง (`ON_SELL`), จำนวนครั้งที่เกิดผล (`repeat`), keyword Echo (Deploy 2 ครั้ง); Admin: ตัวกรองการ์ด (ประเภท/เผ่า/rank/keyword) และช่องเลือกการ์ดค้นหาด้วยชื่อ; ชุด content `blank` สำหรับเริ่มทำ production เอง
- [x] **F6.9** (P1) Card wizard ใน Admin: สร้างการ์ดทีละขั้น (ประเภท → ชื่อ/ค่าพลัง/เผ่า → ความสามารถจาก dropdown ที่กรองเฉพาะตัวเลือกที่ใช้ด้วยกันได้ → แปลงร่าง) พร้อม template, ตัวอย่างการ์ดสด, ตรวจสิ่งที่ขาดเป็นประโยค, 2 ภาษา
- [x] **F6.8** (P2) Stat dashboard (pick rate, win rate ต่อการ์ด): Admin → Stats จากแมตช์จริงที่บันทึกไว้ (บอร์ดสุดท้าย + Relic ต่อผู้เล่นเก็บใน MatchPlayer), การ์ด/Hero/Relic: Seen, Pick %, อันดับเฉลี่ย, Win %; กรองเฉพาะคน; API `GET /admin/stats?humans=1&modes=queue,quick`

## F7. Relic (ระบบสมบัติ) — ดู [RULES.md §13](RULES.md#13-relic-ระบบสมบัติ)
- [x] **F7.1** (P0) เลือก Lesser Relic เทิร์น 5, Greater Relic เทิร์น 9 (1 จาก 4, มีราคา Energy, เลือกไม่ทันได้ตัวราคา 0)
- [x] **F7.2** (P0) กฎสุ่มตัวเลือก (faction หลัก + series + สุ่ม 2) — Relic ซ้ำกันระหว่างผู้เล่นได้
- [x] **F7.3** (P0) Effect DSL owner scope `PLAYER` + trigger ระดับผู้เล่น
- [x] **F7.4** (P0) `RuleContext` + action `MODIFY_RULE`
- [x] **F7.5** (P0) UI: แถบ Relic ข้างรูป Hero, modal เลือก, tooltip, เห็น Relic คนอื่นใน leaderboard
- [x] **F7.6** (P0) Admin CRUD Relic + `weight` การสุ่ม
- [x] **F7.7** (P0) Bot เลือก Relic
- [x] **F7.8** (P0) Content: production 10 Lesser + 8 Greater, prototype 9 + 7
- [x] **F7.9** (P1) ใส่ Relic ใน admin sandbox: ตาราง Relic (อันดับเฉลี่ยของคนที่ถือ) + เลือก Relic ให้ bot 1 ถือตั้งแต่เริ่มทุกแมตช์แล้วดูอันดับ
- [x] **F7.10** (P1) ปรับ weight จากสถิติ pick/win rate, เพิ่ม content: Admin → Stats เสนอ weight ใหม่ (ถือแล้วอันดับดี → สุ่มเจอน้อยลง 15%/อันดับ, ช่วง ×0.5–×1.5, ต้องมี ≥5 คนถือ) กด Apply to the draft; Relic ใหม่ 5 อัน (Scout Report, Belt Charm, Kaiju Egg, Hero Medal, Mecha Blueprint) รวม 21

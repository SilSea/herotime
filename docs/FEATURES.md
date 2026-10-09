# HeroTime — Feature List

`[x]` ทำแล้ว · `[~]` ทำบางส่วน · `[ ]` ยังไม่ทำ · กฎละเอียดดู [RULES.md](RULES.md) · วิธีใช้ Admin ดู [ADMIN_GUIDE.md](ADMIN_GUIDE.md)

## F1. Core Gameplay
- [x] **F1.1** ล็อบบี้ 8 คน (bot เติม), เลือก Hero 1 จาก 2
- [x] **F1.2** Economy: Energy 3→10, ซื้อ 3 / ขาย 1 / Refresh 1 / Freeze 0
- [x] **F1.3** Base Rank 1–6, ราคาอัปลดลง 1 ทุกเทิร์นที่ยังไม่อัป
- [x] **F1.4** Shared pool จำกัดจำนวนตาม Rank · ร้านสุ่มการ์ดของ Hero บ่อยขึ้น (`heroCardWeight`)
- [x] **F1.5** Board 7 / Hand 10, จัดลำดับยูนิต
- [x] **F1.6** Triple → ร่างทอง + Discover Rank+1 (รวมทันทีไม่ว่าใบที่ 3 มาทางไหน)
- [x] **F1.7** Auto combat (seeded, deterministic) + combat log
- [x] **F1.8** Damage = Base Rank + Rank ยูนิตที่รอด (cap 15 เทิร์น 1–8)
- [x] **F1.9** จับคู่ไม่ซ้ำ 3 รอบล่าสุด + Ghost · จับคู่ตอนเริ่ม Recruit และบอกคู่ต่อสู้
- [x] **F1.10** Timer: Hero 30s, Recruit 40s→75s (+10s เทิร์น Relic), Battle 20s · ไม่มีปุ่ม Ready
- [x] **F1.11** Hero Power (active / passive / ครั้งเดียวต่อเกม)
- [x] **F1.12** Gear: ช่อง Gear 1 ช่องในร้าน, เลือกเป้าหมายได้, ราคา Energy หรือ HP, Gear ทุกเผ่า
- [x] **F1.13** Quick Mode (Recruit 35s, HP 20) คิวแยก ไม่นับอันดับ
- [x] **F1.14** ยอมแพ้ได้ทุก phase

## F2. Faction & Keyword
- [x] **F2.1** Faction เก็บใน content สุ่ม 5 ต่อล็อบบี้ (เฉพาะเผ่าที่เปิดและมีการ์ดในร้าน) · ชุดปัจจุบัน 7 เผ่า ดู [FACTIONS.md](FACTIONS.md)
- [x] **F2.2** Keyword มาตรฐาน: Guard, Barrier, Last Stand, Deploy, Rapid, Lethal, Revive, Echo, Legacy (Last Stand ×2), Start of Combat, End of Turn, Avenge(N)
- [x] **F2.3** Keyword ธีม: Henshin(N), Team-Up(k), Gattai, Kyodaika, Power Strike (บน Rider = Rider Kick), Final Blow
- [x] **F2.4** สี Sentai 11 สี + Extra = wildcard

## F3. Series, Gauge & Giant Robo
- [x] **F3.1** Universe → Franchise → Series · Series Bond (≥N ใบ) · Featured Series 3 ต่อ franchise
- [x] **F3.2** Gauge system กลาง (sources / thresholds ใน content)
- [x] **F3.3** Roll Call → Mecha Gauge → Kyodai Gattai! → Giant Slot · หุ่นลงสนามเมื่อเหลือ ≤2 ตัวหรือศัตรู Kyodaika
- [x] **F3.4** Super Gattai (Gauge 6 + Extra Ranger)
- [x] **F3.5** Gattai core + Combine รวมร่างถาวรช่วงซื้อของ
- [x] **F3.6** Rider Gauge → การ์ด Final Form · `ultimateInto` ใช้ได้ทุกเผ่า
- [x] **F3.7** Universe Anime + faction ใหม่ได้โดยไม่แก้ engine

## F4. Online / Server
- [x] **F4.1** สมัคร/ล็อกอิน JWT, role player / admin
- [x] **F4.2** Matchmaking queue + เติม bot · Practice (bot 1–7 ตัว เลือกเผ่า/ความเร็ว) · ห้องเล่นกับเพื่อน (รหัส 5 ตัว)
- [x] **F4.3** Server-authoritative intent API (Socket.IO) · ซ่อนข้อมูลคนอื่น
- [x] **F4.4** Reconnect กลางเกม
- [x] **F4.5** Bot: เลือก Discover, รวม Gattai, ซื้อ Gear ที่ใช้ได้, ให้คะแนนสี Sentai, Freeze ใบที่ 3 ของคู่, เลือก Relic
- [x] **F4.6** ประวัติแมตช์ 20 นัด + ตารางอันดับ MMR (Elo หลายผู้เล่น)
- [x] **F4.7** รัน local / LAN ด้วย Docker (migrate อัตโนมัติ) · error ดิบไม่ส่งถึงผู้ใช้ (รหัสอ้างอิงใน log)
- [ ] **F4.8** Redis scale หลาย instance
- [ ] **F4.9** Deploy cloud

## F5. Web Client
- [x] **F5.1** Login, Lobby, คิว, หนังสือการ์ด (กรองเผ่า/keyword, แท็บร่างแปลง & พิเศษ)
- [x] **F5.2** หน้าเกมแบบ Battlegrounds: ร้าน/มือ/บอร์ด drag-drop, กรอบตำแหน่งวาง, เป้าเล็ง Gear
- [x] **F5.3** Leaderboard ข้างจอ (HP, Rank, เผ่าหลัก, Relic, คู่ต่อสู้รอบนี้)
- [x] **F5.4** Combat replay + เร่ง/Skip · ตัวอักษร HENSHIN! / GATTAI! / ROLL CALL! ฯลฯ
- [x] **F5.5** Giant Slot (stat บัฟ keyword) + Gauge UI
- [x] **F5.6** Tooltip keyword/การ์ด · preview ใหญ่โชว์การ์ดที่เกี่ยวข้อง
- [x] **F5.7** Energy เทิร์นหน้า ใต้ Energy
- [x] **F5.8** แพ้แล้วดูคนอื่น: เห็นบอร์ดและการสู้ของคนที่ดูทุกเทิร์น
- [x] **F5.9** หน้าจอจบเกม (อันดับ, โพเดียม, บอร์ดสุดท้ายทุกคน)
- [x] **F5.10** ซ่อน/เปิดหน้าต่าง Relic / Discover
- [x] **F5.11** 2 ภาษา TH/EN (ข้อความการ์ดสร้างจาก effect)
- [x] **F5.12** เสียง: เสียงสังเคราะห์ในตัว + อัปโหลดเสียง/เพลงเอง, ปรับความดังแยก
- [x] **F5.13** Mobile layout (จอ ≤640px, จอสัมผัสมีปุ่ม Play/Use/Sell)

## F6. Admin Editor
- [x] **F6.1** CRUD Card / Hero / Relic / Faction / Series / Gauge / Rules / Sounds (Keyword เป็น enum ใน engine)
- [x] **F6.2** Effect builder + โหมด JSON · Card wizard (ทีละขั้น, template, 2 ภาษา)
- [x] **F6.3** Live preview + ข้อความการ์ดสร้างอัตโนมัติ EN/TH
- [x] **F6.4** Draft → Publish เวอร์ชัน, แมตช์ lock เวอร์ชัน · ตรวจความถูกต้องตอน Save
- [x] **F6.5** อัปโหลดรูป + ปรับตำแหน่ง/ซูม (`artCrop`)
- [x] **F6.6** Simulate: bot 8 ตัวเต็มแมตช์ (≤300) สรุป Hero / เผ่า / Giant Robo / Relic / การ์ด พร้อมช่วงคลาดเคลื่อน
- [~] **F6.7** Rollback + Audit log ทำแล้ว · Diff ยังไม่ทำ
- [x] **F6.8** Stats จากเกมจริง + แนะนำ weight Relic
- [x] **F6.9** เปิด/ปิดเผ่า / Hero / Relic
- [x] **F6.10** กลไก DSL: COPY, CONSUME_ALLIES, BUFF_GEAR, BUFF_SHOP, DEVOUR_SHOP, DISCARD, RANDOM_CARD, ULTIMATE_FORM, SUMMON_FROM_HAND, TRIGGER_LAST_STAND, รางวัลหลังสู้, `limit`, `repeat`, กรองชื่อการ์ด / `formOf`

## F7. Relic
- [x] **F7.1** เลือก Lesser เทิร์น 5, Greater เทิร์น 9 (1 จาก 4, มีตัวราคา 0, หมดเวลาได้ตัวฟรี)
- [x] **F7.2** Effect ระดับผู้เล่น (`scope: PLAYER`) + `MODIFY_RULE`
- [x] **F7.3** UI แถบ Relic, modal เลือก, เห็น Relic คนอื่น
- [x] **F7.4** Admin CRUD + `weight` · ใส่ Relic ให้ bot ใน Simulate

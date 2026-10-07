# คู่มือหน้า Admin (Content editor) ซื้อของ · ช่วงต่อสู้ = **ได้เทิร์นหน้า** | ซื้อของ · ช่วงต่อสู้ = **ได้เทิร์นหน้า** | ซื้อของ · ช่วงต่อสู้ = **ได้เทิร์นหน้า** | ซื้อของ · ช่วงต่อสู้ = **ได้เทิร์นหน้า** | ซื้อของ · ช่วงต่อสู้ = **ได้เทิร์นหน้า** | ซื้อของ · ช่วงต่อสู้ = **ได้เทิร์นหน้า** |

หน้า Admin ใช้แก้ "เนื้อหาเกม" ทั้งหมดโดยไม่ต้องแก้ code: การ์ด, Hero, Relic, เผ่า, ซีรีส์, Gauge และตัวเลขกฎของเกม
ทุกอย่างที่แก้จะอยู่ใน **draft** ก่อน ผู้เล่นยังไม่เห็น จนกว่าจะกด **Publish**

> หน้าแก้ไขหลักเป็นภาษาอังกฤษ (ตั้งใจไว้) คู่มือนี้อ้างชื่อปุ่ม/ช่องตามที่เห็นบนจอ
> ยกเว้น **Card wizard** (ตัวช่วยสร้างการ์ด) ที่เป็น 2 ภาษา: กด **TH** ที่หัวจอเพื่อใช้ภาษาไทย
>
> **มือใหม่: เริ่มจากข้อ 4.0 Card wizard** ไม่ต้องรู้จักโครงสร้าง effect ก่อน

---

## 1. เข้าหน้า Admin

1. ตั้งชื่อผู้ใช้ที่เป็น admin ใน environment variable `ADMIN_USERS` (หลายคนคั่นด้วย `,` ไม่สนตัวพิมพ์ใหญ่เล็ก)
   - รันด้วย Docker: ใส่ในไฟล์ `.env` ข้าง `docker-compose.yml` เช่น `ADMIN_USERS=nattawut` แล้ว `docker compose up -d --build`
   - รันเอง: `ADMIN_USERS=nattawut pnpm --filter @herotime/server start`
2. สมัคร/ล็อกอินด้วยชื่อนั้น จะมีแท็บ **Admin** ที่หัวจอ (ข้าง Play, Library)
3. ถ้าไม่เห็นแท็บ: ชื่อไม่ตรงกับ `ADMIN_USERS` หรือ server ยังไม่ได้ restart หลังตั้งค่า → ล็อกเอาต์แล้วล็อกอินใหม่

---

## 2. หน้าตาของหน้าจอ

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Content editor  [สถานะ]   Save draft  Publish  Discard draft  ＋ Card wizard │
│                           Versions  Simulate  Stats  History                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ (กล่องแดง: ปัญหาที่ต้องแก้ก่อน Publish)                                       │
├───────────────┬───────────────────────────────────────┬──────────────────────┤
│ แท็บ:         │ ฟอร์มแก้ไขของที่เลือก                  │ Preview              │
│ Cards Heroes  │  [Form] [JSON] [Duplicate] [Delete]   │ (การ์ดตัวจริง/เล็ก)    │
│ Relics ...    │  key, name, rank, atk, hp, ...        │                      │
│ Rules         │  effects (ตัวสร้าง effect)            │                      │
│ [Search...]   │                                       │                      │
│ [+ New card]  │                                       │                      │
│ รายการ        │                                       │                      │
└───────────────┴───────────────────────────────────────┴──────────────────────┘
```

**แถบสถานะ** บอก: เวอร์ชันที่ publish อยู่ · มี draft แล้วหรือยัง · `UNSAVED CHANGES` (แก้แล้วยังไม่ save) · จำนวนปัญหา

| ปุ่ม | ทำอะไร |
|---|---|
| **Save draft** | เก็บ draft ไว้บน server + ตรวจความถูกต้อง (ผู้เล่นยังไม่เห็น) |
| **Publish** | ทำ draft ให้เป็นเวอร์ชันใหม่ที่เกม **ใหม่** ใช้ (ถามโน้ตว่าเปลี่ยนอะไร) |
| **Discard draft** | ทิ้ง draft กลับไปเป็นเวอร์ชันที่ publish อยู่ |
| **＋ Card wizard** | ตัวช่วยสร้างการ์ดใหม่ทีละขั้น พร้อมตัวอย่างการ์ดทันที (ข้อ 4.0) |
| **Versions** | ดูทุกเวอร์ชันที่เคย publish และดึงเวอร์ชันเก่ากลับมาเป็น draft (rollback) |
| **Simulate** | ให้ bot เล่นทั้งเกมหลายรอบ ดูว่าอะไรแรง/อ่อนเกิน |
| **Stats** | สถิติจากเกมจริงที่เล่นจบแล้ว + แนะนำ weight ของ Relic |
| แท็บ **Sounds** (ข้าง Rules) | อัปโหลดเสียงของแต่ละเหตุการณ์และเพลงพื้นหลัง (ข้อ 17) |
| **History** | บันทึกว่าใครทำอะไรกับ content เมื่อไหร่ |
| **Back to editing** | กลับมาหน้าแก้ไข (โผล่เมื่ออยู่ในหน้า Versions/Simulate/Stats/History) |

---

> รายการการ์ด/Hero/Relic ฝั่งซ้าย และช่องค้นหาการ์ดทุกช่อง **เรียงตามชื่อ A→Z** (ไม่สนตัวพิมพ์เล็กใหญ่ เลขเรียงแบบตัวเลข: Unit 2 ก่อน Unit 10)

## 3. วงจรการทำงาน (สำคัญที่สุด)

```
แก้ในฟอร์ม → Save draft → (แก้ปัญหาในกล่องแดงจนหมด) → Simulate (ถ้าอยากเช็ค) → Publish
```

- **Save draft บ่อยๆ** draft ที่ยังไม่ save หายถ้าปิดหน้า
- draft ที่มีปัญหา **save ได้** แต่ **publish ไม่ได้** จนกว่าจะแก้หมด
- **Publish แล้ว เกมที่กำลังเล่นอยู่ไม่เปลี่ยน** ใช้เวอร์ชันเดิมจนจบ เกมที่เริ่มหลังจากนั้นใช้เวอร์ชันใหม่
- ข้อความบนการ์ด (rules text) ที่สร้างจาก effect จะอัปเดตใน Preview **หลัง Save draft**
- ถ้ากด Publish แล้วขึ้นว่ามีคนอื่น publish ไปก่อน (draft ของเราเริ่มจากเวอร์ชันเก่า) จะถามว่า "Publish anyway?"
  ตอบ OK = ทับของคนนั้น ถ้าไม่แน่ใจให้กด Cancel แล้วไปดู **Versions** ก่อน

---

## 4. งานที่ทำบ่อย

### 4.0 สร้างการ์ดด้วย Card wizard (แนะนำ)
กด **＋ Card wizard** บนแถบบน จะได้หน้าจอ 2 ฝั่ง: ซ้ายกรอกทีละขั้น ขวาเป็นตัวอย่างการ์ดที่อัปเดตทันที

0. **แบบสำเร็จรูป** (ไม่บังคับ): กดปุ่มด้านบน เช่น "ตาย → เรียกพวก", "บัฟทุกตัวที่ถูกเรียก", "Gear: บัฟตัวที่เลือก" แล้วค่อยแก้ต่อ · "เริ่มใหม่" = ล้างทั้งหมด
1. **การ์ดประเภทไหน**: ยูนิต (ขายในร้าน) · Token (ไม่ขาย ถูกเรียกเท่านั้น เช่น Cub) · Gear (ใช้จากมือ) · Giant Robo
2. **ชื่อ ค่าพลัง และเผ่า**:
   - พิมพ์ชื่อ → ระบบตั้ง **Key** ให้เอง (แก้ได้ แต่หลังเพิ่มเข้า draft แล้วอย่าเปลี่ยน)
   - Rank, ATK, HP (Gear จะเป็น ราคา + จ่ายด้วย Energy/เลือด แทน)
   - ซีรีส์, รูป (อัปโหลดได้เลย), ติ๊กเผ่า (ไม่ติ๊ก = ไม่มีเผ่า มีทุกเกม), สี Sentai, Keywords (ชี้ที่ keyword เพื่ออ่านคำอธิบาย)
3. **ความสามารถ**: กด "+ เพิ่มความสามารถ" กี่อันก็ได้ แต่ละอันเลือก
   - **เมื่อไหร่** (ลงจากมือ, จบเทิร์น, เริ่มสู้, เมื่อโจมตี, เมื่อตาย, Avenge, เมื่อเรียกยูนิตอื่นเข้าสนาม ...) — Gear ไม่ต้องเลือก (ทำงานตอนใช้)
   - **เงื่อนไข** (ไม่ใส่ = ทุกครั้ง) · "มีการ์ดใบนี้อยู่บนบอร์ด" = เลือกการ์ดได้หลายใบ มีใบใดใบหนึ่งก็ผ่าน
   - **ทำอะไร** และค่าของมัน (บัฟกี่แต้ม, ให้ keyword อะไร, เรียกการ์ดไหนกี่ตัว ...)
   - ทำอะไรได้มีทั้ง "แปลงร่างเป็นการ์ดอื่น" (TRANSFORM) และรางวัลหลังการต่อสู้ (ได้ Energy / การ์ด / Gauge ในเทิร์นหน้า) ใน trigger ช่วงต่อสู้
   - **กับใคร** (+ กรองเฉพาะเผ่าได้ + **เฉพาะการ์ดเหล่านี้**: พิมพ์ค้นหาแล้วเพิ่มได้หลายใบ กด ✕ เพื่อเอาออก)
   - ตัวอย่าง: เมื่อลงจากมือ (Deploy) · กับใคร = พวกเราทุกตัว · เฉพาะการ์ด = Agent Number 7, Kamen Rider Zeztz → "Deploy: ให้ยูนิต Agent Number 7 หรือ Kamen Rider Zeztz ทุกตัว +2/+2"
   - การกรองชื่อการ์ดและเงื่อนไขชื่อการ์ด**นับร่างที่แปลงแล้ว** (Henshin / Ultimate Form) ด้วย เช่น เลือก Zeztz แล้ว Zeztz ร่าง Ultimate ก็โดน
   - ระบบ**ให้เลือกเฉพาะตัวเลือกที่ใช้ด้วยกันได้** เช่น "เมื่อตาย" จะไม่มี "ได้ Energy", "เมื่อเรียกยูนิตอื่น" จะมีเป้าหมาย "ตัวที่เพิ่งถูกเรียก"
4. **การแปลงร่าง** (ยูนิต): Henshin หลังกี่เทิร์น → แปลงเป็นการ์ดไหน · Gattai core → กลุ่มรวมเป็นการ์ดไหน

ฝั่งขวา: ตัวอย่างการ์ด + คำอธิบายเป็นประโยค + กล่องแดงบอกสิ่งที่ยังขาด (ปุ่มเพิ่มจะกดได้เมื่อขึ้น "✔ พร้อมเพิ่มแล้ว")
- **เพิ่มและบันทึก draft** = ใส่การ์ดใน draft แล้ว Save ทันที (ระบบเขียนคำอธิบายการ์ดให้ทั้งไทยและอังกฤษ) แล้วพาไปหน้าแก้ไขการ์ดนั้น
- **เพิ่มเข้า draft** = ใส่อย่างเดียว ยังไม่ save
- เสร็จแล้วอย่าลืม **Publish** การ์ดถึงจะอยู่ในเกมใหม่
- อยากแก้ละเอียดกว่านี้ (เช่น หลาย action ในความสามารถเดียว, golden multiplier) ใช้ฟอร์มปกติในข้อ 4.1–4.5

### 4.1 ปรับค่าพลังการ์ด
1. แท็บ **Cards** → พิมพ์ชื่อในช่อง Search (ค้นได้ทั้งชื่อ, key และข้อความบนการ์ด) หรือใช้**ตัวกรอง**ใต้ช่องค้นหา:
   ประเภท (ยูนิตในร้าน / Token / Gear / Giant), เผ่า, Rank, keyword หรือ trigger (เช่น ECHO, ON_SELL) · ปุ่ม **Clear** ล้างตัวกรอง
   แล้วคลิกการ์ด
2. แก้ `atk` / `hp` / `rank` ในฟอร์ม ดู Preview ด้านขวา
3. **Save draft** → **Publish**

### 4.2 สร้างการ์ดใหม่ด้วยฟอร์ม (แบบละเอียด)
1. **+ New card** → ใส่ `key` (ตัวอักษรอังกฤษ ตัวเลข `_` เท่านั้น เช่น `sh8`) — key คือ id ถาวร **ห้ามซ้ำ ห้ามเปลี่ยนทีหลัง** (เกมเก่า/สถิติอ้างถึง key)
2. กรอก: `name`, `kind` (ดูข้อ 5), `rank` 1–6, `atk`, `hp`, `factions` (เผ่า), `series` (ถ้ามี), `colors` (สี Sentai), `keywords`
3. ใส่ความสามารถในส่วน `effects` (ดูข้อ 6)
4. ปล่อย `text` ว่างไว้ = ระบบเขียนคำอธิบายให้จาก effect (ทั้งอังกฤษและไทย)
5. **Save draft** ดู Preview แล้ว **Publish**

> ทางลัด: เปิดการ์ดที่คล้ายๆ กันแล้วกด **Duplicate** (ระบบถาม key ใหม่) แล้วค่อยแก้

### 4.3 ใส่รูป
ช่อง `art` (การ์ด, Hero, Relic) มีปุ่มเลือกรูป → อัปโหลดแล้วระบบใส่ชื่อไฟล์ให้เอง
หรือพิมพ์ URL/พาธรูปเองก็ได้ ถ้าว่าง เกมวาดตัวอักษรย่อแทน

### 4.4 ลบ
**Delete** ในฟอร์ม — ถ้าการ์ดนี้ถูกอ้างจากที่อื่น (เช่น เป็นร่าง Henshin ของการ์ดอื่น, ถูก SUMMON) จะขึ้นปัญหาในกล่องแดงตอน Save ให้แก้ที่อ้างถึงก่อน

### 4.4.1 ช่องที่ต้องเลือกการ์ด (ค้นหาได้)
ช่องที่อ้างถึงการ์ดอื่น เช่น "ได้การ์ดใบไหน" (ADD_TO_HAND), "เรียกใคร" (SUMMON), "แปลงร่างเป็นอะไร" (henshin / ultimate form / gattai form):
พิมพ์ส่วนหนึ่งของ**ชื่อ**หรือ key แล้วเลือกจากรายการที่ขึ้นมา (บอกชื่อ, ATK/HP หรือ Gear, token, rank) ใต้ช่องจะแสดงชื่อการ์ดที่เลือก ถ้าพิมพ์ผิดจะขึ้นกรอบแดง / "not found"
ใน Card wizard ช่องเหล่านี้ก็ค้นหาแบบเดียวกัน

### 4.5 โหมด JSON
ปุ่ม **JSON** แก้ข้อมูลดิบทั้งก้อนได้ (เร็วสำหรับคนคุ้น) กด **Form** กลับมาฟอร์มปกติ
ถ้า JSON ผิดรูปแบบจะแก้ไม่ติด ให้ดูข้อความ error

---

## 5. ชนิดของการ์ด (`kind`) และช่องพิเศษ

| kind / ช่อง | ความหมาย |
|---|---|
| `UNIT` | ยูนิตปกติ ขายในร้านตาม rank (ถ้า `token` = ไม่ติ๊ก) |
| `token` ✔ | ไม่ขายในร้าน เกิดจาก effect เท่านั้น (SUMMON, Henshin, ร่าง Gattai) |
| `GEAR` | การ์ดใช้แล้วหมด (แนว spell) ใช้จากมือ effect ต้องเป็น `scope: PLAYER` + `trigger: ON_PLAY` |
| `cost` | ราคา Gear ในร้าน (Gear ที่ไม่ใช่ token จะสุ่มขึ้นช่อง Gear ของร้าน ตั้งแต่ rank ของมันขึ้นไป) |
| `costType` | `ENERGY` = จ่ายทอง, `HEALTH` = จ่ายเลือด Hero (ซื้อจนเหลือ 0 ไม่ได้, เกราะไม่ช่วย) |
| `GIANT` | Giant Robo อยู่ในช่อง Giant ได้จาก Kyodai Gattai! (ใส่ `series` เพื่อให้ขบวนการที่มีบนบอร์ดเยอะได้หุ่นของตัวเองแน่นอน) |
| `henshin` | `afterTurns` = อยู่บนบอร์ดครบกี่เทิร์นแล้วแปลงร่าง, `into` = การ์ดร่างใหม่ (ปกติเป็น token) |
| `ultimateInto` (ultimate form) | ร่างที่ action `ULTIMATE_FORM` เปลี่ยนให้ ใช้ได้**ทุกเผ่า**: ร่างสุดท้ายของ Rider แต่ละซีรีส์, หุ่น Sentai ร่างอัปเกรด, หรือ gimmick ของซีรีส์ไหนก็ได้ (ค่าบัฟที่สะสมไว้ติดไปด้วย) |
| `gattaiInto` | ทำให้การ์ดนี้เป็น **Gattai core**: เมื่ออยู่ซ้ายสุดของกลุ่มยูนิต Gattai ที่ติดกันครบ แล้วผู้เล่นกด Combine กลุ่มจะรวมเป็นการ์ดนี้ (ต้องมี keyword `GATTAI` ด้วย) |
| `colors` | สี Sentai: RED BLUE YELLOW GREEN PINK, `EXTRA` = นับเป็นสีอะไรก็ได้ (และใช้กับ Super Gattai) |
| `text` / `text (Thai)` | คำอธิบายบนการ์ด เว้นว่าง = สร้างจาก effect อัตโนมัติ ถ้าเขียน `text` เอง ภาษาไทยจะแสดงอังกฤษจนกว่าจะเขียน `text (Thai)` ด้วย |

---

## 6. ตัวสร้างความสามารถ (Effect)

effect 1 อัน = **เมื่อไหร่** (trigger) + **ถ้า** (condition, ไม่ใส่ก็ได้) + **กับใคร** (target) + **ทำอะไร** (actions หลายอันได้)

| ช่อง | ความหมาย |
|---|---|
| `scope` | `UNIT` = ของการ์ดบนบอร์ด · `PLAYER` = ของผู้เล่น (Relic, Hero Power, Series Bond, Gear) |
| `trigger` | เมื่อไหร่ทำงาน (ตารางด้านล่าง) |
| `every` | ใช้กับ AVENGE: ทำงานทุกๆ N ตัวที่ฝ่ายเราตาย |
| `condition` | เงื่อนไข เช่น มี Sentai ≥ 3 สี, มียูนิตเผ่า X ≥ N ตัว, มี Energy ≥ N, `HAS_CARD` = มีการ์ดใบใดใบหนึ่งในรายการบนบอร์ด (นับร่างที่แปลงแล้ว) |
| `target.selector` | กับใคร (ตารางด้านล่าง) + กรอง `faction` / `series` / `cards` (เฉพาะการ์ดเหล่านี้ ใบใดใบหนึ่ง นับร่างที่แปลงแล้ว) ได้ |
| `actions` | ทำอะไร (ตารางด้านล่าง) |
| `golden multiplier` | ตัวคูณตอนการ์ดเป็น Final Form (ค่าปกติ ×2) |
| `limit` | **จำกัดจำนวนครั้ง**: ทำงานได้ไม่เกิน `at most` ครั้งต่อ `TURN` (เทิร์น) หรือ `GAME` (ทั้งเกม) — นับแยกต่อยูนิตแต่ละตัว (หรือต่อ Relic/Hero/Gear) · ตอนต่อสู้นับต่อการต่อสู้ · ครั้งที่เงื่อนไขไม่ผ่านไม่นับ |
| `happens N times` (`repeat`) | ความสามารถนี้ทำงานกี่ครั้งต่อการเกิด 1 ครั้ง (1–5) เช่น "ถูกขาย: ได้ Gear สุ่ม (2 ครั้ง)" |

### Trigger
| trigger | ทำงานเมื่อ | ช่วง |
|---|---|---|
| `ON_PLAY` | ลงจากมือ (Deploy) / ใช้ Gear | ซื้อของ |
| `END_OF_TURN` | จบช่วงซื้อของ | ซื้อของ |
| `HENSHIN` | การ์ดนี้แปลงร่าง | ซื้อของ |
| `START_OF_COMBAT` | เริ่มการต่อสู้ | ต่อสู้ |
| `ON_ATTACK` | การ์ดนี้โจมตี | ต่อสู้ |
| `AFTER_DAMAGED` | โดนดาเมจแล้วยังรอด | ต่อสู้ |
| `LAST_STAND` | การ์ดนี้ตาย | ต่อสู้ |
| `AVENGE` | ฝ่ายเราตายครบ `every` ตัว | ต่อสู้ |
| `ALLY_SUMMONED` | มียูนิต**ตัวอื่น**ถูกเรียกเข้าฝั่งเรา (ใช้คู่กับเป้าหมาย `SUMMONED`) | ทั้งคู่ |
| `ON_SELL` | การ์ดนี้ถูกขาย (จากบอร์ดหรือมือ) ทำงานก่อนการ์ดหายไป | ซื้อของ |
| `ON_DISCARD` | การ์ดนี้ถูก**การ์ดใบอื่นทิ้ง**ออกจากมือ (action `DISCARD`) | ซื้อของ |
| `ON_ACQUIRE` | ได้ Relic / เลือก Hero (passive) | ซื้อของ |
| `ON_TURN_START` | ต้นทุกเทิร์น (Relic, Hero) | ซื้อของ |
| `ON_USE` | กดใช้ Hero Power | ซื้อของ |
| `ON_ROLL_CALL` / `ON_ROLL_CALL_WIN` | ใช้ใน Gauge: เกิด Roll Call / ชนะการต่อสู้ที่เกิด Roll Call | ต่อสู้ |

### Target (selector)
| selector | ใคร |
|---|---|
| `SELF` | ตัวมันเอง |
| `ADJACENT` | ตัวที่อยู่ข้างๆ |
| `LEFTMOST_FRIENDLY` / `RIGHTMOST_FRIENDLY` | พวกเราซ้ายสุด / ขวาสุด |
| `RANDOM_FRIENDLY` | พวกเราตัวอื่น 1 ตัวแบบสุ่ม |
| `ALL_FRIENDLY` | พวกเราทุกตัว |
| `SUMMONED` | ตัวที่เพิ่งถูกเรียก (ใช้ได้กับ trigger `ALLY_SUMMONED` เท่านั้น) |
| `GIANT_SLOT` | หุ่นใน Giant Slot (ช่วงซื้อของ: หุ่นในช่อง, ตอนต่อสู้: หุ่นที่ลงสนามแล้ว) — Gear ที่ใช้กับหุ่นจะใช้ไม่ได้ถ้ายังไม่มีหุ่น |
| `CHOSEN_FRIENDLY` | **ผู้เล่นเลือกเอง** (ใช้กับ Gear: ลาก Gear ไปวางบนยูนิต/กด Use แล้วคลิก) ที่อื่นจะเป็นซ้ายสุด |
| `LEFTMOST_ENEMY` / `RANDOM_ENEMY` / `ALL_ENEMY` | ศัตรู (ใช้ได้เฉพาะช่วงต่อสู้) |

### Action
| action | ทำอะไร | ช่วง |
|---|---|---|
| `BUFF` | +atk/+hp (`permanent` ✔ = ช่วงต่อสู้แล้วติดตัวถาวร; ช่วงซื้อของถาวรอยู่แล้ว) | ทั้งคู่ |
| `GIVE_KEYWORD` | ให้ keyword | ทั้งคู่ |
| `SUMMON` | เรียกการ์ด (`count` ตัว) | ทั้งคู่ |
| `TRANSFORM` | เปลี่ยนเป้าหมายเป็นการ์ดอื่น | ทั้งคู่ |
| `DESTROY` | ทำลายเป้าหมาย | ทั้งคู่ |
| `DAMAGE` | ทำดาเมจ | ต่อสู้เท่านั้น |
| `GAIN_ENERGY` | ได้ Energy | ซื้อของเท่านั้น |
| `ADD_TO_HAND` | ได้การ์ดเข้ามือ | ซื้อของเท่านั้น |
| `DISCOVER_UNIT` | เลือกรับยูนิต 1 จาก 3 (กรองเผ่าได้; ว่าง = ทุกเผ่า) | ซื้อของเท่านั้น |
| `DISCOVER_GIANT` | เลือก Giant Robo | ซื้อของเท่านั้น |
| `GAUGE_ADD` | เติม Gauge | ซื้อของเท่านั้น |
| `MODIFY_RULE` | เปลี่ยนกฎให้ผู้เล่นคนนั้น (`SET`/`ADD`/`MUL`, ชื่อกฎดูข้อ 9) | ซื้อของเท่านั้น |
| `RANDOM_CARD` | ได้การ์ด**สุ่ม**เข้ามือ: `GEAR` = Gear ในร้านที่ rank ≤ ร้านเรา, `UNIT` = ยูนิตจากกองกลาง (กรองเผ่าได้) — ถ้าอยากได้**ใบที่กำหนด**ใช้ `ADD_TO_HAND` (ใส่ได้ทั้ง Gear และยูนิต) | ซื้อของเท่านั้น |
| `ULTIMATE_FORM` | เปลี่ยน/อัปเกรดร่างเป้าหมายเป็น `ultimateInto` ของการ์ดนั้น (ใช้กับยูนิตบนบอร์ดหรือหุ่น `GIANT_SLOT`) | ซื้อของเท่านั้น |
| `BUFF_SHOP` | ยูนิตในร้านค้าได้ +atk/+hp จนจบเกม (ซื้อไปแล้วติดตัว) | ซื้อของเท่านั้น |
| `DEVOUR_SHOP` | กลืนกินยูนิตในร้าน 1 ตัว เป้าหมายได้ ATK/HP ของมันถาวร · `choose`: สุ่ม / ค่าพลังมากสุด / น้อยสุด (ATK+HP) · จำกัดได้ว่ากินเฉพาะเผ่า · ใช้ `limit` กันกินรัวๆ | ซื้อของเท่านั้น |
| `DISCARD` | **ทิ้งการ์ดในมือ** `count` ใบ: สุ่ม / ซ้ายสุด / ขวาสุด · เลือกได้ว่าการ์ดอะไรก็ได้ / เฉพาะยูนิต / เฉพาะ Gear · การ์ดที่ถูกทิ้งจะทำผล `ON_DISCARD` ของมัน | ซื้อของเท่านั้น |
| `SUMMON_FROM_HAND` | เรียกยูนิตจากบนมือ: ช่วงซื้อของ = การ์ดออกจากมือลงบอร์ด (ไม่ทำ Deploy), ตอนต่อสู้ = สำเนาของยูนิตบนมือลงสนาม (การ์ดยังอยู่ในมือ) | ทั้งคู่ |
| `SUPER_GATTAI` | ปลด Super Gattai (หุ่น +atk/+hp และได้ keyword ของ Extra Ranger เมื่อมี Extra บนบอร์ด) | ซื้อของเท่านั้น |

> `ALLY_SUMMONED` เกิดได้ทั้งตอนซื้อของ (เช่น Hero เรียก Cub ต้นเทิร์น → บัฟติดถาวร) และตอนต่อสู้ จึงใช้ได้แค่ action ที่ทำงานทั้ง 2 ช่วง (บัฟ, ให้ keyword, เรียก, ทำลาย)
> **รางวัลหลังการต่อสู้**: `GAIN_ENERGY`, `ADD_TO_HAND`, `RANDOM_CARD`, `DISCOVER_UNIT`, `GAUGE_ADD`, `BUFF_SHOP` ใส่ใน trigger ช่วงต่อสู้ได้ (เริ่มสู้, เมื่อโจมตี, เมื่อโดนดาเมจ, Last Stand, Avenge) ผลจะ**ได้ตอนเริ่มเทิร์นหน้า** หลังเติม Energy ปกติ เช่น "เมื่อโจมตี: ได้ 1 Energy ในเทิร์นหน้า" (ข้อความการ์ดเขียนคำว่า "ในเทิร์นหน้า" ให้เอง, log การต่อสู้ขึ้นว่าใครได้อะไร) · ตีหลายครั้ง = ได้หลายครั้ง ใช้ `limit` คุมได้ · การ์ดทองคูณตามปกติ
>
> action "ซื้อของเท่านั้น" ที่เหลือ ห้ามใส่ใน trigger ช่วงต่อสู้ (เช่น LAST_STAND + DISCARD) และ selector ศัตรู/DAMAGE ห้ามใส่ใน trigger ช่วงซื้อของ — ถ้าใส่ผิด กล่องแดงจะเตือนตอน Save

### สูตรตัวอย่าง
| อยากได้ | ตั้งค่า |
|---|---|
| ลงจากมือแล้วบัฟพวกซ้ายสุด +2/+2 | scope UNIT · trigger `ON_PLAY` · target `LEFTMOST_FRIENDLY` · action `BUFF` 2/2 |
| ตายแล้วเรียกลูกน้อง 2 ตัว | trigger `LAST_STAND` · action `SUMMON` cardKey=grunt_token count=2 |
| ทุกตัวที่ถูกเรียกเข้ามาได้ +1/+1 (แบบเผ่า Beast) | trigger `ALLY_SUMMONED` · target `SUMMONED` · `BUFF` 1/1 |
| Gear ได้ Gear สุ่ม 2 ใบ | kind GEAR · `ON_PLAY` · `RANDOM_CARD` cardKind=GEAR · happens 2 times |
| ยูนิตลงแล้วได้ Gear ที่กำหนด | `ON_PLAY` · `ADD_TO_HAND` cardKey=g_armor |
| จบเทิร์นให้ keyword | `END_OF_TURN` · target `RIGHTMOST_FRIENDLY` · `GIVE_KEYWORD` GUARD |
| จบเทิร์นเพิ่มพลังยูนิตในร้าน | `END_OF_TURN` · `BUFF_SHOP` 1/1 |
| ลงแล้วกลืนกินยูนิตในร้าน | `ON_PLAY` · target `SELF` · `DEVOUR_SHOP` |
| เริ่มสู้เรียกยูนิตจากมือ | `START_OF_COMBAT` · `SUMMON_FROM_HAND` count=1 |
| ขายการ์ดนี้แล้วมีผล 2 ครั้ง | `ON_SELL` · action อะไรก็ได้ช่วงซื้อของ · happens 2 times |
| การ์ดที่สั่งทิ้งการ์ด | `ON_PLAY` · `DISCARD` count=1 pick=RANDOM cardKind=UNIT |
| ถูกทิ้งแล้วมีผล 2 ครั้ง | `ON_DISCARD` · target `ALL_FRIENDLY` · `BUFF` 2/2 · happens 2 times |
| จบเทิร์นกินตัวแรงสุดในร้าน เทิร์นละครั้ง | `END_OF_TURN` · target `SELF` · `DEVOUR_SHOP` choose=STRONGEST · limit at most 1 per TURN |
| Deploy ของทุกใบทำงาน 2 ครั้ง | ใส่ keyword `ECHO` (ระหว่างมันอยู่บนบอร์ด) |
| Gear เปลี่ยนร่าง Rider เป็นร่างของซีรีส์ | Gear · target `CHOSEN_FRIENDLY` faction=rider · `ULTIMATE_FORM` (+ BUFF) และตั้ง `ultimate form` ให้การ์ด Rider แต่ละใบ |
| Gear อัปเกรดหุ่น Sentai | Gear · target `GIANT_SLOT` · `ULTIMATE_FORM` และตั้ง `ultimate form` ให้การ์ดหุ่น (kind GIANT) |
| ตีแล้วเรียก Cub | trigger `ON_ATTACK` · action `SUMMON` cardKey=beast_cub |
| ตีแล้วโตถาวร +1/+0 | trigger `ON_ATTACK` · target `SELF` · action `BUFF` 1/0 ✔permanent |
| เริ่มสู้ ถ้ามี Sentai ≥ 3 สี ให้ Sentai ทุกตัว +1/+1 | trigger `START_OF_COMBAT` · condition `TEAM_UP_COLORS_GTE` 3 · target `ALL_FRIENDLY` faction=sentai · `BUFF` 1/1 |
| Gear ให้ยูนิตที่เลือกได้ Barrier | kind GEAR · scope PLAYER · trigger `ON_PLAY` · target `CHOSEN_FRIENDLY` · `GIVE_KEYWORD` BARRIER |
| Gear เรียกยูนิตเผ่า Rider | kind GEAR · scope PLAYER · `ON_PLAY` · `DISCOVER_UNIT` faction=rider |
| Relic ต้นเทิร์นได้ 1 Energy | Relic · scope PLAYER · `ON_TURN_START` · `GAIN_ENERGY` 1 |

---

## 7. Hero, Relic, เผ่า, ซีรีส์, Gauge

**Heroes** — `armor` (เกราะเริ่มต้น) และ `power`:
- `mode`: `ACTIVE` (กดใช้เทิร์นละครั้ง, `cost` = Energy) · `ONCE` (ครั้งเดียวต่อเกม) · `PASSIVE` (ทำงานเอง ใช้ trigger `ON_ACQUIRE`/`ON_TURN_START`)
- effect ของ power ใช้ scope PLAYER, ACTIVE/ONCE ใช้ trigger `ON_USE`

**Relics** — ได้เลือกเทิร์น 5 (Lesser) และ 9 (Greater)
- `tier` LESSER/GREATER · `cost` จ่ายตอนเลือก (มีตัวเลือกราคา 0 เสมอถ้ามี) · `weight` ยิ่งมากยิ่งสุ่มเจอบ่อย (ค่าปกติ 100)
- `factions` / `series` = ผูกกับเผ่า/ซีรีส์ (ระบบชอบเสนอตัวที่ตรงกับบอร์ดผู้เล่น และไม่เสนอถ้าเผ่า/ซีรีส์นั้นไม่อยู่ในเกม)

**Factions** — ชุด prototype (ที่ใช้ทดสอบอยู่) มี 8 เผ่า: Rider, Sentai, Mecha, Kaijin, **Beast** (เรียกพวกตอนโจมตี/ตาย + จ่าฝูงบัฟตัวที่ถูกเรียก), Ally, Dark Rider, Shonen
`color` สีป้าย, `text`/`text (Thai)` คำอธิบายเผ่า (โชว์ตอนชี้ชื่อเผ่า) แต่ละเกมสุ่มใช้ 5 เผ่า

**Series** — `universe` (tokusatsu/anime), `franchise` (เช่น super-sentai, kamen-rider) และ `bonds` = โบนัสเมื่อมีซีรีส์เดียวกันบนบอร์ดครบ `count` ตัว (effect ต้องเป็น scope PLAYER + `START_OF_COMBAT`)
แต่ละเกม franchise ที่มีเกิน 3 ซีรีส์จะสุ่มใช้แค่ 3 (Featured Series)

**Gauges** — `max`, `sources` (เติมจาก ON_ROLL_CALL / ON_ROLL_CALL_WIN / HENSHIN เท่าไหร่) และ `thresholds`:
- `at` = ถึงกี่แต้มได้รางวัล, `once` ✔ = ครั้งเดียวต่อเกม (ไม่ติ๊ก = ได้ทุกครั้งที่ครบ `at` แล้วหักแต้ม)
- `reward` = action ที่ไม่ต้องมีเป้าหมาย (ADD_TO_HAND, DISCOVER_GIANT, SUPER_GATTAI, GAIN_ENERGY, …)

---

## 8. ภาษาไทย

- ปล่อย `text` และ `text (Thai)` ว่าง = ระบบสร้างคำอธิบายทั้ง 2 ภาษาจาก effect (แนะนำ)
- ถ้าเขียน `text` อังกฤษเอง ควรเขียน `text (Thai)` ด้วย ไม่งั้นผู้เล่นที่เลือกภาษาไทยจะเห็นอังกฤษ
- ชื่อการ์ด/keyword เป็นภาษาอังกฤษในทั้ง 2 ภาษา

---

## 9. แท็บ Rules (ตัวเลขกฎของทั้งเกม)

ติ๊กกฎที่อยากเปลี่ยนจากค่าปกติ เอาติ๊กออก = กลับค่าปกติ ช่อง **In effect** บอกค่าที่ใช้จริง
Relic/Hero/การ์ดยังเปลี่ยนกฎให้ผู้เล่นคนเดียวได้ด้วย `MODIFY_RULE`

| กฎ | ความหมาย |
|---|---|
| startEnergy / energyPerTurn / maxEnergy | Energy เริ่ม / เพิ่มต่อเทิร์น / สูงสุด |
| buyCost / sellValue / refreshCost | ราคาซื้อยูนิต / ขายได้ / ราคารีเฟรช |
| boardSize / handSize / maxRank | ขนาดบอร์ด / มือ / rank ร้านสูงสุด |
| freeRefreshesPerTurn | รีเฟรชฟรีต่อเทิร์น |
| rollCallColors / rollCallBuff | Sentai กี่สีถึงเกิด Roll Call (ตอนนี้ 3) / บัฟ Roll Call |
| gattaiSize | ยูนิตติดกันกี่ตัวถึงรวมร่างได้ |
| giantEntryThreshold / giantSentaiScale | หุ่นลงสนามเมื่อเหลือ ≤ กี่ตัว / สัดส่วน stat Sentai ที่หุ่นได้ |
| kyodaikaMultiplier | ตัวคูณ stat ตอน Kyodaika |

---

## 10. Versions (ย้อนเวอร์ชัน) และ History

- **Versions**: รายการเวอร์ชันพร้อมโน้ต — ปุ่มคัดลอกเวอร์ชันเก่ามาเป็น draft แล้ว **Publish** = rollback
- **History**: ใคร save/publish/อัปโหลดรูป เมื่อไหร่

---

## 11. Simulate (ทดลองด้วย bot)

1. **Simulate** → ใส่จำนวนเกม (1–300) → เลือก `the draft` (ของที่กำลังแก้) หรือ `what is published`
2. (ไม่บังคับ) เลือก `bot 1 starts with <Relic>` เพื่อดูว่า Relic นั้นช่วยแค่ไหน
3. **Run** (เกมละ 8 bot, จำกัดเวลา ~10 วินาที ถ้าไม่ทันจะรายงานเท่าที่เล่นจบ)

อ่านผล: **Avg place** ต่ำ = เก่ง (ค่าเฉลี่ยกลางคือ 4.5) · เขียว = เก่งเกิน · แดง = อ่อนเกิน
ตาราง: Heroes, Relics, Factions (บอร์ดที่มีเผ่านั้น ≥ 3 ตัว), Best/Worst cards, การ์ดที่ไม่เคยถูกใช้
> bot เล่นแบบง่ายๆ ให้ดูว่า "มีอะไรโดดเกินไหม" ไม่ใช่คำตัดสิน balance

---

## 12. Stats (สถิติจากเกมจริง) และปรับ weight Relic

- **Stats**: ทุกเกมที่เล่นจบ — การ์ดนับ 1 ครั้งต่อผู้เล่นที่มีมันบนบอร์ดสุดท้าย
  คอลัมน์: Seen (จำนวน), Pick % (สัดส่วนผู้เล่นที่ใช้), Avg place, Win %
- ติ๊ก **humans only** เพื่อตัด bot ออก
- **Relic weights**: ระบบแนะนำ weight ใหม่ (Relic ที่คนถือได้อันดับดี → สุ่มเจอน้อยลง 15% ต่ออันดับ, ช่วง ×0.5–×1.5, ต้องมีคนถือ ≥ 5 ครั้ง)
  กด **Apply to the draft** → **Save draft** → **Publish**

---

## 13. ปัญหาที่เจอบ่อย (กล่องแดง)

| ข้อความ | แก้ |
|---|---|
| `references unknown card "x"` | key การ์ดที่อ้างถึง (SUMMON, henshin into, gattaiInto, ADD_TO_HAND) พิมพ์ผิดหรือถูกลบ |
| `references unknown faction/series` | ชื่อเผ่า/ซีรีส์ในการ์ด, target, condition หรือ DISCOVER_UNIT ไม่มีอยู่ |
| `is gear: its effects must be player-scope ON_PLAY` | Gear ต้องตั้ง scope PLAYER และ trigger ON_PLAY |
| `has a player-scope effect, which only gear may have` | ยูนิตต้องใช้ scope UNIT |
| `has gattaiInto but not the GATTAI keyword` | ใส่ keyword GATTAI ให้ core |
| `bond effects must be player-scope START_OF_COMBAT` | Series bond ต้องเป็นแบบนี้ |
| `gauge reward uses X, which needs a target` | รางวัล Gauge ใช้ได้แค่ action ที่ไม่มีเป้าหมาย |
| `modifies unknown rule` | ชื่อกฎใน MODIFY_RULE ผิด (ดูข้อ 9) |
| `X only works in the recruit phase, not on LAST_STAND` | action ช่วงซื้อของถูกใส่ใน trigger ช่วงต่อสู้ (ดูตาราง action ข้อ 6) |
| `DAMAGE only works in a fight` / `enemies can only be targeted in a fight` | ดาเมจ/เป้าหมายศัตรูใช้ได้เฉพาะ trigger ช่วงต่อสู้ |
| `target SUMMONED only works with ALLY_SUMMONED` | เป้าหมาย "ตัวที่ถูกเรียก" ต้องใช้กับ trigger ALLY_SUMMONED |
| `references unknown card` ใน ultimateInto | ร่าง ultimate ที่ตั้งไว้ไม่มีอยู่ |
| `X cannot be used on ALLY_SUMMONED` | ALLY_SUMMONED ใช้ได้แค่ action ที่ทำงานทั้งช่วงซื้อของและต่อสู้ |
| `duplicate card key` | key ซ้ำ เปลี่ยน key ของอันใหม่ |

## 14. Checklist ก่อน Publish
- [ ] กล่องแดงว่าง
- [ ] Preview การ์ดถูกต้อง (หลัง Save draft)
- [ ] ถ้าเขียน text อังกฤษเอง เขียน text (Thai) ด้วย
- [ ] ลอง Simulate กับ draft อย่างน้อย 40 เกม ไม่มีอะไรเขียว/แดงจัดผิดปกติ
- [ ] ใส่โน้ตตอน Publish ว่าเปลี่ยนอะไร (ย้อนดูใน Versions ได้)

---

## 15. Keyword Echo
`ECHO` (Echo): ระหว่างการ์ดที่มี Echo อยู่บนบอร์ด เอฟเฟค **Deploy** ของการ์ดที่ลงทีหลังทำงาน 2 ครั้ง (มี Echo หลายใบก็ยัง 2 ครั้ง)

## 16. ชุดการ์ด: prototype (ทดสอบ) และ production (เปล่า)
- `prototype` = **ชุดทดสอบ**: 8 เผ่า (Rider, Sentai, Mecha, Kaijin, Beast, Ally, Dark Rider, Shonen) การ์ดครบ + การ์ดตัวอย่างของกลไกใหม่ทุกแบบ (Echo Bard, Tavern Devourer, Grave Caller, Restless Spirit ฯลฯ)
- `production` = **ชุดเปล่า** (เหมือน `blank`) ไว้เริ่มทำการ์ดจริงเองทั้งหมด: ไม่มีเผ่า ซีรีส์ Gauge หรือ Relic
มีแค่สิ่งที่เกมขาดไม่ได้: Hero 2 ตัว (Placeholder Hero A/B) และยูนิตในร้าน 1 ใบ (Placeholder Unit) — สร้างของจริงแล้วค่อยลบทิ้ง

วิธีใช้กับ Docker (ทำครั้งเดียว):
1. ในไฟล์ `.env` ตั้ง `CONTENT_SET=production` (หรือ `blank`) และ `CONTENT_RESEED=1`
2. `docker compose up -d --build server` → ระบบ publish ชุดเปล่าเป็นเวอร์ชันใหม่ (เวอร์ชันเก่ายังอยู่ ย้อนได้ในหน้า Versions)
3. ตั้ง `CONTENT_RESEED=0` แล้ว `docker compose up -d server` (ไม่งั้นทุก restart จะ publish ชุดเปล่าทับงานที่ทำใน Admin)
4. เข้า Admin สร้างเผ่า (Factions) → ซีรีส์ (Series) → การ์ด (Card wizard) → Hero → Relic → Gauge แล้ว Publish

## 17. เสียงและเพลง (แท็บ Sounds)
แท็บ **Sounds** อยู่ข้างแท็บ Rules ทางซ้าย แบ่งเป็นกลุ่ม: Tavern (ร้าน), Board (บอร์ด), Fight (ต่อสู้), Results (ผลลัพธ์), General (ทั่วไป) และ Music (เพลง)

แต่ละแถว (หนึ่งเหตุการณ์):
- **File**: ไฟล์ที่ใช้อยู่ (`built-in` = เสียงสังเคราะห์ที่มากับเกม, `none` = ไม่มีเสียงจนกว่าจะอัปโหลด)
- **Upload**: เลือกไฟล์ MP3 / OGG / WAV (ไม่เกิน 6 MB; เสียงเอฟเฟคควรสั้น 1–2 วินาที)
- **Volume**: ความดังของช่องนั้น (คูณกับความดังที่ผู้เล่นตั้ง)
- **▶** ลองฟัง · **✕** ลบไฟล์ กลับไปใช้เสียงเดิม

| กลุ่ม | ช่อง |
|---|---|
| Tavern | ซื้อยูนิต, ซื้อ Gear, ขาย, รีเฟรช, แช่ร้าน, อัปเกรดร้าน, ทำไม่ได้/เงินไม่พอ |
| Board | ลงยูนิต, ใช้ Gear, รวม 3 ใบ, Gattai/Combine, แปลงร่าง (Henshin/Ultimate), เลือก Discover, เลือก Relic, Hero Power, ทิ้งการ์ด |
| Fight | ตี, โดนตี, Barrier แตก, ตาย, เรียกยูนิต, Kyodaika, หุ่นลงสนาม, Roll Call |
| Results | ชนะรอบ, แพ้รอบ, ตกรอบ, จบเกมอันดับ 1, ท็อป 4, อันดับ 5–8 |
| General | เริ่มเทิร์น, เหลือ 5 วินาที, กดปุ่ม (มีเสียงเฉพาะเมื่ออัปโหลด) |
| Music (วนซ้ำ) | lobby, ช่วงซื้อของ, ช่วงต่อสู้, จบเกมชนะ, จบเกมไม่ชนะ |

**เสียงเฉพาะการ์ด/เผ่า**: ในฟอร์มการ์ด (และเผ่า) ติ๊กช่อง **sounds** แล้วอัปโหลดเสียง "played / summoned" (ลงสนาม/ถูกเรียก), "attacks" (ตี), "dies" (ตาย), "transforms into this" (มีตัวแปลงร่างเป็นการ์ดนี้)
ลำดับที่เกมเลือก: เสียงของการ์ด → เสียงของเผ่า → ช่องเหตุการณ์ในแท็บ Sounds → เสียงที่มากับเกม

เสียงอยู่ใน content เหมือนการ์ด: **Save draft → Publish** แล้วเกมใหม่จะได้ยิน
ผู้เล่นปรับความดังได้เองที่ปุ่ม 🔊 ▾ มุมบนขวา (เอฟเฟค / เพลง แยกกัน) — เบราว์เซอร์จะไม่เล่นเสียงจนกว่าผู้เล่นจะคลิกอะไรสักอย่างก่อน
> เสียงจากซีรีส์จริงมีลิขสิทธิ์: ถ้าเปิดเกมสาธารณะควรใช้เสียงที่ทำเองหรือเสียงฟรี

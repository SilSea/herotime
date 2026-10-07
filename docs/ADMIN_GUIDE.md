# คู่มือหน้า Admin (Content editor)

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
| **History** | บันทึกว่าใครทำอะไรกับ content เมื่อไหร่ |
| **Back to editing** | กลับมาหน้าแก้ไข (โผล่เมื่ออยู่ในหน้า Versions/Simulate/Stats/History) |

---

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
   - **เงื่อนไข** (ไม่ใส่ = ทุกครั้ง)
   - **ทำอะไร** และค่าของมัน (บัฟกี่แต้ม, ให้ keyword อะไร, เรียกการ์ดไหนกี่ตัว ...)
   - **กับใคร** (+ กรองเฉพาะเผ่าได้)
   - ระบบ**ให้เลือกเฉพาะตัวเลือกที่ใช้ด้วยกันได้** เช่น "เมื่อตาย" จะไม่มี "ได้ Energy", "เมื่อเรียกยูนิตอื่น" จะมีเป้าหมาย "ตัวที่เพิ่งถูกเรียก"
4. **การแปลงร่าง** (ยูนิต): Henshin หลังกี่เทิร์น → แปลงเป็นการ์ดไหน · Gattai core → กลุ่มรวมเป็นการ์ดไหน

ฝั่งขวา: ตัวอย่างการ์ด + คำอธิบายเป็นประโยค + กล่องแดงบอกสิ่งที่ยังขาด (ปุ่มเพิ่มจะกดได้เมื่อขึ้น "✔ พร้อมเพิ่มแล้ว")
- **เพิ่มและบันทึก draft** = ใส่การ์ดใน draft แล้ว Save ทันที (ระบบเขียนคำอธิบายการ์ดให้ทั้งไทยและอังกฤษ) แล้วพาไปหน้าแก้ไขการ์ดนั้น
- **เพิ่มเข้า draft** = ใส่อย่างเดียว ยังไม่ save
- เสร็จแล้วอย่าลืม **Publish** การ์ดถึงจะอยู่ในเกมใหม่
- อยากแก้ละเอียดกว่านี้ (เช่น หลาย action ในความสามารถเดียว, golden multiplier) ใช้ฟอร์มปกติในข้อ 4.1–4.5

### 4.1 ปรับค่าพลังการ์ด
1. แท็บ **Cards** → พิมพ์ชื่อในช่อง Search → คลิกการ์ด
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
| `condition` | เงื่อนไข เช่น มี Sentai ≥ 3 สี, มียูนิตเผ่า X ≥ N ตัว, มี Energy ≥ N |
| `target.selector` | กับใคร (ตารางด้านล่าง) + กรอง `faction` / `series` ได้ |
| `actions` | ทำอะไร (ตารางด้านล่าง) |
| `golden multiplier` | ตัวคูณตอนการ์ดเป็น Final Form (ค่าปกติ ×2) |

### Trigger
| trigger | ทำงานเมื่อ | ช่วง |
|---|---|---|
| `ON_PLAY` | ลงจากมือ (Henshin Call) / ใช้ Gear | ซื้อของ |
| `END_OF_TURN` | จบช่วงซื้อของ | ซื้อของ |
| `HENSHIN` | การ์ดนี้แปลงร่าง | ซื้อของ |
| `START_OF_COMBAT` | เริ่มการต่อสู้ | ต่อสู้ |
| `ON_ATTACK` | การ์ดนี้โจมตี | ต่อสู้ |
| `AFTER_DAMAGED` | โดนดาเมจแล้วยังรอด | ต่อสู้ |
| `LAST_STAND` | การ์ดนี้ตาย | ต่อสู้ |
| `AVENGE` | ฝ่ายเราตายครบ `every` ตัว | ต่อสู้ |
| `ALLY_SUMMONED` | มียูนิต**ตัวอื่น**ถูกเรียกเข้าฝั่งเรา (ใช้คู่กับเป้าหมาย `SUMMONED`) | ทั้งคู่ |
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
| `SUPER_GATTAI` | ปลด Super Gattai (หุ่น +atk/+hp และได้ keyword ของ Extra Ranger เมื่อมี Extra บนบอร์ด) | ซื้อของเท่านั้น |

> `ALLY_SUMMONED` เกิดได้ทั้งตอนซื้อของ (เช่น Hero เรียก Cub ต้นเทิร์น → บัฟติดถาวร) และตอนต่อสู้ จึงใช้ได้แค่ action ที่ทำงานทั้ง 2 ช่วง (บัฟ, ให้ keyword, เรียก, ทำลาย)
> action "ซื้อของเท่านั้น" ห้ามใส่ใน trigger ช่วงต่อสู้ (เช่น LAST_STAND + GAIN_ENERGY) และ selector ศัตรู/DAMAGE ห้ามใส่ใน trigger ช่วงซื้อของ — ถ้าใส่ผิด กล่องแดงจะเตือนตอน Save

### สูตรตัวอย่าง
| อยากได้ | ตั้งค่า |
|---|---|
| ลงจากมือแล้วบัฟพวกซ้ายสุด +2/+2 | scope UNIT · trigger `ON_PLAY` · target `LEFTMOST_FRIENDLY` · action `BUFF` 2/2 |
| ตายแล้วเรียกลูกน้อง 2 ตัว | trigger `LAST_STAND` · action `SUMMON` cardKey=grunt_token count=2 |
| ทุกตัวที่ถูกเรียกเข้ามาได้ +1/+1 (แบบเผ่า Beast) | trigger `ALLY_SUMMONED` · target `SUMMONED` · `BUFF` 1/1 |
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

**Factions** — ตอนนี้ (production v2) มี 8 เผ่า: Rider, Sentai, Mecha, Kaijin, **Beast** (เรียกพวกตอนโจมตี/ตาย + จ่าฝูงบัฟตัวที่ถูกเรียก), Ally, Dark Rider, Shonen
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
| `X cannot be used on ALLY_SUMMONED` | ALLY_SUMMONED ใช้ได้แค่ action ที่ทำงานทั้งช่วงซื้อของและต่อสู้ |
| `duplicate card key` | key ซ้ำ เปลี่ยน key ของอันใหม่ |

## 14. Checklist ก่อน Publish
- [ ] กล่องแดงว่าง
- [ ] Preview การ์ดถูกต้อง (หลัง Save draft)
- [ ] ถ้าเขียน text อังกฤษเอง เขียน text (Thai) ด้วย
- [ ] ลอง Simulate กับ draft อย่างน้อย 40 เกม ไม่มีอะไรเขียว/แดงจัดผิดปกติ
- [ ] ใส่โน้ตตอน Publish ว่าเปลี่ยนอะไร (ย้อนดูใน Versions ได้)

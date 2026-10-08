# ชุดการ์ด v1 (ร่างแรก รอผู้ใช้ตรวจ)

ร่างการ์ดของทั้ง 7 เผ่า ตามแนวใน `FACTIONS.md` และเรื่องที่กำหนด **ยังไม่ได้ใส่ลง draft** ผู้ใช้จะตรวจและปรับก่อน
ออกแบบใหม่ทั้งหมด ไม่อิงการ์ดที่มีใน draft · Rider มีพระเอกและ**ไรเดอร์ฝ่ายร้าย** (ไม่มีสัตว์ประหลาด) ขายเป็นร่างคนแล้ว Henshin เป็นไรเดอร์ · Sentai มีแต่ฝ่ายเรนเจอร์

| เผ่า | เรื่อง | การ์ดในร้าน | ร่าง / Token | Gear |
|---|---|---|---|---|
| Rider | Kamen Rider ZEZTZ | 14 (ร่างคน + ผู้ช่วย, รวมฝ่ายร้าย 5) | 24 | 11 (+ การ์ด Final Form กลาง) |
| Sentai | Ohsama Sentai King-Ohger | 15 | 1 | Giant 5 |
| Mecha | Genesis of Aquarion | 14 | 4 | 1 |
| Kaiju | Godzilla | 14 | 5 | 0 |
| Beast | Beastars | 15 | 3 | 0 |
| Human | ออกแบบเอง (ไม่มีเรื่อง) | 14 | 0 | 3 |
| Shonen | Naruto | 14 | 2 | 0 |

**ซีรีส์** (ช่อง `series` ของการ์ดและ Relic): Rider → `zeztz` · Sentai → `king_ohger` · Mecha → `aquarion` · Kaiju → `godzilla` (Mechagodzilla ด้วย) · Beast → `beastars` · Shonen → `naruto` · Human และการ์ด Final Form กลางไม่มีซีรีส์ · ยังไม่มี Series Bond (โบนัสเมื่อมีการ์ดซีรีส์เดียวกันครบ N ใบ)

**วิธีอ่าน**
- `R` = Rank · `ATK/HP` · keyword ตัวเอียงในวงเล็บ เช่น *(Guard)*
- ความสามารถเขียนแบบ Card wizard: **จังหวะ: สิ่งที่ทำ** (ชื่อ trigger / action อยู่ใน `FACTIONS.md` และ `ADMIN_GUIDE.md` ข้อ 6)
- "ถาวร" = `permanent` · "จนจบการสู้" = ไม่ใส่ permanent
- key ตั้งเป็นภาษาอังกฤษตัวเล็ก ใช้ได้เลยตอนสร้างใน Admin
- ค่าพลังคิดตามตารางข้อ 3 ใน `FACTIONS.md` เป็นค่าเริ่มต้น ต้อง Simulate แล้วปรับ

---

## 1. Rider — Kamen Rider ZEZTZ

**แนว**: ในร้านขาย**ร่างคน** ซึ่ง Henshin เป็นร่างไรเดอร์ตอนจบเทิร์น (ร่างไรเดอร์เป็น token ไม่ขายในร้าน) · Zeztz ใช้ **Capsem** (Gear) เปลี่ยนร่างไปมา บัฟติดไปทุกร่าง · Henshin ทุกครั้งเติม **Rider Gauge** ครบ 3 ได้**การ์ด Final Form** (การ์ดกลาง ใช้ได้ทุกเรื่อง) → **Zeztz Exdream**

> ชุดนี้ทดสอบแล้ว (ดู "ผลทดสอบ" ท้ายหัวข้อ) ข้อมูลการ์ดที่ใช้ทดสอบเป็น JSON อยู่ที่ `docs/sets/zeztz-rider.json` (`cards` + `riderGauge`) คัดลอกแต่ละใบไปวางในแท็บ JSON ของการ์ดใน Admin ได้

**การ์ดในร้าน: ร่างคนและผู้ช่วย** (14 ใบ · ร่างคนมีค่าพลังน้อย เพราะแปลงร่างก่อนเข้าสู้)
| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `baku_yorozu` | Baku Yorozu | 1/2 | Henshin (1) → Kamen Rider Zeztz | ตัวเอก |
| 1 | `kensei_odaka` | Kensei Odaka | 1/2 | Henshin (1) → Nox Knight | ใช้ Knight Invoker แล้วต่อด้วย Nox Driver |
| 1 | `nem` | Nem | 1/3 | Deploy: ให้ Zeztz (ทุกร่าง) +1/+1 ถาวร | คนดังที่เป็นครอบครัวบุญธรรมของ Baku |
| 1 | `nasuka` | Nasuka Nagumo | 2/2 | Deploy: ได้ Gear เผ่า Rider แบบสุ่มเข้ามือ | นักสืบ |
| 2 | `five` | Five | 2/2 | Henshin (1) → Lord Five | CODE 5 |
| 2 | `kureha_miyamoto` | Kureha Miyamoto | 2/2 | Henshin (1) → Lord Six | CODE 6 |
| 2 | `thirteen` | Thirteen *(ฝ่ายร้าย)* | 2/2 | Henshin (1) → Lord Thirteen | CODE ที่หลงเหลือ |
| 3 | `minami_yorozu` | Minami Yorozu | 2/3 | Henshin (1) → Knight Seventeen · เมื่อแปลงร่าง: ให้ Zeztz (ทุกร่าง) ได้ Barrier | CODE 17 |
| 4 | `eight` | Eight | 4/5 | Deploy: เสริมพลัง Gear +1/+1 จนจบเกม | CODE 8 |
| 3 | `fujimi` | Tetsuya Fujimi | 3/3 | Deploy: Rider Gauge +1 | ผู้บัญชาการตำรวจ |
| 4 | `sieg` | Sieg *(ฝ่ายร้าย)* | 3/4 | Henshin (1) → Kamen Rider Dawn | ผู้ก่อการร้ายในความฝัน |
| 5 | `three` | Three *(ฝ่ายร้าย)* | 4/5 | Henshin (1) → Lord Three · เมื่อแปลงร่าง: ได้ Gear เผ่า Rider แบบสุ่มเข้ามือ | CODE 3 |
| 5 | `the_lady` | The Lady *(ฝ่ายร้าย)* | 4/5 | Henshin (1) → Lord Two | CODE 2 |
| 6 | `shuma_kumon` | Shuma Kumon *(ฝ่ายร้าย)* | 4/5 | Henshin (1) → Kamen Rider Mugen | ใช้ Mugen Driver |

**ร่างไรเดอร์** (token ทั้งหมด)
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `zeztz` | Kamen Rider Zeztz (Physicam Impact) | 4/5 | — · Final Form → Zeztz Exdream |
| `nox_knight` | Nox Knight | 3/3 | Henshin (2) → Kamen Rider Nox |
| `nox` | Kamen Rider Nox | 5/5 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูทุกตัว · Final Form → Nox Midnight Shadow |
| `nox_midnight` | Nox Midnight Shadow (Final Form) | 9/8 *(Rapid)* | เริ่มการต่อสู้: ทำดาเมจ 2 ใส่ศัตรูทุกตัว |
| `lord_five` | Lord Five | 4/5 *(Rider Kick)* | — |
| `lord_six` | Lord Six | 4/3 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม (2 ครั้ง) |
| `knight_seventeen` | Knight Seventeen | 5/5 | — |
| `lord_thirteen` | Lord Thirteen *(ฝ่ายร้าย)* | 4/3 *(Barrier)* | — |
| `kamen_rider_dawn` | Kamen Rider Dawn *(ฝ่ายร้าย)* | 6/6 *(Rider Kick)* | Avenge (2): ตัวนี้ +2/+0 ถาวร |
| `lord_three` | Lord Three *(ฝ่ายร้าย)* | 7/7 *(Barrier)* | — |
| `lord_two` | Lord Two *(ฝ่ายร้าย)* | 7/7 *(Rider Kick)* | เริ่มการต่อสู้: ให้ศัตรูทุกตัว −1/−0 |
| `kamen_rider_mugen` | Kamen Rider Mugen *(ฝ่ายร้าย)* | 9/9 | เริ่มการต่อสู้: ทำลายศัตรูซ้ายสุด |

**ร่างของ Zeztz จาก Capsem** (token · ทุกร่างตั้ง Final Form → `zeztz_exdream` และ `formOf: zeztz`)
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `zeztz_wing` | Physicam Wing | 4/3 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม (2 ครั้ง) |
| `zeztz_transform` | Physicam Transform | 3/5 | เมื่อโจมตี: ตัวนี้ +2/+0 (จนจบการสู้) |
| `zeztz_stream` | Technolom Stream | 3/4 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูทุกตัว |
| `zeztz_machinery` | Technolom Machinery | 4/4 *(Rider Kick)* | — |
| `zeztz_projection` | Technolom Projection | 3/3 | เริ่มการต่อสู้: เรียกสำเนาของตัวนี้ (การ์ดพื้นฐาน) |
| `zeztz_recovery` | Esprim Recovery | 2/6 | เมื่อโดนดาเมจแล้วยังรอด: ให้พวกเราตัวอื่นแบบสุ่ม +0/+2 |
| `zeztz_barrier` | Esprim Barrier | 3/5 *(Barrier, Guard)* | — |
| `zeztz_wonder` | Paradigm Wonder | 3/3 | เริ่มการต่อสู้: ตัวนี้ +3/+3 (จนจบการสู้) |
| `zeztz_gravity` | Paradigm Gravity | 4/5 | เริ่มการต่อสู้: ทำดาเมจ 2 ใส่ศัตรูซ้ายสุด |
| `zeztz_plasma` | Inazuma Plasma | 5/4 *(Rapid)* | — |
| `zeztz_booster` | Plasma Booster | 6/5 *(Rapid, Rider Kick)* | — |
| `zeztz_exdream` | **Kamen Rider Zeztz Exdream** (Final Form) | 10/10 *(Rider Kick, Barrier)* | เริ่มการต่อสู้: ให้พวกเราทุกตัว +2/+2 (จนจบการสู้) |

**Capsem** (Gear เผ่า Rider · ใช้กับ: Rider ที่เลือก · ทำ: +1/+1 ถาวร · ถ้าเป็น Zeztz (นับทุกร่างผ่าน `formOf`) แปลงร่างเป็น… ด้วย)
| R | key | Gear | ราคา | แปลงเป็น |
|---|---|---|---|---|
| 1 | `capsem_wing` | Wing Capsem | 1 | Physicam Wing |
| 1 | `capsem_transform` | Transform Capsem | 1 | Physicam Transform |
| 2 | `capsem_stream` | Stream Capsem | 2 | Technolom Stream |
| 2 | `capsem_recovery` | Recovery Capsem | 2 | Esprim Recovery |
| 2 | `capsem_machinery` | Machinery Capsem | 2 | Technolom Machinery |
| 3 | `capsem_wonder` | Wonder Capsem | 3 | Paradigm Wonder |
| 3 | `capsem_barrier` | Barrier Capsem | 3 | Esprim Barrier |
| 4 | `capsem_projection` | Projection Capsem | 3 | Technolom Projection |
| 4 | `capsem_gravity` | Gravity Capsem | 4 | Paradigm Gravity |
| 4 | `capsem_plasma` | Plasma Capsem | 4 | Inazuma Plasma |
| 5 | `capsem_booster` | Booster Capsem | 3 | Plasma Booster · **เฉพาะการ์ด: Inazuma Plasma** |

**Rider Gauge**: ได้ +1 ทุกครั้งที่ Henshin · ทุกๆ 3 → ได้การ์ด Final Form เข้ามือ (ตั้งในแท็บ Gauges)

**การ์ด Final Form (การ์ดกลาง ทุกเรื่องใช้ใบเดียวกัน)** · `final_form` · Gear ไม่มีเผ่า Rank 5 ราคา 4 · ใช้กับ: ยูนิตที่เลือก (เลือกได้เฉพาะตัวที่มีร่าง Final Form) · ทำ: เปลี่ยนเป็นร่าง Final Form · ขายในร้านทุกเกม และ Rider Gauge ให้ฟรี · ไม่มีไอเท็ม Final Form ประจำเรื่อง

**หมายเหตุ Rider**
- Henshin (1) = ลงสนามแล้ว แปลงร่างตอนจบเทิร์นนั้นเลย จึงเข้าสู้เป็นร่างไรเดอร์ทันที ความสามารถ "เมื่อแปลงร่าง" ใส่ที่ร่างคน (Minami, Three)
- ตัวกรอง "เฉพาะการ์ด" นับร่างจาก Henshin เอง ส่วนร่างจาก Capsem ตั้ง `formOf: zeztz` ไว้ ตัวกรองของ Capsem, Nem, Minami และ Hero Nem เลยใส่แค่ `zeztz` (คำอธิบายการ์ดสั้นลง)
- "−1/−0" ใส่ศัตรู: ลดได้ต่ำสุด ATK 0 ไม่ทำให้ตาย และไม่ติดถาวร
- ไม่ได้ใส่: สัตว์ประหลาด Nightmare / Gore Nightmare (ตามที่กำหนด), Lord Zero (มีแค่ในหนัง)

**ผลทดสอบ (2026-10-08)**
- เล่นทีละขั้นผ่าน engine จริง ผ่าน 18/18 ข้อ:
  - Baku แปลงร่างเป็น Zeztz และ Gauge +1
  - Nem บัฟ Zeztz ได้
  - Capsem เปลี่ยนร่างแล้วบัฟติดไป
  - Booster Capsem ใช้ได้เฉพาะกับ Plasma
  - Minami แปลงร่างแล้วให้ Barrier กับ Zeztz
  - Henshin ครบ 3 ครั้งได้ การ์ด Final Form
  - Final Form ยังมีบัฟและ Barrier เดิม
  - Nox Knight รอ 2 เทิร์นแล้วเป็น Nox
  - Three แปลงร่างแล้วได้ Gear
  - Mugen ทำลายศัตรูซ้ายสุด และ Lord Two ลด ATK ศัตรู
- บอทเล่น 150 เกม (server ทดสอบ, ชุด prototype + ชุดนี้): ไม่มี error · ร่างจาก Capsem และ Exdream เกิดในเกมจริง · Rider อันดับเฉลี่ย 4.66
- เล่นในเบราว์เซอร์: Baku แปลงร่างเป็น Zeztz ในเกมจริง · หนังสือการ์ดแท็บ "ร่างแปลง & พิเศษ" แสดงทุกร่างพร้อมบอกที่มา
- **ข้อสังเกตเรื่องสมดุล** (จาก Simulate, บอทใช้ Capsem น้อย): Mugen (2.0), Lord Two (2.3), Nox Midnight (2.3) แรง · Zeztz ร่างพื้นฐาน (6.3), Nem (6.7), Nasuka (7.3) อ่อน — ปรับหลังลองเล่นจริง

---

## 2. Sentai — Ohsama Sentai King-Ohger

**แนว**: ราชาแต่ละอาณาจักรเป็นคนละสี ครบ 3 สีเกิด Roll Call · **Shugod** (หุ่นแมลง) ไม่มีสี แต่เติม Mecha Gauge และบัฟหุ่นยักษ์

**การ์ดในร้าน**
| R | key | การ์ด | สี | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|---|
| 1 | `kuwagata_ohger` | Kuwagata Ohger | RED | 2/3 | Team-Up (3): เริ่มการต่อสู้: ตัวนี้ +2/+2 · Final Form → `king_kuwagata` | Gira Husty กษัตริย์ Shugodom |
| 1 | `hachi_ohger` | Hachi Ohger | BLACK | 2/3 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม | Kaguragi Dybowski แห่ง Tofu |
| 1 | `god_tentou` | God Tentou | — | 1/3 | Deploy: Mecha Gauge +1 (ไม่เกิน 1 ครั้งต่อเกม) | Shugod เต่าทอง (เสริม) |
| 2 | `tombo_ohger` | Tombo Ohger | BLUE | 3/3 | Deploy: ให้ Giant Robo +2/+2 ถาวร | Yanma Gast วิศวกรผู้สร้าง Shugod |
| 2 | `kamakiri_ohger` | Kamakiri Ohger | YELLOW | 2/4 | จบเทิร์น: ให้ Sentai ตัวอื่นแบบสุ่ม +0/+2 | Hymeno Ran หมอ ราชินีแห่ง Ishabana |
| 2 | `god_kumo` | God Kumo | — | 2/4 | Deploy: Mecha Gauge +1 (ไม่เกิน 1 ครั้งต่อเกม) | Shugod แมงมุม (เสริม) |
| 2 | `god_ant` | God Ant | — | 2/2 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ถ้าเป็น Sentai ให้ตัวนั้น +1/+0 | Shugod มด (เสริม) |
| 3 | `papillon_ohger` | Papillon Ohger | PURPLE | 3/4 *(Guard)* | Team-Up (3): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +1/+0 | Rita Kaniska ประธานศาล ใช้ Ice Seal |
| 3 | `spider_kumonos` | Spider Kumonos | WHITE | 3/4 | Deploy: เลือกรับยูนิต Sentai 1 จาก 3 | Jeramie Brasieri นักประวัติศาสตร์ (กลายเป็นพวก) |
| 3 | `god_kabuto` | God Kabuto | — | 3/3 | Deploy: ให้ Giant Robo +3/+3 ถาวร | Shugod ด้วงกว่าง (เสริมร่าง Kabuto King-Ohger) |
| 4 | `god_scorpion` | God Scorpion | — | 4/5 | Deploy: ให้ Giant Robo ได้ Lethal | Shugod แมงป่อง (Scorpion King-Ohger) |
| 4 | `god_hopper` | God Hopper | — | 5/4 | Deploy: ให้ Giant Robo ได้ Rapid | Shugod ตั๊กแตน (Hopper King-Ohger) |
| 5 | `guardian_hercules` | Guardian Hercules | — | 6/8 *(Guard)* | Deploy: Mecha Gauge +2 | Guardian Weapon ด้วงเฮอร์คิวลีส |
| 5 | `ohkuwagata_ohger` | Ohkuwagata Ohger | SILVER | 7/7 | Team-Up (3): เริ่มการต่อสู้: ตัวนี้ +3/+3 | Rcules อดีตราชา Shugodom เคยเป็นศัตรูแล้วกลับมาเป็นพวก, Ohger Calibur Zero |
| 6 | `god_tarantula` | God Tarantula | — | 9/10 | Team-Up (4): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +2/+2 | Shugod ของ Jeramie, ร่างยักษ์ Tarantula Knight |

สีตรงกับในเรื่องแล้ว (เกมเพิ่มสี BLACK, WHITE, PURPLE, SILVER, GOLD, ORANGE) · King-Ohger ไม่มีสีเขียวและชมพู · Extra (นับเป็นสีใดก็ได้) ไม่มีในเรื่องนี้

**ร่าง / Gear / หุ่นยักษ์**
| ชนิด | key | การ์ด | ATK/HP | ความสามารถ |
|---|---|---|---|---|
| ร่าง (token) | `king_kuwagata` | King Kuwagata Ohger (Final Form ของ Kuwagata Ohger · ได้จากการ์ด Final Form) | 8/8 *(Power Strike)* | Team-Up (3): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +2/+2 |
| Giant | `king_ohger` | King-Ohger | 10/12 *(Final Blow)* | หุ่นรวม 5 Shugod หลัก · Final Form → `god_king_ohger` |
| Giant | `king_caucasus_kabuto` | King Caucasus Kabuto | 12/10 *(Final Blow, Barrier)* | ร่างยักษ์ของ God Caucasus Kabuto |
| Giant | `tarantula_knight` | Tarantula Knight | 9/12 *(Final Blow, Guard)* | ร่างยักษ์ของ God Tarantula |
| Giant | `king_ohger_zero` | King-Ohger Zero | 11/11 *(Final Blow, Lethal)* | หุ่น Shugod Zero 10 ตัวของ Rcules |
| Giant (ร่างอัปเกรด) | `god_king_ohger` | God King-Ohger | 18/18 *(Final Blow, Rapid)* | รวม 20 Shugod — ได้จาก Gear Final Form เป้า Giant Robo |

**หมายเหตุ Sentai**
- ไม่ได้ใส่ (ตัวร้าย): Galactinsects (Dagded Dujardin, Five Jesters), Bug Naraku (Desnaraku, Kaijim)
- Shugod ไม่มีสี ไม่ช่วย Roll Call แต่ช่วย Giant Robo ทำให้ Sentai เลือกได้ว่าจะเน้นสีหรือหุ่น

---

## 3. Mecha — Genesis of Aquarion

**แนว**: **Vector** 3 ลำเป็นได้ทั้ง core และชิ้นส่วน **ลำที่อยู่ซ้ายสุดเป็นตัวกำหนดร่าง** เหมือนในเรื่อง (Sol = Solar Aquarion, Luna = Aquarion Luna, Mars = Aquarion Mars) · นักบิน (Element) มี keyword Gattai เข้ากลุ่มได้

**การ์ดในร้าน**
| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `vector_sol` | Vector Sol | 2/3 *(Gattai)* | Gattai core → Solar Aquarion | เครื่องบินสีแดง |
| 1 | `vector_luna` | Vector Luna | 1/4 *(Gattai)* | Gattai core → Aquarion Luna | เครื่องบินสีเขียว |
| 1 | `vector_mars` | Vector Mars | 2/2 *(Gattai)* | Gattai core → Aquarion Mars | เครื่องบินสีน้ำเงิน |
| 2 | `apollo` | Apollo | 3/2 *(Gattai)* | Deploy: ให้ Vector Sol +2/+1 ถาวร | นักบิน Vector Sol |
| 2 | `silvia` | Silvia de Alisia | 2/3 *(Gattai)* | Deploy: ให้ Vector Luna +1/+2 ถาวร | นักบิน Luna |
| 2 | `pierre` | Pierre Vieira | 2/3 *(Gattai)* | Deploy: ให้ Vector Mars +2/+1 ถาวร | นักบิน Mars |
| 3 | `sirius` | Sirius de Alisia | 3/4 *(Gattai)* | Deploy: ให้ Mecha ทุกตัวที่มี Gattai +1/+1 ถาวร | นักบิน Mars |
| 3 | `reika` | Reika Kou | 3/4 *(Gattai)* | จบเทิร์น: ให้ Mecha ตัวอื่นแบบสุ่ม +1/+1 | นักบิน Luna |
| 3 | `deava_hangar` | DEAVA Hangar | 2/5 *(Guard)* | Deploy: เลือกรับยูนิต Mecha 1 จาก 3 | องค์กรที่วิจัย Vector |
| 4 | `cherubim_soldier` | Cherubim Soldier | 3/5 *(Guard)* | Last Stand: เรียก Harvest Beast | หุ่นยักษ์ของ Shadow Angel ที่คุ้มกันเครื่องเก็บเกี่ยว (ฝ่ายศัตรู) |
| 4 | `johannes` | Johannes | 3/4 | Deploy: ให้ Mecha ทุกตัว +1/+1 ถาวร | ผู้นำ Shadow Angel ในนาม (ฝ่ายศัตรู) |
| 5 | `gen_fudo` | Gen Fudo | 5/7 | Deploy: ให้ Mecha ทุกตัว +1/+1 ถาวร และ Giant Robo +2/+2 ถาวร | ผู้นำคณะสำรวจที่ขุดพบ Vector |
| 5 | `toma` | Toma | 6/6 *(Rapid)* | เริ่มการต่อสู้: เรียก Cherubim Soldier | Shadow Angel ตัวร้ายหลัก อดีตคู่หูของ Apollonius บังคับ Cherubim |
| 6 | `apollonius` | Apollonius | 7/7 *(Rapid)* | เมื่อเรียกยูนิตอื่นเข้าสนาม: ถ้าเป็น Mecha ให้ตัวนั้น +2/+2 ถาวร | ร่างเดิมของ Apollo (Shadow Angel ที่ช่วยมนุษย์) |

> ฝั่ง Shadow Angel (Cherubim, Johannes, Toma) เป็นแผนรองของ Mecha: หุ่นเดี่ยวที่ไม่ต้องรวมร่าง · Token: `harvest_beast` Harvest Beast 2/4 *(Guard)*

**ร่างรวม (token)** — ค่าพลังร่างรวม = ค่าในตาราง + ผลรวมชิ้นส่วน
| key | ร่าง | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|
| `solar_aquarion` | Solar Aquarion | 4/4 *(Power Strike)* | Final Form → `solar_aquarion_wings` | สมดุล ถนัดระยะประชิด ร่างจริงของ Aquarion |
| `aquarion_luna` | Aquarion Luna | 3/4 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูทุกตัว | ระยะไกล คันธนู |
| `aquarion_mars` | Aquarion Mars | 4/3 *(Rapid)* | — | เน้นความเร็ว |
| `solar_aquarion_wings` | Solar Aquarion — Solar Wings (Final Form) | 12/12 *(Power Strike, Rapid)* | เริ่มการต่อสู้: ทำดาเมจ 3 ใส่ศัตรูซ้ายสุด (Infinity Punch) | ปีกสุริยะ, Infinity Punch |

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 3 | `sousei_gattai` | Sousei Gattai! | 2 | ใช้กับ Mecha ที่เลือก: ให้ keyword Gattai และ +1/+1 |

---

## 4. Kaiju — Godzilla

**แนว**: ตายแล้วกลับมาแรงกว่า · Shin Godzilla วิวัฒนาการตามเทิร์น · Mothra ตัวอ่อนกลายเป็นตัวเต็มวัย

**การ์ดในร้าน**
| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `minilla` | Minilla | 1/3 | Last Stand: ให้ Kaiju แบบสุ่ม +2/+2 ถาวร | ลูกของ Godzilla |
| 1 | `mothra_larva` | Mothra (Larva) | 1/3 | Henshin (2) → Mothra | ตัวอ่อน พ่นใย |
| 1 | `shin_godzilla_2` | Shin Godzilla (2nd Form) | 1/2 | Henshin (3) → Shin Godzilla (3rd Form) | ร่าง 2 เลื้อยขึ้นบก (Kamata-kun) |
| 2 | `anguirus` | Anguirus | 2/3 *(Guard, Revive)* | — | ตัวหนามม้วนตัว บาดเจ็บง่ายแต่ไม่ยอมแพ้ |
| 2 | `rodan` | Rodan | 3/2 *(Rapid)* | — | บินเร็ว คลื่นกระแทก |
| 2 | `hedorah` | Hedorah | 1/2 *(Lethal)* | Last Stand: เรียก Hedorah Spawn 1/1 | สัตว์ประหลาดมลพิษ |
| 3 | `godzilla_junior` | Godzilla Junior | 2/2 *(Kyodaika)* | — | ลูกที่โตขึ้น |
| 3 | `biollante` | Biollante | 2/4 *(Revive)* | Last Stand: ให้ Kaiju ทุกตัว +1/+0 (จนจบการสู้) | ไฮบริดพืช-Godzilla |
| 3 | `gigan` | Gigan | 4/3 *(Power Strike)* | — | ไซบอร์กใบเลื่อย |
| 4 | `destoroyah` | Destoroyah | 3/3 | Last Stand: เรียก Destoroyah (Aggregate) 2/2 · Avenge (3): ตัวนี้ +1/+1 ถาวร | เริ่มเป็นตัวเล็กจำนวนมาก แล้วรวมเป็นร่างปีศาจ |
| 4 | `mechagodzilla` | Mechagodzilla | 3/5 *(Barrier)* | เริ่มการต่อสู้: ทำดาเมจ 2 ใส่ศัตรูซ้ายสุด · เผ่า Kaiju + Mecha | หุ่น Godzilla ที่มนุษย์สร้าง |
| 5 | `godzilla` | Godzilla | 4/4 *(Kyodaika)* | Avenge (4): ตัวนี้ +1/+1 ถาวร | ราชาแห่งสัตว์ประหลาด |
| 5 | `king_ghidorah` | King Ghidorah | 6/6 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูทุกตัว (2 ครั้ง) | มังกรสามหัว |
| 6 | `burning_godzilla` | Burning Godzilla | 8/8 | Last Stand: ทำดาเมจ 3 ใส่ศัตรูทุกตัว (meltdown) | ความร้อนในตัวพุ่งจนใกล้หลอมละลาย |


**ร่าง / Token**
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `mothra` | Mothra | 3/4 | เริ่มการต่อสู้: ให้พวกเราตัวอื่นแบบสุ่มได้ Barrier (เกล็ดสะท้อนการโจมตี) |
| `shin_godzilla_3` | Shin Godzilla (3rd Form) | 3/4 | Henshin (3) → Shin Godzilla (4th Form) |
| `shin_godzilla_4` | Shin Godzilla (4th Form) | 7/7 | เริ่มการต่อสู้: ทำดาเมจ 3 ใส่ศัตรูซ้ายสุด (atomic breath) |
| `hedorah_spawn` / `destoroyah_aggregate` | token | 1/1 / 2/2 | — |

---

## 5. Beast — Beastars

**แนว**: ตัวละครโรงเรียน Cherryton และชมรมการละคร เรียกเพื่อนเข้าสนาม ตัวที่ลงมาได้กำลังใจ (บัฟ)

| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `haru` | Haru | 1/3 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ให้ตัวนั้น +1/+1 ถาวร | กระต่ายขาว ชมรมจัดสวน |
| 1 | `jack` | Jack | 2/3 | Deploy: ถ้ามี Legoshi บนบอร์ด ตัวนี้ +2/+2 ถาวร | ลาบราดอร์ เพื่อนสนิทของ Legoshi |
| 1 | `tem` | Tem | 1/3 | Last Stand: ให้ Beast แบบสุ่ม +2/+2 ถาวร | อัลปากา สมาชิกชมรมการละคร |
| 2 | `collot` | Collot | 3/2 | Deploy: เรียก Durham 2/2 | Old English Sheepdog เพื่อนร่วมหอ |
| 2 | `pina` | Pina | 3/3 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ตัวนี้ +1/+1 ถาวร | แกะ Dall ปีหนึ่ง ชมรมการละคร |
| 2 | `els` | Els | 2/3 | Deploy: ให้ตัวที่อยู่ข้างๆ +2/+1 | แพะแองโกรา |
| 2 | `kibi` | Kibi | 3/3 | Deploy: เรียก Dom 2/1 | ตัวกินมด ทีมเวที |
| 3 | `juno` | Juno | 3/4 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ให้ตัวนั้น +2/+1 ถาวร | หมาป่าเทา ปีหนึ่ง |
| 3 | `bill` | Bill | 4/3 | Deploy: ให้ Beast ทุกตัว +1/+0 ถาวร | เสือเบงกอล อยากเป็น Beastar |
| 3 | `gohin` | Gohin | 3/5 *(Guard)* | Deploy: ให้ Legoshi +2/+2 ถาวร และ Barrier | แพนด้า หมอใต้ดิน อาจารย์ของ Legoshi |
| 4 | `louis` | Louis | 4/6 | Deploy: เรียก Shishigumi Lion 2/2 ×2 | กวางแดง ดาวชมรมการละคร เคยนำกลุ่มสิงโต |
| 4 | `gosha` | Gosha | 4/6 | Deploy: ให้ Legoshi ได้ Lethal | มังกรโคโมโด ปู่ของ Legoshi |
| 4 | `sagwan` | Sagwan | 4/6 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ได้ +1/+1 ถาวร (ไม่เกิน 3 ครั้งต่อเทิร์น) | แมวน้ำ เพื่อนบ้านที่ Beast Apartments |
| 5 | `legoshi` | Legoshi | 8/9 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ตัวนี้ +1/+1 ถาวร | หมาป่าเทา ตัวเอก |
| 6 | `yahya` | Yahya | 8/9 *(Echo)* | Deploy: ให้ Beast ทุกตัว +3/+3 ถาวร | ม้า Beastar คนปัจจุบัน |

**Token**: `durham` Durham 2/2 (หมาโคโยตี้ เพื่อนร่วมหอ), `dom` Dom 2/1 (นกยูง หัวหน้าทีมเวที), `shishigumi_lion` Shishigumi Lion 4/3
- ไม่ได้ใส่ (ตัวร้าย): Riz, Melon, Ibuki — Louis เรียก "Shishigumi Lion" เป็น token ทั่วไปแทน
- Durham และ Dom เป็นตัวละครที่มีในเรื่อง แต่ทำเป็น token เพื่อให้เป็นการ์ดที่ถูกเรียก

---

## 6. Human — ออกแบบเอง (เศรษฐกิจ)

**แนว**: ไม่มีเรื่องอ้างอิง เป็นคนธรรมดาในโลกเกม (กองกำลังป้องกัน, พ่อค้า, นักวิจัย) ได้ Energy การ์ด Gear และร้านแรงขึ้น ค่าพลังต่ำกว่าเกณฑ์ประมาณ 1 แต้ม

| R | key | การ์ด | ATK/HP | ความสามารถ |
|---|---|---|---|---|
| 1 | `street_vendor` | Street Vendor | 1/3 | Deploy: ได้ 1 Energy |
| 1 | `intern_researcher` | Intern Researcher | 2/2 | Deploy: ได้ Gear แบบสุ่มเข้ามือ |
| 1 | `volunteer` | Volunteer | 2/3 | เมื่อถูกขาย: ได้ 1 Energy |
| 2 | `shop_manager` | Shop Manager | 2/3 | Deploy: ยูนิตในร้านได้ +1/+1 จนจบเกม |
| 2 | `field_scout` | Field Scout | 3/3 | Deploy: เลือกรับยูนิต 1 จาก 3 |
| 2 | `mechanic` | Mechanic | 3/3 | Deploy: เสริมพลัง Gear +1/+0 จนจบเกม |
| 3 | `banker` | Banker | 3/4 | ต้นทุกเทิร์น: ได้ 1 Energy |
| 3 | `quartermaster` | Quartermaster | 3/4 | จบเทิร์น: ถ้ามี Energy เหลือ ≥ 2 ให้พวกเราตัวอื่นแบบสุ่ม +2/+2 |
| 3 | `recruiter` | Recruiter | 3/3 | Deploy: ได้ยูนิตแบบสุ่มเข้ามือ |
| 4 | `mayor` | Mayor | 3/5 | Deploy: ยูนิตในร้านได้ +2/+2 จนจบเกม |
| 4 | `arms_dealer` | Arms Dealer | 4/5 | Deploy: ได้ Gear แบบสุ่มเข้ามือ (2 ครั้ง) |
| 5 | `tycoon` | Tycoon | 6/6 | จบเทิร์น: ถ้ามี Energy เหลือ ≥ 3 ให้พวกเราทุกตัว +1/+1 |
| 5 | `defense_commander` | Defense Commander | 5/6 | Deploy: ให้พวกเราทุกตัว +1/+2 ถาวร |
| 6 | `president` | President | 8/9 | Deploy: ได้ 3 Energy และยูนิตในร้านได้ +3/+3 จนจบเกม |

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 1 | `supply_crate` | Supply Crate | 1 | ได้ 2 Energy (ได้คืนสุทธิ 1) |
| 2 | `med_kit` | Med Kit | 2 | ใช้กับยูนิตที่เลือก: +1/+3 |
| 3 | `contract` | Contract | 2 | เลือกรับยูนิต 1 จาก 3 |

---

## 7. Shonen — Naruto

**แนว**: นินจาโคโนฮะ ยิ่งโดนยิ่งแกร่ง เพื่อนตายแล้วปลุกพลัง ท่าไม้ตายครั้งเดียว

| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `naruto` | Naruto Uzumaki | 1/4 | เริ่มการต่อสู้: เรียกสำเนาของตัวนี้ (การ์ดพื้นฐาน) · Henshin (3) → Naruto (Sage Mode) | Shadow Clone |
| 1 | `sakura` | Sakura Haruno | 1/4 | จบเทิร์น: ให้ Naruto หรือ Sasuke +0/+2 ถาวร | นินจาแพทย์ |
| 1 | `hinata` | Hinata Hyuga | 2/3 *(Guard)* | — | ปกป้อง Naruto |
| 2 | `rock_lee` | Rock Lee | 2/3 | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +2/+0 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น*) | Eight Gates (เปิดได้บางประตู) |
| 2 | `neji` | Neji Hyuga | 3/2 | เมื่อโจมตี: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม | หมัดอ่อน |
| 2 | `shikamaru` | Shikamaru Nara | 2/3 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −2/+0 (จนจบการสู้)** | Shadow Possession |
| 3 | `sasuke` | Sasuke Uchiha | 4/4 *(Power Strike)* | Avenge (2): ตัวนี้ +2/+0 ถาวร | Chidori — แทงเร็ว |
| 3 | `kakashi` | Kakashi Hatake | 3/4 | เริ่มการต่อสู้: เรียกสำเนาของศัตรูซ้ายสุด | Copy Ninja, Sharingan |
| 3 | `gaara` | Gaara | 2/4 *(Guard, Barrier)* | — | โล่ทราย |
| 4 | `jiraiya` | Jiraiya | 4/5 | เริ่มการต่อสู้: เรียก Gamabunta 5/5 | อัญเชิญคางคก |
| 4 | `tsunade` | Tsunade | 3/6 | เมื่อโดนดาเมจแล้วยังรอด: ให้พวกเราทุกตัว +0/+1 (ไม่เกิน 2 ครั้งต่อเทิร์น*) | ฟื้นฟูด้วย Katsuyu |
| 5 | `might_guy` | Might Guy | 5/6 | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +8/+0 (จนจบการสู้, **ไม่เกิน 1 ครั้งต่อเกม** — Night Guy) | Eight Gates ครบ 8 ประตู |
| 5 | `itachi` | Itachi Uchiha | 6/5 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −4/−0 (จนจบการสู้) | Sharingan, Tsukuyomi (ภาพลวง) |
| 6 | `naruto_kurama` | Naruto (Kurama Chakra Mode) | 9/9 *(Rapid, Power Strike)* | Avenge (2): ตัวนี้ +2/+2 ถาวร | พลังเก้าหาง |

**ร่าง / Token**
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `naruto_sage` | Naruto (Sage Mode) | 5/5 | เมื่อโจมตี: ทำดาเมจ 2 ใส่ศัตรูแบบสุ่ม (Rasenshuriken) |
| `gamabunta` | Gamabunta | 5/5 | — |
| (สำเนาของ Naruto) | ใช้ action COPY ไม่ต้องสร้างการ์ด | | |

\* limit มีแค่ "ต่อเทิร์น" กับ "ต่อเกม" 1 เทิร์นมีการสู้ครั้งเดียว "ต่อเทิร์น" จึงเท่ากับต่อการสู้
\*\* ค่าติดลบใส่ศัตรูหยุดที่ ATK 0 และไม่ทำให้ตาย (ดูข้อ 8)

---

## Hero (เผ่าละ 4 ตัว)

คอลัมน์พลังเป็นข้อความภาษาไทยที่ผู้เล่นเห็นในเกม (ระบบสร้างจาก effect) · **Hero Power (N Energy, เทิร์นละครั้ง)** = กดใช้ได้เทิร์นละครั้ง ราคา N · **ครั้งเดียวต่อเกม** = ใช้ได้ครั้งเดียว · **Passive** = ทำงานเอง · Armor = เลือดเสริม · ซีรีส์ของ Hero = ซีรีส์ของเผ่านั้น (Human ไม่มี)

| เผ่า | key | Hero | Armor | พลัง (ข้อความในเกม) | อ้างอิง |
|---|---|---|---|---|---|
| Rider | `h_lord_zero` | Lord Zero | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ได้ Gear Kamen Rider แบบสุ่มเข้ามือ · ให้ยูนิต Kamen Rider แบบสุ่ม 1 ตัว +1/+1 ถาวร | ผู้บัญชาการ CODE พ่อของ Baku |
| Rider | `h_baku` | Baku Yorozu | 0 | Passive: เพิ่ม Rider Gauge 2 | ตัวเอก |
| Rider | `h_nem` | Nem | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Kamen Rider Zeztz ทุกตัว +1/+1 ถาวร | ครอบครัวบุญธรรมของ Baku |
| Rider | `h_kensei` | Kensei Odaka | 3 | Hero Power (3 Energy, ครั้งเดียวต่อเกม): ได้ Kensei Odaka เข้ามือ | Kamen Rider Nox |
| Sentai | `h_gira` | Gira Husty | 0 | Passive: Roll Call ใช้แค่ 2 สี | ราชาแห่ง Shugodom |
| Sentai | `h_yanma` | Yanma Gast | 0 | Hero Power (2 Energy, เทิร์นละครั้ง): ให้ Giant Robo ของเรา +2/+2 ถาวร · เพิ่ม Mecha Gauge 1 (ไม่เกิน 2 ครั้งต่อเกม) | วิศวกรผู้สร้าง Shugod |
| Sentai | `h_hymeno` | Hymeno Ran | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Super Sentai แบบสุ่ม 1 ตัว +0/+2 ถาวร | หมอ ราชินีแห่ง Ishabana |
| Sentai | `h_rita` | Rita Kaniska | 5 | Hero Power (1 Energy, ครั้งเดียวต่อเกม): เลือกรับยูนิต Super Sentai 1 จาก 3 | ประธานศาลแห่ง Gokkan |
| Mecha | `h_gen_fudo` | Gen Fudo | 0 | Passive: Gattai ใช้แค่ 2 ตัวที่ติดกัน | ผู้บัญชาการ DEAVA |
| Mecha | `h_celiane` | Celiane | 0 | Hero Power (2 Energy, ครั้งเดียวต่อเกม): ได้ Final Form เข้ามือ | คนรักของ Apollonius |
| Mecha | `h_sirius` | Sirius de Alisia | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Mecha ขวาสุดได้ Gattai และ +1/+1 ถาวร | นักบิน Element |
| Mecha | `h_apollo` | Apollo | 3 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Mecha ซ้ายสุด +1/+1 ถาวร | นักบิน Vector Sol |
| Kaiju | `h_shobijin` | Shobijin | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Kaiju แบบสุ่ม 1 ตัวได้ Revive | คู่แฝดตัวจิ๋วของ Mothra |
| Kaiju | `h_daisuke` | Daisuke Serizawa | 0 | Hero Power (0 Energy, ครั้งเดียวต่อเกม): ทำลายพันธมิตรขวาสุด · เลือกรับยูนิต Kaiju 1 จาก 3 (2 ครั้ง) | ผู้สร้าง Oxygen Destroyer |
| Kaiju | `h_ishiro` | Ishiro Serizawa | 0 | Passive: ต้นทุกเทิร์น: ให้ยูนิต Kaiju แบบสุ่ม 1 ตัว +1/+1 ถาวร | นักวิทยาศาสตร์ Monarch |
| Kaiju | `h_jet_jaguar` | Jet Jaguar | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้พันธมิตรขวาสุด +1/+1 ถาวร | หุ่นยนต์ที่ขยายร่างได้ |
| Beast | `h_legoshi` | Legoshi | 0 | Hero Power (2 Energy, เทิร์นละครั้ง): เรียก Durham | ตัวเอก |
| Beast | `h_haru` | Haru | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Beast แบบสุ่ม 1 ตัว +1/+2 ถาวร | กระต่ายขาว |
| Beast | `h_louis` | Louis | 0 | Hero Power (0 Energy, ครั้งเดียวต่อเกม): เรียก Shishigumi Lion 2 ตัว | หัวหน้ากลุ่มสิงโต |
| Beast | `h_gohin` | Gohin | 5 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Beast แบบสุ่ม 1 ตัวได้ Guard | หมอใต้ดิน |
| Human | `h_merchant` | Guild Merchant | 0 | Passive: Refresh ฟรี 2 ครั้งต่อเทิร์น | ออกแบบเอง |
| Human | `h_mayor` | City Mayor | 0 | Hero Power (2 Energy, เทิร์นละครั้ง): ยูนิตในร้านได้ +1/+0 จนจบเกม | ออกแบบเอง |
| Human | `h_banker` | Central Banker | 0 | Hero Power (0 Energy, ครั้งเดียวต่อเกม): ได้ 3 Energy | ออกแบบเอง |
| Human | `h_general` | Defense General | 5 | Hero Power (2 Energy, เทิร์นละครั้ง): ให้พันธมิตรทุกตัว +0/+1 ถาวร | ออกแบบเอง |
| Shonen | `h_minato` | Minato Namikaze | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้พันธมิตรซ้ายสุด +1/+0 ถาวร | โฮคาเงะรุ่นที่ 4 |
| Shonen | `h_hiruzen` | Hiruzen Sarutobi | 0 | Passive: ต้นทุกเทิร์น: ให้ยูนิต Shonen แบบสุ่ม 1 ตัว +1/+1 ถาวร | โฮคาเงะรุ่นที่ 3 |
| Shonen | `h_iruka` | Iruka Umino | 3 | Hero Power (0 Energy, ครั้งเดียวต่อเกม): เลือกรับยูนิต Shonen 1 จาก 3 | ครูของ Naruto |
| Shonen | `h_kushina` | Kushina Uzumaki | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Shonen แบบสุ่ม 1 ตัวได้ Barrier และ +1/+1 ถาวร | แม่ของ Naruto |

## Relic (ไอเท็มจากเรื่อง)

Lesser = เลือกเทิร์น 5 · Greater = เลือกเทิร์น 9 · ราคาเป็น Energy · ระบบสุ่มให้เลือก 4 อัน (อันหนึ่งตรงเผ่าหลัก) และมีอันฟรีอย่างน้อย 1 อัน

| เผ่า | key | Relic | ระดับ | ราคา | ผล (ข้อความในเกม) |
|---|---|---|---|---|---|
| Rider | `rl_zeztz_driver` | Zeztz Driver | Lesser | 2 | เริ่มการต่อสู้: ให้ยูนิต Kamen Rider ทุกตัว +1/+1 |
| Rider | `rl_capsem_case` | Capsem Case | Lesser | 0 | เมื่อได้รับ: ได้ Gear Kamen Rider แบบสุ่มเข้ามือ (2 ครั้ง) · เมื่อได้รับ: เพิ่ม Rider Gauge 1 |
| ทุกเผ่า | `rl_final_form_belt` | Final Form Belt | Greater | 4 | เมื่อได้รับ: ได้ Final Form เข้ามือ |
| Sentai | `rl_ohger_calibur` | Ohger Calibur | Lesser | 1 | เริ่มการต่อสู้: ให้ยูนิต Super Sentai ทุกตัว +1/+1 |
| Sentai | `rl_shugod_nest` | Shugod Nest | Lesser | 1 | เมื่อได้รับ: เพิ่ม Mecha Gauge 2 |
| Sentai | `rl_kings_crown` | Ohger Crown | Greater | 5 | เริ่มการต่อสู้: ให้ Giant Robo ของเรา +4/+4 |
| Mecha | `rl_vector_engine` | Vector Engine | Lesser | 1 | เริ่มการต่อสู้: ให้ยูนิต Mecha ซ้ายสุด +2/+2 |
| Mecha | `rl_element_training` | Element Training | Lesser | 1 | เมื่อได้รับ: Gattai ใช้แค่ 2 ตัวที่ติดกัน |
| Mecha | `rl_tree_of_life` | Tree of Life | Greater | 5 | ต้นทุกเทิร์น: ให้ยูนิต Mecha ทุกตัว +1/+1 ถาวร |
| Kaiju | `rl_monster_island` | Monster Island | Lesser | 2 | เริ่มการต่อสู้: ให้ยูนิต Kaiju แบบสุ่ม 1 ตัวได้ Revive |
| Kaiju | `rl_g_cells` | G-Cells | Lesser | 1 | ต้นทุกเทิร์น: ให้ยูนิต Kaiju แบบสุ่ม 1 ตัว +1/+0 ถาวร |
| Kaiju | `rl_oxygen_destroyer` | Oxygen Destroyer | Greater | 5 | เริ่มการต่อสู้: ทำดาเมจ 5 ใส่ศัตรูซ้ายสุด |
| Beast | `rl_drama_club` | Cherryton Drama Club | Lesser | 1 | เริ่มการต่อสู้: ให้ยูนิต Beast ทุกตัว +1/+0 |
| Beast | `rl_black_market` | Black Market | Lesser | 2 | เมื่อได้รับ: เลือกรับยูนิต Beast 1 จาก 3 |
| Beast | `rl_beastar` | Beastar Title | Greater | 4 | เริ่มการต่อสู้: ให้ยูนิต Beast ทุกตัว +2/+2 |
| Human | `rl_savings_bond` | Savings Bond | Lesser | 0 | ต้นทุกเทิร์น: ได้ 1 Energy |
| Human | `rl_coupon_book` | Coupon Book | Lesser | 0 | เมื่อได้รับ: ได้ 4 Energy |
| Human | `rl_city_grant` | City Grant | Greater | 3 | เมื่อได้รับ: ยูนิตในร้านได้ +2/+2 จนจบเกม |
| Shonen | `rl_leaf_headband` | Leaf Headband | Lesser | 1 | เริ่มการต่อสู้: ให้ยูนิต Shonen ทุกตัว +0/+2 |
| Shonen | `rl_ninja_scroll` | Ninja Scroll | Lesser | 2 | เมื่อได้รับ: เลือกรับยูนิต Shonen 1 จาก 3 |
| Shonen | `rl_sage_training` | Sage Training | Greater | 4 | เริ่มการต่อสู้: ให้ยูนิต Shonen ทุกตัว +2/+1 |
| ทุกเผ่า | `rl_lucky_coin` | Lucky Coin | Lesser | 0 | เมื่อได้รับ: ได้ 2 Energy |
| ทุกเผ่า | `rl_training_weights` | Training Weights | Lesser | 2 | เริ่มการต่อสู้: ให้พันธมิตรซ้ายสุด +2/+2 |
| ทุกเผ่า | `rl_war_banner` | War Banner | Greater | 3 | เริ่มการต่อสู้: ให้พันธมิตรทุกตัว +1/+0 |
| ทุกเผ่า | `rl_treasury` | Treasury | Greater | 3 | ต้นทุกเทิร์น: ได้ 1 Energy |

**ผล Simulate (1,200 เกม, หลังปรับ 1 รอบ)**
- Hero อยู่ในช่วงอันดับเฉลี่ย 2.9–5.4 · แรงสุด Jet Jaguar 2.94, Defense General 3.57 · อ่อนสุด Yanma Gast 5.43 (หุ่นยักษ์เกิดไม่บ่อย), Celiane 5.42, Lord Zero 5.15
- Relic ที่แรง: Oxygen Destroyer 2.48 (ส่วนหนึ่งเพราะ Kaiju แรงอยู่แล้ว), Ohger Crown 3.20 · อ่อน: Savings Bond 5.45, Capsem Case 5.11
- Relic ทุกเผ่า (Lucky Coin, War Banner, Treasury) แทบไม่ถูกเลือก เพราะบอทเลือก Relic ตรงเผ่าก่อน
- ภาพ Hero และ Relic: อยู่ในโฟลเดอร์ภาพเดิม ชื่อ `hero_<key>` และ `relic_<key>` (Human และ Relic ทุกเผ่าไม่มีภาพ)

---

## ผล Simulate ทั้งชุด (2026-10-08)

ทั้ง 7 เผ่าเป็นข้อมูลจริงที่ `docs/sets/card-set-v1.json` (รอบแรกๆ ใช้ Hero ทดสอบ 4 ตัวและไม่มี Relic · ตอนนี้ไฟล์มี Hero และ Relic ข้างบนแล้ว · Roll Call 3 สี) · บอทเล่น **1,200 เกม** บน server ทดสอบ ไม่มี error · เฉลี่ย 13.1 เทิร์น

| เผ่า | รอบ 1: อันดับ / ชนะ | รอบสุดท้าย: อันดับ / ชนะ |
|---|---|---|
| Kaiju | **2.95** / 37.8% | **3.16** / 31.4% |
| Mecha | 4.23 / 9.7% | 4.30 / 9.7% |
| Shonen | 4.42 / 8.9% | 4.41 / 12.4% |
| Rider | 4.84 / 8.1% | 4.81 / 7.8% |
| Human | 4.89 / 8.6% | 4.83 / 11.5% |
| Sentai | 4.71 / 8.6% | 4.97 / 8.7% |
| Beast | **5.37** / 5.0% | **5.13** / 5.0% |

อันดับเฉลี่ย 1 = ดีสุด, 8 = แย่สุด, กลาง 4.5 · รอบละ 1,200 เกม

**ที่ปรับระหว่างรอบ** (ตารางการ์ดด้านบนเป็นค่าล่าสุดแล้ว)
- engine: ลงการ์ดจากมือนับเป็น "เรียกยูนิตเข้าสนาม" (Beast)
- การ์ด R1 ที่อ่อนเกิน +1 HP ทุกเผ่า
- Kaiju: Shin Godzilla แปลงร่างช้าลง (3 เทิร์นต่อขั้น) ร่าง 4 เหลือ 7/7 ไม่มี Kyodaika · Godzilla 5/6 Avenge +2/+2 · Godzilla Junior Avenge (3) · Burning Godzilla 9/9 ไม่มี Kyodaika
- Beast: token 2/2 และ 2/1 · Haru ให้ +1/+1 · Pina, Collot, Kibi แรงขึ้น

**หลังปรับบอท (ระดับ A)** · 1,200 เกม · การ์ดชุดเดียวกับ "รอบสุดท้าย"
| เผ่า | อันดับ / ชนะ |
|---|---|
| Kaiju | **3.13** / 36.0% |
| Mecha | 3.81 / 14.0% |
| Shonen | 4.49 / 10.1% |
| Rider | 4.68 / 8.7% |
| Sentai | 4.95 / 9.1% |
| Human | 5.01 / 9.9% |
| Beast | 5.01 / 6.1% |

บอทเล่นตามแผนมากขึ้นมาก: ร่าง Zeztz จาก Capsem 55 → 479 ครั้ง · Aquarion รวมร่าง 129 → 537 · Solar Wings และ King Kuwagata เกิดครั้งแรก (32, 38) · การ์ด Final Form จาก Rider Gauge บอทใช้กับ Nox (Nox Midnight Shadow 525 ครั้ง) มากกว่า Zeztz

**หลังเปลี่ยนเป็นการ์ด Final Form กลาง** (1,200 เกม): Kaiju 3.30 · Mecha 3.68 · Shonen 4.39 · Sentai 4.60 · Human 4.69 · Rider 4.94 · Beast 5.13 · ร่าง Final Form เกิดครบทุกเรื่อง: King Kuwagata 38 → 129 ครั้ง, Solar Wings 32 → 63, Zeztz Exdream 0 → 18, Nox Midnight 546

**รอบล่าสุด (1,800 เกม, ชุดเต็ม: Hero + Relic + การ์ด Final Form กลาง)**
| เผ่า | อันดับ / ชนะ |
|---|---|
| Kaiju | **3.29** / 28.3% |
| Mecha | 3.69 / 14.3% |
| Shonen | 4.38 / 13.5% |
| Sentai | 4.60 / 9.8% |
| Human | 4.68 / 16.6% |
| Rider | 4.94 / 7.1% |
| Beast | **5.12** / 5.2% |

การ์ดที่ห่างจากค่าเฉลี่ยของ Rank เดียวกันมาก (ติดลบ = แรงกว่า): Godzilla Junior R3 −1.4, Hedorah R2 −0.8, Godzilla R5 −0.7, Destoroyah R4 −0.7, Haru R1 −0.6, Vector Mars R1 −0.5, Pina R2 −0.5 · อ่อนสุด: Intern Researcher +0.5, Mechanic +0.4, Eight +0.4

**ปรับสมดุล 3 รอบ (2026-10-08, รอบละ 1,800 เกม)**
| เผ่า | ก่อน | รอบ 1 | รอบ 2 | รอบ 3 (ปัจจุบัน) |
|---|---|---|---|---|
| Kaiju | 3.29 | 3.49 | 3.91 | **3.87** |
| Mecha | 3.69 | 3.67 | 3.75 | **3.87** |
| Shonen | 4.38 | 4.45 | 4.45 | **4.36** |
| Sentai | 4.60 | 4.64 | 4.55 | **4.50** |
| Human | 4.68 | 4.81 | 4.52 | **4.58** |
| Rider | 4.94 | 4.91 | 4.81 | **4.82** |
| Beast | 5.12 | 4.89 | 4.89 | **4.93** |

ช่วงห่างระหว่างเผ่าแรงสุดกับอ่อนสุด 1.83 → 1.06 · ผลแต่ละรอบแกว่งได้ราว ±0.1 · ตารางการ์ด Hero และ Relic ด้านบนเป็นค่าหลังรอบ 3 แล้ว
- รอบ 1: ลด Godzilla Junior (ตัด Avenge), Hedorah, Godzilla, Destoroyah, Vector Mars · เพิ่ม Beast (Legoshi, Louis, Juno, Els, สิงโต), Human ตัวเล็ก, Ohkuwagata, God Kumo, Eight, Nasuka, Zeztz, Lord Five · ปรับ Hero 8 ตัว และ Relic 7 ชิ้น
- รอบ 2: Yanma แรงเกิน (ชาร์จ Mecha Gauge เร็ว) จึงลดลง · ลด Kaiju อีก (Destoroyah, Godzilla, Hedorah Spawn ไม่มี Lethal, Mechagodzilla) · เพิ่ม Human, DEAVA Hangar, Sasuke
- รอบ 3: ลด Vector Mars, Godzilla, Defense Commander, War Banner · เพิ่ม Legoshi, Zeztz, Knight Seventeen, Nem
- ยังห่างจากค่าเฉลี่ยของ Rank: Destoroyah −0.6, King Ghidorah −0.4 (แรง) · Arms Dealer +0.4, Neji +0.3 (อ่อน) · Hero: Defense General 3.49 แรง, Nem 5.25 อ่อน · Relic เศรษฐกิจ (Savings Bond, Capsem Case) ยังอ่อน เพราะบอทใช้ Energy ส่วนเกินไม่เก่ง

**Kaiju ยังแรงเกิน**: ลองตัด Kyodaika ทั้งเผ่า หรือตัด Avenge ทั้งเผ่า ก็ยังอยู่ที่ 3.3 ความแรงกระจายอยู่ที่ Godzilla, King Ghidorah, Destoroyah (อันดับดีกว่าค่าเฉลี่ยของ Rank เดียวกันชัดเจน) ต้องปรับทีละใบในรอบหน้า

อันดับรายการ์ดดูได้จากหน้า Admin → Simulate หลังใส่ชุดนี้ใน draft · การ์ด Rank สูงจะมีอันดับดีกว่าเสมอ เพราะอยู่บนบอร์ดของผู้ชนะตอนท้ายเกม ให้เทียบกับการ์ด Rank เดียวกัน

## ทดลองบัฟ Rider / Beast (2026-10-08)

ทดสอบบน test server ด้วย draft ปัจจุบัน (Human ปิดอยู่) รูปแบบละ 1,200 เกม · ตัวเลข = อันดับเฉลี่ย (ต่ำ = ดี)

| ทดลอง | สิ่งที่เปลี่ยน | Rider | Beast | หมายเหตุ |
|---|---|---|---|---|
| ตั้งต้น | — | 4.88 | 5.11 → **4.86** เมื่อนับแบบใหม่ | Kaiju 3.77, Mecha 3.75 ยังนำ |
| Rider A | Sieg r3→r4 (Dawn 6/6), Eight r3→r4 (4/5), Three r4→r5 (Lord Three 7/7) | **4.53** | — | ได้ผลซ้ำ 2 รอบ |
| Rider B | Capsem ทุกใบ +1/+1 ถาวรก่อนเปลี่ยนร่าง | ช่วยนิดเดียว | — | Zeztz ยังไม่ค่อยอยู่ถึงท้ายเกม |
| Beast บัฟถาวร | Haru/Juno/Bill บัฟถาวร, Durham 2/3, Dom 2/2 | — | 5.01 | ไม่ต่างจาก noise |
| Beast A | Gosha r4→r5 (5/8), Louis r4→r5 (5/7), Bill r3→r4 (5/4) | — | 4.85 | การ์ดดีขึ้นเป็นใบๆ แต่ทั้งเผ่าไม่ขยับ |

**นับเผ่าแบบใหม่ (C)**: ไม่นับ token ที่ถูกเรียก Beast ดีขึ้นจาก 5.11 เป็น 4.86 ส่วนหนึ่งของความ "อ่อน" มาจากวิธีวัด · ผลข้างเคียง: Rider แรงขึ้นแล้ว Shonen กับ Sentai ตก (Shonen 4.43 → 4.81)

## Balance pass 1 (2026-10-08, ใส่ใน draft แล้ว ยังไม่ publish)

ตารางการ์ดข้างบนเป็นค่าหลังปรับแล้ว · ทดสอบชุดละ 2,400 เกม (Human ปิด) · อันดับเฉลี่ย ต่ำ = ดี

| ชุด | Kaiju | Mecha | Rider | Sentai | Beast | Shonen | ห่างสุด |
|---|---|---|---|---|---|---|---|
| ก่อนปรับ | 3.78 | 3.77 | 4.89 | 4.37 | 4.83 | 4.43 | 1.12 |
| เนิฟ Kaiju/Mecha | 4.06 | 3.92 | 4.98 | 4.20 | 4.75 | 4.27 | 1.06 |
| + Rider A+B | 3.94 | 3.93 | 4.49 | 4.61 | 4.77 | 4.53 | 0.84 |
| **+ บัฟ Beast (ที่ใส่)** | 4.03 | 4.04 | 4.51 | 4.56 | 4.60 | 4.70 | **0.67** |

- **Kaiju**: Burning Godzilla 9/9 → 8/8 ดาเมจ 4 → 3 · Godzilla 5/5 → 4/4 · King Ghidorah 3 ครั้ง → 2 · Destoroyah Avenge +2/+2 → +1/+1 · Mechagodzilla 4/5 → 3/5 · Biollante 3/4 → 2/4 · Mothra 4/5 → 3/4
- **Mecha**: Apollonius 8/8 → 7/7, +3/+3 → +2/+2 · Gen Fudo บัฟ Mecha +2/+2 → +1/+1 · Johannes 4/4 → 3/4 · Aquarion Luna ดาเมจ 2 → 1 · Cherubim Soldier 4/5 → 3/5 · Harvest Beast 2/6 → 2/4
- **Rider**: Rider A (Sieg r4 → Dawn 6/6, Eight r4 4/5, Three r5 → Lord Three 7/7) + Capsem ทุกใบ +1/+1 ถาวรก่อนเปลี่ยนร่าง
- **Beast**: Legoshi 7/8 → 8/9 · Yahya +2/+2 → +3/+3 · Sagwan 3/5 → 4/6 · Shishigumi Lion 3/2 → 4/3 · Bill, Haru, Juno บัฟถาวร · Tem Last Stand +1/+1 → +2/+2

**ที่ยังต้องดู**: Shonen ตกเป็นอ่อนสุด (4.70) · Kaiju/Mecha ยังนำราว 0.5 · ตัวเลขมาจากบอท ต้องดูจากการเล่นจริงด้วย

## Balance pass 2 (2026-10-08, ใส่ใน draft แล้ว ยังไม่ publish)

- ร้านสุ่มการ์ดของ Hero (ซีรีส์เดียวกัน / ที่ Hero Power ระบุ) บ่อยขึ้น 2 เท่า (`heroCardWeight`) → Sentai, Beast ดีขึ้น · Hero Zeztz แย่ลง (Rider 4.49 → 4.71)
- **Capsem ใช้กับ Rider ทุกตัว**: +1/+1 ถาวร ส่วนการแปลงร่างยังเฉพาะ Zeztz → Rider 4.71 → **3.77** (2,400 เกม) · Mecha 3.77, Kaiju 4.28, Sentai 4.29, Beast 4.52, Shonen 4.63 (ห่างสุด 0.86)
- ทางเลือกที่ทดลองแต่ไม่เลือก: ตัวที่ไม่ใช่ Zeztz ได้ +1/+0 (Rider 4.31) · Baku แปลงร่างแล้วได้ Capsem (ไม่ต่าง) · Capsem +2/+2 (Rider 4.60)
- **Giant Robo ได้ stat Sentai 50%** (`giantSentaiScale` 0.5 จาก 1, version 10): เล่นจริงหุ่นแรงเกิน · Simulate เดิมไม่เห็นเพราะตารางเผ่านับแค่บอร์ด (บอทที่มีหุ่นอันดับเฉลี่ย 1.93, ชนะ 53%) → Sentai 4.29 → 4.46, คนมีหุ่น 1.93 → 2.29 · ไม่มีหุ่นเลย Sentai 5.16
- **ต้องดูต่อ**: Rider อาจแรงเกินในเกมจริง · Shonen อ่อนสุด

## 8. สิ่งที่ต้องรู้ก่อนสร้างจริง

1. **บัคที่เจอระหว่างออกแบบ (แก้แล้ว)**: บัพค่าติดลบใส่ศัตรู (Shikamaru) เคยทำให้ ATK ติดลบได้ และถ้าตั้ง "ถาวร" จะติดไปกับยูนิตของผู้เล่นฝั่งตรงข้าม ตอนนี้หยุดที่ ATK 0 / HP 1 (ไม่ฆ่า) และ "ถาวร" มีผลกับยูนิตฝั่งตัวเองเท่านั้น
2. ตัวกรองชื่อการ์ดไม่นับร่างจาก Capsem / TRANSFORM (ดูหมายเหตุ Rider)
3. ทุกเผ่ามีการ์ดครบตามจำนวนขั้นต่ำใน `FACTIONS.md` แล้ว
4. ชื่อตัวละครและท่าเป็นเครื่องหมายการค้าของเจ้าของ (Toei, Toho, Satelight, Akita Shoten, Shueisha) ใช้ได้กับโปรเจกต์เล่นกันเอง ถ้าจะเปิดสาธารณะควรเปลี่ยนเป็นของ original

## แหล่งอ้างอิง
- [List of Genesis of Aquarion characters (Wikipedia)](https://en.wikipedia.org/wiki/List_of_Genesis_of_Aquarion_characters) · [Toma (Aquarion Wiki)](https://aquarion.fandom.com/wiki/Toma)
- [List of Kamen Rider ZEZTZ characters (Wikipedia)](https://en.wikipedia.org/wiki/List_of_Kamen_Rider_ZEZTZ_characters) · [Capsems (Kamen Rider Wiki)](https://kamenrider.fandom.com/wiki/Capsems)
- [List of Ohsama Sentai King-Ohger characters (Wikipedia)](https://en.wikipedia.org/wiki/List_of_Ohsama_Sentai_King-Ohger_characters)
- [Genesis of Aquarion (Wikipedia)](https://en.wikipedia.org/wiki/Genesis_of_Aquarion) · [Road to SMP: Genesis of Aquarion](https://mechacatalogue.com/2022/05/22/road-to-smp-no-100-smp-shokugan-modeling-project-genesis-of-aquarion/)
- [All Shin Godzilla Forms Explained (The Mary Sue)](https://www.themarysue.com/godzilla-all-shin-godzilla-forms-explained/) · [Wikizilla: Burning Millennium Godzilla](https://wikizilla.org/wiki/Burning_Millennium_Godzilla) · [10 Greatest Enemies of Godzilla (Listverse)](https://listverse.com/2012/12/23/10-greatest-enemies-of-godzilla/)
- [List of Beastars characters (Wikipedia)](https://en.wikipedia.org/wiki/List_of_Beastars_characters)
- [Top 20 Jutsu in the Naruto Series (WatchMojo)](https://www.watchmojo.com/articles/top-20-jutsu-in-the-naruto-series)

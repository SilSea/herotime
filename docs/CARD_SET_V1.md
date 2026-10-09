# ชุดการ์ด v1

ชุดการ์ดที่ใช้อยู่ (**version 1** — ล้างประวัติเวอร์ชันเก่าแล้วเริ่มนับใหม่จากชุดนี้ 2026-10-09) · 7 เผ่าตามแนวใน `FACTIONS.md` · Human ปิดอยู่ · ข้อมูลเต็มเป็น JSON ที่ `docs/sets/card-set-v1.json`

| เผ่า | เรื่อง | การ์ดในร้าน | ร่าง / Token | Gear |
|---|---|---|---|---|
| Rider | Kamen Rider ZEZTZ | 14 (ร่างคน + ผู้ช่วย, รวมฝ่ายร้าย 5) | 24 | 11 (+ การ์ด Final Form กลาง) |
| Sentai | Ohsama Sentai King-Ohger | 15 | 1 | 3 (+ Giant 5, Kyodai Gattai! จาก gauge) |
| Mecha | Genesis of Aquarion | 14 | 4 | 3 |
| Kaiju | Godzilla | 14 | 5 | 3 |
| Beast | Beastars | 15 | 3 | 3 |
| Human | ออกแบบเอง (ไม่มีเรื่อง) | 14 | 0 | 3 |
| Shonen | Naruto | 14 | 2 | 3 |

**ซีรีส์** (ช่อง `series` ของการ์ดและ Relic): Rider → `zeztz` · Sentai → `king_ohger` · Mecha → `aquarion` · Kaiju → `godzilla` (Mechagodzilla ด้วย) · Beast → `beastars` · Shonen → `naruto` · Human และการ์ด Final Form กลางไม่มีซีรีส์ · ยังไม่มี Series Bond (โบนัสเมื่อมีการ์ดซีรีส์เดียวกันครบ N ใบ)

**วิธีอ่าน**
- `R` = Rank · `ATK/HP` · keyword ตัวเอียงในวงเล็บ เช่น *(Guard)*
- ความสามารถเขียนแบบ Card wizard: **จังหวะ: สิ่งที่ทำ** (ชื่อ trigger / action อยู่ใน `FACTIONS.md` และ `ADMIN_GUIDE.md` ข้อ 6)
- "ถาวร" = `permanent` · "จนจบการสู้" = ไม่ใส่ permanent

---

## 1. Rider — Kamen Rider ZEZTZ

**แนว**: ในร้านขาย**ร่างคน** ซึ่ง Henshin เป็นร่างไรเดอร์ตอนจบเทิร์น (ร่างไรเดอร์เป็น token ไม่ขายในร้าน) · Zeztz ใช้ **Capsem** (Gear) เปลี่ยนร่างไปมา บัฟติดไปทุกร่าง · Henshin ทุกครั้งเติม **Rider Gauge** ครบ 3 ได้**การ์ด Final Form** (การ์ดกลาง ใช้ได้ทุกเรื่อง) → **Zeztz Exdream**

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

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 1 | `royal_sword` | Royal Sword | 1 | ใช้กับ Sentai ที่เลือก: +2/+1 ถาวร |
| 3 | `royal_decree` | Royal Decree | 2 | Mecha Gauge +1 · ใช้กับ Sentai ที่เลือก: +1/+1 ถาวร |
| 4 | `shugod_call` | Shugod Call | 3 | ใช้กับ Sentai ที่เลือก: ได้ Barrier และ +2/+2 ถาวร |

Mecha Gauge (Roll Call +1, ชนะตอน Roll Call +1): ครบ 3 ได้ **Kyodai Gattai!** (`kyodai_gattai`, token Gear ราคา 0: เลือก Giant Robo 1 จาก 3) · ครบ 6 ได้ Super Gattai (+4/+4) และการ์ด Final Form · หุ่นได้ ATK/HP ของ Sentai บนบอร์ด **50%** (`giantSentaiScale` 0.5)

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
| 1 | `vector_parts` | Vector Parts | 1 | ใช้กับ Mecha ที่เลือก: +1/+2 ถาวร |
| 3 | `sousei_gattai` | Sousei Gattai! | 2 | ใช้กับ Mecha ที่เลือก: ให้ keyword Gattai และ +1/+1 |
| 4 | `infinity_punch` | Infinity Punch | 3 | ใช้กับ Mecha ที่เลือก: ได้ Power Strike และ +2/+2 ถาวร |

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

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 1 | `atomic_charge` | Atomic Charge | 1 | ใช้กับ Kaiju ที่เลือก: +1/+2 ถาวร |
| 2 | `kaiju_signal` | Kaiju Signal | 2 | เลือกรับยูนิต Kaiju 1 จาก 3 |
| 4 | `kyodaika_serum` | Kyodaika Serum | 3 | ใช้กับ Kaiju ที่เลือก: ได้ Kyodaika และ +1/+1 ถาวร |

---

## 5. Beast — Beastars

**แนว**: ตัวละครโรงเรียน Cherryton และชมรมการละคร เรียกเพื่อนเข้าสนาม ตัวที่ลงมาได้กำลังใจ (บัฟ)

| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `haru` | Haru | 1/3 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ให้ตัวนั้น +1/+1 ถาวร | กระต่ายขาว ชมรมจัดสวน |
| 1 | `jack` | Jack | 2/3 | Deploy: ถ้ามี Legoshi บนบอร์ด ตัวนี้ +2/+2 ถาวร | ลาบราดอร์ เพื่อนสนิทของ Legoshi |
| 1 | `tem` | Tem | 1/3 | Last Stand: ให้ Beast แบบสุ่ม +2/+2 ถาวร | อัลปากา สมาชิกชมรมการละคร |
| 2 | `collot` | Collot | 3/3 | Deploy: เรียก Durham 3/3 | Old English Sheepdog เพื่อนร่วมหอ |
| 2 | `pina` | Pina | 3/3 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ตัวนี้ +1/+1 ถาวร | แกะ Dall ปีหนึ่ง ชมรมการละคร |
| 2 | `els` | Els | 2/3 | Deploy: ให้ตัวที่อยู่ข้างๆ +2/+2 | แพะแองโกรา |
| 2 | `kibi` | Kibi | 3/4 | Deploy: เรียก Dom 3/2 | ตัวกินมด ทีมเวที |
| 3 | `juno` | Juno | 3/4 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ให้ตัวนั้น +2/+1 ถาวร | หมาป่าเทา ปีหนึ่ง |
| 3 | `bill` | Bill | 4/3 | Deploy: ให้ Beast ทุกตัว +1/+1 ถาวร | เสือเบงกอล อยากเป็น Beastar |
| 3 | `gohin` | Gohin | 4/6 *(Guard)* | Deploy: ให้ Legoshi +2/+2 ถาวร และ Barrier | แพนด้า หมอใต้ดิน อาจารย์ของ Legoshi |
| 4 | `louis` | Louis | 4/6 | Deploy: เรียก Shishigumi Lion 2/2 ×2 | กวางแดง ดาวชมรมการละคร เคยนำกลุ่มสิงโต |
| 4 | `gosha` | Gosha | 4/6 | Deploy: ให้ Legoshi ได้ Lethal | มังกรโคโมโด ปู่ของ Legoshi |
| 4 | `sagwan` | Sagwan | 4/6 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ได้ +1/+1 ถาวร (ไม่เกิน 3 ครั้งต่อเทิร์น) | แมวน้ำ เพื่อนบ้านที่ Beast Apartments |
| 5 | `legoshi` | Legoshi | 8/9 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ตัวนี้ +1/+1 ถาวร | หมาป่าเทา ตัวเอก |
| 6 | `yahya` | Yahya | 8/9 *(Echo)* | Deploy: ให้ Beast ทุกตัว +3/+3 ถาวร | ม้า Beastar คนปัจจุบัน |

**Token**: `durham` Durham 3/3 (หมาโคโยตี้ เพื่อนร่วมหอ), `dom` Dom 3/2 (นกยูง หัวหน้าทีมเวที), `shishigumi_lion` Shishigumi Lion 4/3
- ไม่ได้ใส่ (ตัวร้าย): Riz, Melon, Ibuki — Louis เรียก "Shishigumi Lion" เป็น token ทั่วไปแทน
- Durham และ Dom เป็นตัวละครที่มีในเรื่อง แต่ทำเป็น token เพื่อให้เป็นการ์ดที่ถูกเรียก

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 1 | `black_market_meal` | Black Market Meal | 1 | ใช้กับ Beast ที่เลือก: +2/+1 ถาวร |
| 3 | `shishigumi_call` | Shishigumi Call | 2 | เรียก Shishigumi Lion (4/3) ลงบอร์ด 2 ตัว |
| 4 | `beastar_badge` | Beastar Badge | 3 | ใช้กับ Beast ที่เลือก: ได้ Guard และ +3/+3 ถาวร |

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
| 1 | `sakura` | Sakura Haruno | 1/4 | จบเทิร์น: ให้ Shonen ตัวอื่นแบบสุ่ม +1/+1 ถาวร | นินจาแพทย์ |
| 1 | `hinata` | Hinata Hyuga | 2/3 *(Guard)* | — | ปกป้อง Naruto |
| 2 | `rock_lee` | Rock Lee | 2/3 | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +2/+1 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น*) | Eight Gates (เปิดได้บางประตู) |
| 2 | `neji` | Neji Hyuga | 3/3 | เมื่อโจมตี: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม | หมัดอ่อน |
| 2 | `shikamaru` | Shikamaru Nara | 2/4 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −2/+0 (จนจบการสู้)** | Shadow Possession |
| 3 | `sasuke` | Sasuke Uchiha | 4/4 *(Power Strike)* | Avenge (2): ตัวนี้ +2/+1 ถาวร | Chidori — แทงเร็ว |
| 3 | `kakashi` | Kakashi Hatake | 3/4 | เริ่มการต่อสู้: เรียกสำเนาของศัตรูซ้ายสุด | Copy Ninja, Sharingan |
| 3 | `gaara` | Gaara | 2/4 *(Guard, Barrier)* | — | โล่ทราย |
| 4 | `jiraiya` | Jiraiya | 4/5 | เริ่มการต่อสู้: เรียก Gamabunta 6/6 | อัญเชิญคางคก |
| 4 | `tsunade` | Tsunade | 3/6 | เมื่อโดนดาเมจแล้วยังรอด: ให้พวกเราทุกตัว +0/+1 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น*) | ฟื้นฟูด้วย Katsuyu |
| 5 | `might_guy` | Might Guy | 6/7 | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +8/+0 (จนจบการสู้, **ไม่เกิน 1 ครั้งต่อเกม** — Night Guy) | Eight Gates ครบ 8 ประตู |
| 5 | `itachi` | Itachi Uchiha | 7/6 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −4/−0 (จนจบการสู้) | Sharingan, Tsukuyomi (ภาพลวง) |
| 6 | `naruto_kurama` | Naruto (Kurama Chakra Mode) | 9/9 *(Rapid, Power Strike)* | Avenge (2): ตัวนี้ +2/+2 ถาวร | พลังเก้าหาง |

**ร่าง / Token**
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `naruto_sage` | Naruto (Sage Mode) | 6/6 | เมื่อโจมตี: ทำดาเมจ 2 ใส่ศัตรูแบบสุ่ม (Rasenshuriken) |
| `gamabunta` | Gamabunta | 6/6 | — |
| (สำเนาของ Naruto) | ใช้ action COPY ไม่ต้องสร้างการ์ด | | |

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 1 | `kunai` | Kunai | 1 | ใช้กับ Shonen ที่เลือก: +2/+1 ถาวร |
| 3 | `shadow_clone_scroll` | Shadow Clone Scroll | 3 | ใช้กับ Shonen ที่เลือก: เรียกสำเนาของตัวนั้น |
| 4 | `rasengan` | Rasengan | 3 | ใช้กับ Shonen ที่เลือก: ได้ Power Strike และ +2/+1 ถาวร |

\* limit มีแค่ "ต่อเทิร์น" กับ "ต่อเกม" 1 เทิร์นมีการสู้ครั้งเดียว "ต่อเทิร์น" จึงเท่ากับต่อการสู้
\*\* ค่าติดลบใส่ศัตรูหยุดที่ ATK 0 และไม่ทำให้ตาย

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

---

## สมดุลล่าสุด (Simulate version 1, 2,400 เกม, Human ปิด)
อันดับเฉลี่ย (ต่ำ = ดี, กลาง 4.5): Shonen 3.94 · Rider 4.05 · Mecha 4.26 · Sentai 4.28 · Kaiju 4.33 · Beast 4.49 · ห่างสุด 0.55

- บัฟล่าสุด: Shonen (เดิมอันดับกลางแต่ชนะน้อยสุด 9.9% → 13.3%) และ Beast (4.64 → 4.49)
- ตัวเลขจากบอท (เล่น Gattai / สี Sentai แย่กว่าคน) ต้องดูจาก Stats ของเกมจริงประกอบ
- **ต้องดูต่อ**: Beast ยังอ่อนสุด · Shonen อาจแรงเกินในเกมจริง
- ประวัติการปรับก่อนรีเซ็ต: git log ของเอกสารนี้

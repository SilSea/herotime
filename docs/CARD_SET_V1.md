# ชุดการ์ด v1 (ร่างแรก รอผู้ใช้ตรวจ)

ร่างการ์ดของทั้ง 7 เผ่า ตามแนวใน `FACTIONS.md` และเรื่องที่กำหนด **ยังไม่ได้ใส่ลง draft** ผู้ใช้จะตรวจและปรับก่อน
ออกแบบใหม่ทั้งหมด ไม่อิงการ์ดที่มีใน draft · Rider มีพระเอกและ**ไรเดอร์ฝ่ายร้าย** (ไม่มีสัตว์ประหลาด) · Sentai มีแต่ฝ่ายเรนเจอร์

| เผ่า | เรื่อง | การ์ดในร้าน | ร่าง / Token | Gear |
|---|---|---|---|---|
| Rider | Kamen Rider ZEZTZ | 14 (พระเอก 9 + ไรเดอร์ฝ่ายร้าย 5) | 14 | 12 |
| Sentai | Ohsama Sentai King-Ohger | 15 | 1 | 1 + Giant 5 |
| Mecha | Genesis of Aquarion | 14 | 4 | 2 |
| Kaiju | Godzilla | 14 | 5 | 0 |
| Beast | Beastars | 15 | 3 | 0 |
| Human | ออกแบบเอง (ไม่มีเรื่อง) | 14 | 0 | 3 |
| Shonen | Naruto | 14 | 2 | 0 |

**วิธีอ่าน**
- `R` = Rank · `ATK/HP` · keyword ตัวเอียงในวงเล็บ เช่น *(Guard)*
- ความสามารถเขียนแบบ Card wizard: **จังหวะ: สิ่งที่ทำ** (ชื่อ trigger / action อยู่ใน `FACTIONS.md` และ `ADMIN_GUIDE.md` ข้อ 6)
- "ถาวร" = `permanent` · "จนจบการสู้" = ไม่ใส่ permanent
- key ตั้งเป็นภาษาอังกฤษตัวเล็ก ใช้ได้เลยตอนสร้างใน Admin
- ค่าพลังคิดตามตารางข้อ 3 ใน `FACTIONS.md` เป็นค่าเริ่มต้น ต้อง Simulate แล้วปรับ

---

## 1. Rider — Kamen Rider ZEZTZ

**แนว**: Zeztz ตัวเดียวสะสมพลัง แล้วใช้ **Capsem** (Gear) เปลี่ยนร่างไปมา บัฟติดตัวไปทุกร่าง แล้วไปจบที่ **Final Form: Zeztz Exdream**

**การ์ดในร้าน**
| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `zeztz` | Kamen Rider Zeztz (Physicam Impact) | 2/3 | — · Final Form → `zeztz_exdream` | Baku Yorozu ร่างพื้นฐาน (พละกำลัง) |
| 1 | `nem` | Nem | 1/2 | Deploy: ให้ Zeztz (ทุกร่าง) +1/+1 ถาวร | คนดังที่เป็นครอบครัวบุญธรรมของ Baku |
| 1 | `nasuka` | Nasuka Nagumo | 1/1 | Deploy: ได้ Gear เผ่า Rider แบบสุ่มเข้ามือ | นักสืบ |
| 2 | `nox_knight` | Nox Knight | 3/3 | Henshin (2) → Kamen Rider Nox | Kensei Odaka ใช้ Knight Invoker |
| 2 | `lord_five` | Lord Five (Knuckle Mode) | 2/4 *(Rider Kick)* | — | CODE 5 ฝ่ายเดียวกัน, Knuckle Mode |
| 2 | `lord_six` | Lord Six (Shoot Mode) | 3/2 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม (ทำงาน 2 ครั้ง) | Kureha Miyamoto CODE 6, Shoot Mode |
| 3 | `knight_seventeen` | Knight Seventeen | 3/4 | Deploy: ให้ Zeztz (ทุกร่าง) ได้ Barrier | Minami Yorozu CODE 17 |
| 3 | `eight` | Eight | 2/4 | Deploy: เสริมพลัง Gear +1/+1 จนจบเกม | CODE 8 เข้าร่วมทีม ZEZTZ |
| 3 | `fujimi` | Tetsuya Fujimi | 3/3 | Deploy: Rider Gauge +1 | ผู้บัญชาการตำรวจ |

**ร่างของ Zeztz** (token ทั้งหมด, ทุกร่างตั้ง Final Form → `zeztz_exdream` ให้ใช้การ์ด Final Form ได้จากทุกร่าง)
| key | ร่าง | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|
| `zeztz_wing` | Physicam Wing | 4/3 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม (2 ครั้ง) | ปีกค้างคาว ยิงพลังรูปใบมีด |
| `zeztz_transform` | Physicam Transform | 3/5 | เมื่อโจมตี: ตัวนี้ +2/+0 (จนจบการสู้) | แขนขาเปลี่ยนรูปได้ |
| `zeztz_stream` | Technolom Stream | 3/4 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูทุกตัว | ควบคุมลมและน้ำ |
| `zeztz_machinery` | Technolom Machinery | 4/4 *(Rider Kick)* | — | ถุงมือกรงเล็บ ตะขอเกี่ยว |
| `zeztz_projection` | Technolom Projection | 3/3 | เริ่มการต่อสู้: เรียกสำเนาของตัวนี้ (การ์ดพื้นฐาน) | สร้างร่างแยก |
| `zeztz_recovery` | Esprim Recovery | 2/6 | เมื่อโดนดาเมจแล้วยังรอด: ให้พวกเราตัวอื่นแบบสุ่ม +0/+2 | ซ่อมแซม รักษา |
| `zeztz_barrier` | Esprim Barrier | 3/5 *(Barrier, Guard)* | — | สนามพลัง |
| `zeztz_wonder` | Paradigm Wonder | 3/3 | เริ่มการต่อสู้: ตัวนี้ +3/+3 (จนจบการสู้) | ย่อ/ขยายขนาด |
| `zeztz_gravity` | Paradigm Gravity | 4/5 | เริ่มการต่อสู้: ทำดาเมจ 2 ใส่ศัตรูซ้ายสุด | ถุงมือควบคุมแรงโน้มถ่วง |
| `zeztz_plasma` | Inazuma Plasma | 5/4 *(Rapid)* | — | สายฟ้า + ความเร็ว (ร่างอัปเกรด) |
| `zeztz_booster` | Plasma Booster | 6/5 *(Rapid, Rider Kick)* | — | Plasma วิ่งเร็วขึ้นอีก |
| `zeztz_exdream` | **Kamen Rider Zeztz Exdream** (Final Form) | 10/10 *(Rider Kick, Barrier)* | เริ่มการต่อสู้: ให้พวกเราตัวอื่นทุกตัว +2/+2 (จนจบการสู้) | ร่างสุดท้าย รวมพลัง Capsem ก่อนหน้า |
| `nox` | Kamen Rider Nox | 5/5 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูทุกตัว · Final Form → `nox_midnight` | Nox Driver, ควบคุมเงา |
| `nox_midnight` | Nox Midnight Shadow (Final Form) | 9/8 *(Rapid)* | เริ่มการต่อสู้: ทำดาเมจ 2 ใส่ศัตรูทุกตัว | แสง + เงา + ภาพลวง |

**Capsem** (Gear เผ่า Rider · ใช้กับ: ยูนิตที่เลือก · เฉพาะการ์ด: Zeztz และทุกร่าง · ทำ: แปลงร่างเป็น…)
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
| — | `capsem_exdreamrise` | Exdreamrise Capsem (token, รางวัล Rider Gauge) | 0 | **เปลี่ยนเป็นร่าง Final Form** (`ULTIMATE_FORM`) · ใช้กับ Rider ที่เลือก |

**ไรเดอร์ฝ่ายร้าย** (เผ่า Rider · แผนรอง: ทำให้ศัตรูอ่อนแอก่อนสู้ และกำจัดศัตรูตัวสำคัญ)
| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 2 | `lord_thirteen` | Lord Thirteen | 3/2 *(Barrier)* | — | กลุ่ม CODE ที่หลงเหลือ ใช้ Clear Capsem (ล่องหน), Breakam Breaker โหมดดาบ |
| 3 | `kamen_rider_dawn` | Kamen Rider Dawn | 4/4 *(Rider Kick)* | Avenge (2): ตัวนี้ +2/+0 ถาวร | Sieg ผู้ก่อการร้ายในความฝัน ใช้ Punish Capsem และดาบ Breakam Dawn |
| 4 | `lord_three` | Lord Three | 5/4 *(Barrier)* | Deploy: ได้ Gear เผ่า Rider แบบสุ่มเข้ามือ | CODE 3 ผู้บริหารโหดเหี้ยม ใช้ Extra Capsem, Clear Capsem ล่องหน |
| 5 | `lord_two` | Lord Two | 6/6 *(Rider Kick)* | เริ่มการต่อสู้: ให้ศัตรูทุกตัว −1/−0 (จนจบการสู้) | ร่าง Lord ของ The Lady (หนัง Farewell Mission), Breakam Breaker โหมดหมัด |
| 6 | `kamen_rider_mugen` | Kamen Rider Mugen | 8/8 | เริ่มการต่อสู้: ทำลายศัตรูซ้ายสุด | Shuma Kumon ใช้ Daydream Capsem บิดเบือนความจริง ถือคาตานะ |

**หมายเหตุ Rider**
- ตัวกรอง "เฉพาะการ์ด" นับร่างที่มาจาก Henshin / Final Form แต่**ไม่นับร่างที่มาจาก Capsem (TRANSFORM)** ดังนั้นต้องใส่ทุกร่างของ Zeztz ในตัวกรองของ Capsem, Nem และ Knight Seventeen
- Rider Gauge: ตั้งรางวัลเป็น ADD_TO_HAND `capsem_exdreamrise` (เช่น ครบ 2 ครั้งต่อเกม)
- ไม่ได้ใส่: สัตว์ประหลาด Nightmare / Gore Nightmare / The Lady (ร่างคน) ตามที่กำหนด, Lord Zero (มีแค่ในหนัง)
- "−2/−0" กับศัตรู: ลดได้ต่ำสุด ATK 0 ไม่ทำให้ตาย และไม่ติดถาวร

---

## 2. Sentai — Ohsama Sentai King-Ohger

**แนว**: ราชาแต่ละอาณาจักรเป็นคนละสี ครบ 3 สีเกิด Roll Call · **Shugod** (หุ่นแมลง) ไม่มีสี แต่เติม Mecha Gauge และบัฟหุ่นยักษ์

**การ์ดในร้าน**
| R | key | การ์ด | สี | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|---|
| 1 | `kuwagata_ohger` | Kuwagata Ohger | RED | 2/2 | Team-Up (3): เริ่มการต่อสู้: ตัวนี้ +2/+2 · Final Form → `king_kuwagata` | Gira Husty กษัตริย์ Shugodom |
| 1 | `hachi_ohger` | Hachi Ohger | BLACK | 2/2 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม | Kaguragi Dybowski แห่ง Tofu |
| 1 | `god_tentou` | God Tentou | — | 1/2 | Deploy: Mecha Gauge +1 (ไม่เกิน 1 ครั้งต่อเกม) | Shugod เต่าทอง (เสริม) |
| 2 | `tombo_ohger` | Tombo Ohger | BLUE | 3/3 | Deploy: ให้ Giant Robo +2/+2 ถาวร | Yanma Gast วิศวกรผู้สร้าง Shugod |
| 2 | `kamakiri_ohger` | Kamakiri Ohger | YELLOW | 2/4 | จบเทิร์น: ให้ Sentai ตัวอื่นแบบสุ่ม +0/+2 | Hymeno Ran หมอ ราชินีแห่ง Ishabana |
| 2 | `god_kumo` | God Kumo | — | 2/3 | Deploy: Mecha Gauge +1 (ไม่เกิน 1 ครั้งต่อเกม) | Shugod แมงมุม (เสริม) |
| 2 | `god_ant` | God Ant | — | 2/2 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ถ้าเป็น Sentai ให้ตัวนั้น +1/+0 | Shugod มด (เสริม) |
| 3 | `papillon_ohger` | Papillon Ohger | PURPLE | 3/4 *(Guard)* | Team-Up (3): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +1/+0 | Rita Kaniska ประธานศาล ใช้ Ice Seal |
| 3 | `spider_kumonos` | Spider Kumonos | WHITE | 3/4 | Deploy: เลือกรับยูนิต Sentai 1 จาก 3 | Jeramie Brasieri นักประวัติศาสตร์ (กลายเป็นพวก) |
| 3 | `god_kabuto` | God Kabuto | — | 3/3 | Deploy: ให้ Giant Robo +3/+3 ถาวร | Shugod ด้วงกว่าง (เสริมร่าง Kabuto King-Ohger) |
| 4 | `god_scorpion` | God Scorpion | — | 4/5 | Deploy: ให้ Giant Robo ได้ Lethal | Shugod แมงป่อง (Scorpion King-Ohger) |
| 4 | `god_hopper` | God Hopper | — | 5/4 | Deploy: ให้ Giant Robo ได้ Rapid | Shugod ตั๊กแตน (Hopper King-Ohger) |
| 5 | `guardian_hercules` | Guardian Hercules | — | 6/8 *(Guard)* | Deploy: Mecha Gauge +2 | Guardian Weapon ด้วงเฮอร์คิวลีส |
| 5 | `ohkuwagata_ohger` | Ohkuwagata Ohger | SILVER | 6/6 | Team-Up (3): เริ่มการต่อสู้: ตัวนี้ +3/+3 | Rcules อดีตราชา Shugodom เคยเป็นศัตรูแล้วกลับมาเป็นพวก, Ohger Calibur Zero |
| 6 | `god_tarantula` | God Tarantula | — | 9/10 | Team-Up (4): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +2/+2 | Shugod ของ Jeramie, ร่างยักษ์ Tarantula Knight |

สีตรงกับในเรื่องแล้ว (เกมเพิ่มสี BLACK, WHITE, PURPLE, SILVER, GOLD, ORANGE) · King-Ohger ไม่มีสีเขียวและชมพู · Extra (นับเป็นสีใดก็ได้) ไม่มีในเรื่องนี้

**ร่าง / Gear / หุ่นยักษ์**
| ชนิด | key | การ์ด | ATK/HP | ความสามารถ |
|---|---|---|---|---|
| ร่าง (token) | `king_kuwagata` | King Kuwagata Ohger (Final Form ของ Kuwagata Ohger) | 8/8 *(Rider Kick)* | Team-Up (3): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +2/+2 |
| Gear | `ohger_crown_lance` | Ohger Crown Lance (R5, ราคา 4) | — | ใช้กับ Kuwagata Ohger: เปลี่ยนเป็นร่าง Final Form |
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
| 1 | `vector_sol` | Vector Sol | 2/2 *(Gattai)* | Gattai core → Solar Aquarion | เครื่องบินสีแดง |
| 1 | `vector_luna` | Vector Luna | 1/3 *(Gattai)* | Gattai core → Aquarion Luna | เครื่องบินสีเขียว |
| 1 | `vector_mars` | Vector Mars | 3/1 *(Gattai)* | Gattai core → Aquarion Mars | เครื่องบินสีน้ำเงิน |
| 2 | `apollo` | Apollo | 3/2 *(Gattai)* | Deploy: ให้ Vector Sol +2/+1 ถาวร | นักบิน Vector Sol |
| 2 | `silvia` | Silvia de Alisia | 2/3 *(Gattai)* | Deploy: ให้ Vector Luna +1/+2 ถาวร | นักบิน Luna |
| 2 | `pierre` | Pierre Vieira | 2/3 *(Gattai)* | Deploy: ให้ Vector Mars +2/+1 ถาวร | นักบิน Mars |
| 3 | `sirius` | Sirius de Alisia | 3/4 *(Gattai)* | Deploy: ให้ Mecha ทุกตัวที่มี Gattai +1/+1 ถาวร | นักบิน Mars |
| 3 | `reika` | Reika Kou | 3/4 *(Gattai)* | จบเทิร์น: ให้ Mecha ตัวอื่นแบบสุ่ม +1/+1 | นักบิน Luna |
| 3 | `deava_hangar` | DEAVA Hangar | 1/5 *(Guard)* | Deploy: เลือกรับยูนิต Mecha 1 จาก 3 | องค์กรที่วิจัย Vector |
| 4 | `cherubim_soldier` | Cherubim Soldier | 4/5 *(Guard)* | Last Stand: เรียก Harvest Beast | หุ่นยักษ์ของ Shadow Angel ที่คุ้มกันเครื่องเก็บเกี่ยว (ฝ่ายศัตรู) |
| 4 | `johannes` | Johannes | 4/4 | Deploy: ให้ Mecha ทุกตัว +1/+1 ถาวร | ผู้นำ Shadow Angel ในนาม (ฝ่ายศัตรู) |
| 5 | `gen_fudo` | Gen Fudo | 5/7 | Deploy: ให้ Mecha ทุกตัว +2/+2 ถาวร และ Giant Robo +2/+2 ถาวร | ผู้นำคณะสำรวจที่ขุดพบ Vector |
| 5 | `toma` | Toma | 6/6 *(Rapid)* | เริ่มการต่อสู้: เรียก Cherubim Soldier | Shadow Angel ตัวร้ายหลัก อดีตคู่หูของ Apollonius บังคับ Cherubim |
| 6 | `apollonius` | Apollonius | 8/8 *(Rapid)* | เมื่อเรียกยูนิตอื่นเข้าสนาม: ถ้าเป็น Mecha ให้ตัวนั้น +3/+3 ถาวร | ร่างเดิมของ Apollo (Shadow Angel ที่ช่วยมนุษย์) |

> ฝั่ง Shadow Angel (Cherubim, Johannes, Toma) เป็นแผนรองของ Mecha: หุ่นเดี่ยวที่ไม่ต้องรวมร่าง · Token: `harvest_beast` Harvest Beast 2/6 *(Guard)*

**ร่างรวม (token)** — ค่าพลังร่างรวม = ค่าในตาราง + ผลรวมชิ้นส่วน
| key | ร่าง | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|
| `solar_aquarion` | Solar Aquarion | 4/4 *(Rider Kick)* | Final Form → `solar_aquarion_wings` | สมดุล ถนัดระยะประชิด ร่างจริงของ Aquarion |
| `aquarion_luna` | Aquarion Luna | 3/4 | เริ่มการต่อสู้: ทำดาเมจ 2 ใส่ศัตรูทุกตัว | ระยะไกล คันธนู |
| `aquarion_mars` | Aquarion Mars | 4/3 *(Rapid)* | — | เน้นความเร็ว |
| `solar_aquarion_wings` | Solar Aquarion — Solar Wings (Final Form) | 12/12 *(Rider Kick, Rapid)* | เริ่มการต่อสู้: ทำดาเมจ 3 ใส่ศัตรูซ้ายสุด (Infinity Punch) | ปีกสุริยะ, Infinity Punch |

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 3 | `sousei_gattai` | Sousei Gattai! | 2 | ใช้กับ Mecha ที่เลือก: ให้ keyword Gattai และ +1/+1 |
| 6 | `solar_wings` | Solar Wings | 5 | ใช้กับ Solar Aquarion: เปลี่ยนเป็นร่าง Final Form |

---

## 4. Kaiju — Godzilla

**แนว**: ตายแล้วกลับมาแรงกว่า · Shin Godzilla วิวัฒนาการตามเทิร์น · Mothra ตัวอ่อนกลายเป็นตัวเต็มวัย

**การ์ดในร้าน**
| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `minilla` | Minilla | 1/2 | Last Stand: ให้ Kaiju แบบสุ่ม +2/+2 ถาวร | ลูกของ Godzilla |
| 1 | `mothra_larva` | Mothra (Larva) | 1/3 | Henshin (2) → Mothra | ตัวอ่อน พ่นใย |
| 1 | `shin_godzilla_2` | Shin Godzilla (2nd Form) | 1/2 | Henshin (2) → Shin Godzilla (3rd Form) | ร่าง 2 เลื้อยขึ้นบก (Kamata-kun) |
| 2 | `anguirus` | Anguirus | 2/3 *(Guard, Revive)* | — | ตัวหนามม้วนตัว บาดเจ็บง่ายแต่ไม่ยอมแพ้ |
| 2 | `rodan` | Rodan | 3/2 *(Rapid)* | — | บินเร็ว คลื่นกระแทก |
| 2 | `hedorah` | Hedorah | 1/3 *(Lethal)* | Last Stand: เรียก Hedorah Spawn 1/1 *(Lethal)* | สัตว์ประหลาดมลพิษ |
| 3 | `godzilla_junior` | Godzilla Junior | 2/3 *(Kyodaika)* | Avenge (2): ตัวนี้ +1/+1 ถาวร | ลูกที่โตขึ้น |
| 3 | `biollante` | Biollante | 3/4 *(Revive)* | Last Stand: ให้ Kaiju ทุกตัว +1/+0 (จนจบการสู้) | ไฮบริดพืช-Godzilla |
| 3 | `gigan` | Gigan | 4/3 *(Rider Kick)* | — | ไซบอร์กใบเลื่อย |
| 4 | `destoroyah` | Destoroyah | 3/4 | Last Stand: เรียก Destoroyah (Aggregate) 2/2 ×2 · Avenge (2): ตัวนี้ +2/+2 ถาวร | เริ่มเป็นตัวเล็กจำนวนมาก แล้วรวมเป็นร่างปีศาจ |
| 4 | `mechagodzilla` | Mechagodzilla | 4/6 *(Barrier)* | เริ่มการต่อสู้: ทำดาเมจ 2 ใส่ศัตรูซ้ายสุด · เผ่า Kaiju + Mecha | หุ่น Godzilla ที่มนุษย์สร้าง |
| 5 | `godzilla` | Godzilla | 6/7 *(Kyodaika)* | Avenge (3): ตัวนี้ +3/+3 ถาวร | ราชาแห่งสัตว์ประหลาด |
| 5 | `king_ghidorah` | King Ghidorah | 6/6 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูทุกตัว (3 ครั้ง, 3 หัว) | มังกรสามหัว |
| 6 | `burning_godzilla` | Burning Godzilla | 10/10 *(Kyodaika)* | Last Stand: ทำดาเมจ 4 ใส่ศัตรูทุกตัว (meltdown) | ความร้อนในตัวพุ่งจนใกล้หลอมละลาย |


**ร่าง / Token**
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `mothra` | Mothra | 4/5 | เริ่มการต่อสู้: ให้พวกเราตัวอื่นแบบสุ่มได้ Barrier (เกล็ดสะท้อนการโจมตี) |
| `shin_godzilla_3` | Shin Godzilla (3rd Form) | 3/4 | Henshin (2) → Shin Godzilla (4th Form) |
| `shin_godzilla_4` | Shin Godzilla (4th Form) | 8/8 *(Kyodaika)* | เริ่มการต่อสู้: ทำดาเมจ 3 ใส่ศัตรูซ้ายสุด (atomic breath) |
| `hedorah_spawn` / `destoroyah_aggregate` | token | 1/1 Lethal / 2/2 | — |

---

## 5. Beast — Beastars

**แนว**: ตัวละครโรงเรียน Cherryton และชมรมการละคร เรียกเพื่อนเข้าสนาม ตัวที่ลงมาได้กำลังใจ (บัฟ)

| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `haru` | Haru | 1/2 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ให้ตัวนั้น +0/+1 | กระต่ายขาว ชมรมจัดสวน |
| 1 | `jack` | Jack | 2/2 | Deploy: ถ้ามี Legoshi บนบอร์ด ตัวนี้ +2/+2 ถาวร | ลาบราดอร์ เพื่อนสนิทของ Legoshi |
| 1 | `tem` | Tem | 1/2 | Last Stand: ให้ Beast แบบสุ่ม +1/+1 ถาวร | อัลปากา สมาชิกชมรมการละคร |
| 2 | `collot` | Collot | 2/2 | Deploy: เรียก Durham 1/2 | Old English Sheepdog เพื่อนร่วมหอ |
| 2 | `pina` | Pina | 3/2 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ตัวนี้ +1/+0 ถาวร | แกะ Dall ปีหนึ่ง ชมรมการละคร |
| 2 | `els` | Els | 2/3 | Deploy: ให้ Beast ที่อยู่ข้างๆ +1/+1 | แพะแองโกรา |
| 2 | `kibi` | Kibi | 2/3 | Deploy: เรียก Dom 1/1 | ตัวกินมด ทีมเวที |
| 3 | `juno` | Juno | 3/4 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ให้ตัวนั้น +1/+1 | หมาป่าเทา ปีหนึ่ง |
| 3 | `bill` | Bill | 4/3 | Deploy: ให้ Beast ทุกตัว +1/+0 | เสือเบงกอล อยากเป็น Beastar |
| 3 | `gohin` | Gohin | 3/5 *(Guard)* | Deploy: ให้ Legoshi +2/+2 ถาวร และ Barrier | แพนด้า หมอใต้ดิน อาจารย์ของ Legoshi |
| 4 | `louis` | Louis | 4/5 | Deploy: เรียก Shishigumi Lion 2/2 ×2 | กวางแดง ดาวชมรมการละคร เคยนำกลุ่มสิงโต |
| 4 | `gosha` | Gosha | 4/6 | Deploy: ให้ Legoshi ได้ Lethal | มังกรโคโมโด ปู่ของ Legoshi |
| 4 | `sagwan` | Sagwan | 3/5 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ได้ +1/+1 ถาวร (ไม่เกิน 3 ครั้งต่อเทิร์น) | แมวน้ำ เพื่อนบ้านที่ Beast Apartments |
| 5 | `legoshi` | Legoshi | 5/6 | เมื่อเรียกยูนิตอื่นเข้าสนาม: ตัวนี้ +1/+1 ถาวร | หมาป่าเทา ตัวเอก |
| 6 | `yahya` | Yahya | 8/9 *(Echo)* | Deploy: ให้ Beast ทุกตัว +2/+2 ถาวร | ม้า Beastar คนปัจจุบัน |

**Token**: `durham` Durham 1/2 (หมาโคโยตี้ เพื่อนร่วมหอ), `dom` Dom 1/1 (นกยูง หัวหน้าทีมเวที), `shishigumi_lion` Shishigumi Lion 2/2
- ไม่ได้ใส่ (ตัวร้าย): Riz, Melon, Ibuki — Louis เรียก "Shishigumi Lion" เป็น token ทั่วไปแทน
- Durham และ Dom เป็นตัวละครที่มีในเรื่อง แต่ทำเป็น token เพื่อให้เป็นการ์ดที่ถูกเรียก

---

## 6. Human — ออกแบบเอง (เศรษฐกิจ)

**แนว**: ไม่มีเรื่องอ้างอิง เป็นคนธรรมดาในโลกเกม (กองกำลังป้องกัน, พ่อค้า, นักวิจัย) ได้ Energy การ์ด Gear และร้านแรงขึ้น ค่าพลังต่ำกว่าเกณฑ์ประมาณ 1 แต้ม

| R | key | การ์ด | ATK/HP | ความสามารถ |
|---|---|---|---|---|
| 1 | `street_vendor` | Street Vendor | 1/2 | Deploy: ได้ 1 Energy |
| 1 | `intern_researcher` | Intern Researcher | 1/1 | Deploy: ได้ Gear แบบสุ่มเข้ามือ |
| 1 | `volunteer` | Volunteer | 2/2 | เมื่อถูกขาย: ได้ 1 Energy |
| 2 | `shop_manager` | Shop Manager | 2/2 | Deploy: ยูนิตในร้านได้ +1/+1 จนจบเกม |
| 2 | `field_scout` | Field Scout | 2/3 | Deploy: เลือกรับยูนิต 1 จาก 3 |
| 2 | `mechanic` | Mechanic | 2/3 | Deploy: เสริมพลัง Gear +1/+0 จนจบเกม |
| 3 | `banker` | Banker | 2/4 | ต้นทุกเทิร์น: ได้ 1 Energy |
| 3 | `quartermaster` | Quartermaster | 3/4 | จบเทิร์น: ถ้ามี Energy เหลือ ≥ 2 ให้พวกเราตัวอื่นแบบสุ่ม +2/+2 |
| 3 | `recruiter` | Recruiter | 3/3 | Deploy: ได้ยูนิตแบบสุ่มเข้ามือ |
| 4 | `mayor` | Mayor | 3/5 | Deploy: ยูนิตในร้านได้ +2/+2 จนจบเกม |
| 4 | `arms_dealer` | Arms Dealer | 4/4 | Deploy: ได้ Gear แบบสุ่มเข้ามือ (2 ครั้ง) |
| 5 | `tycoon` | Tycoon | 5/6 | จบเทิร์น: ถ้ามี Energy เหลือ ≥ 3 ให้พวกเราทุกตัว +1/+1 |
| 5 | `defense_commander` | Defense Commander | 6/6 | Deploy: ให้พวกเราทุกตัว +1/+2 ถาวร |
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
| 1 | `naruto` | Naruto Uzumaki | 1/3 | เริ่มการต่อสู้: เรียกสำเนาของตัวนี้ (การ์ดพื้นฐาน) · Henshin (3) → Naruto (Sage Mode) | Shadow Clone |
| 1 | `sakura` | Sakura Haruno | 1/3 | จบเทิร์น: ให้ Naruto หรือ Sasuke +0/+2 ถาวร | นินจาแพทย์ |
| 1 | `hinata` | Hinata Hyuga | 2/2 *(Guard)* | — | ปกป้อง Naruto |
| 2 | `rock_lee` | Rock Lee | 2/3 | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +2/+0 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น*) | Eight Gates (เปิดได้บางประตู) |
| 2 | `neji` | Neji Hyuga | 3/2 | เมื่อโจมตี: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม | หมัดอ่อน |
| 2 | `shikamaru` | Shikamaru Nara | 2/3 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −2/+0 (จนจบการสู้)** | Shadow Possession |
| 3 | `sasuke` | Sasuke Uchiha | 4/3 *(Rider Kick)* | Avenge (2): ตัวนี้ +2/+0 ถาวร | Chidori — แทงเร็ว |
| 3 | `kakashi` | Kakashi Hatake | 3/4 | เริ่มการต่อสู้: เรียกสำเนาของศัตรูซ้ายสุด | Copy Ninja, Sharingan |
| 3 | `gaara` | Gaara | 2/4 *(Guard, Barrier)* | — | โล่ทราย |
| 4 | `jiraiya` | Jiraiya | 4/5 | เริ่มการต่อสู้: เรียก Gamabunta 5/5 | อัญเชิญคางคก |
| 4 | `tsunade` | Tsunade | 3/6 | เมื่อโดนดาเมจแล้วยังรอด: ให้พวกเราทุกตัว +0/+1 (ไม่เกิน 2 ครั้งต่อเทิร์น*) | ฟื้นฟูด้วย Katsuyu |
| 5 | `might_guy` | Might Guy | 5/6 | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +8/+0 (จนจบการสู้, **ไม่เกิน 1 ครั้งต่อเกม** — Night Guy) | Eight Gates ครบ 8 ประตู |
| 5 | `itachi` | Itachi Uchiha | 6/5 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −4/−0 (จนจบการสู้) | Sharingan, Tsukuyomi (ภาพลวง) |
| 6 | `naruto_kurama` | Naruto (Kurama Chakra Mode) | 9/9 *(Rapid, Rider Kick)* | Avenge (2): ตัวนี้ +2/+2 ถาวร | พลังเก้าหาง |

**ร่าง / Token**
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `naruto_sage` | Naruto (Sage Mode) | 5/5 | เมื่อโจมตี: ทำดาเมจ 2 ใส่ศัตรูแบบสุ่ม (Rasenshuriken) |
| `gamabunta` | Gamabunta | 5/5 | — |
| (สำเนาของ Naruto) | ใช้ action COPY ไม่ต้องสร้างการ์ด | | |

\* limit มีแค่ "ต่อเทิร์น" กับ "ต่อเกม" 1 เทิร์นมีการสู้ครั้งเดียว "ต่อเทิร์น" จึงเท่ากับต่อการสู้
\*\* ค่าติดลบใส่ศัตรูหยุดที่ ATK 0 และไม่ทำให้ตาย (ดูข้อ 8)

---

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

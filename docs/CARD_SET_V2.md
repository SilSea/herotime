# ชุดขยาย: ซีรีส์ที่ 2 (ร่าง รอตรวจ)

ซีรีส์ใหม่ของเผ่าเดิม 3 เผ่า · ยังไม่ได้ใส่ draft · ค่าพลังตั้งตามตาราง Rank ใน `FACTIONS.md` ต้อง Simulate ก่อนใช้จริง · วิธีอ่านเหมือน `CARD_SET_V1.md`

| เผ่า | ซีรีส์ใหม่ (`series`) | franchise | การ์ดในร้าน | ร่าง / Token | Gear |
|---|---|---|---|---|---|
| Rider | Kamen Rider Build (`build`) | `kamen-rider` (เดียวกับ Zeztz) | 14 (ฝ่ายร้าย 6) | 18 | 6 Fullbottle |
| Sentai | Bakuryuu Sentai Abaranger (`abaranger`) | `super-sentai` (เดียวกับ King-Ohger) | 14 | 1 + Giant 3 | 3 |
| Shonen | My Hero Academia (`mha`) | `mha` (คนละ franchise กับ Naruto) | 14 | 3 | 3 |

แนวเดียวกับชุดแรก: Rider ขายร่างคนแล้ว Henshin (ไม่มีสัตว์ประหลาด) · Sentai มีแต่ฝั่งเรนเจอร์และพันธมิตร (ไม่มี Evolien) · ทุกร่างสุดท้ายใช้การ์ด **Final Form กลาง** (ตั้ง `ultimateInto`)

---

## ตัดสินใจแล้ว (ยังไม่ได้แก้ code)

**1 ซีรีส์ต่อเผ่าต่อเกม** — แต่ละเกมสุ่มซีรีส์ของแต่ละเผ่าที่อยู่ในเกมมา 1 ซีรีส์ (ตั้งจำนวนได้ใน Admin → Rules, 0 = ปิด) แล้วของที่ไม่ใช่ซีรีส์นั้นไม่ออก:
- ยูนิตในร้าน และ **Gear** ในร้าน (ตอนนี้ Gear กรองแค่เผ่า ต้องเพิ่มกรองซีรีส์)
- **Hero** ที่สุ่มให้เลือก: เฉพาะ Hero ของซีรีส์ในเกม (หรือไม่มีซีรีส์) · ตอนนี้สุ่มจาก Hero ทุกตัว
- **Relic**: กรองตามซีรีส์ในเกมอยู่แล้ว
- Giant Robo จาก Kyodai Gattai!: กรองตามซีรีส์ในเกมอยู่แล้ว
- ซีรีส์ที่มีการ์ดหลายเผ่า (เช่น Mechagodzilla เป็น Kaiju + Mecha) นับเป็นของเผ่าที่การ์ดส่วนใหญ่อยู่ (Godzilla → Kaiju)

ผลข้างเคียง: ปัญหา Rider มี Gear มากเกินหายไปด้วย (เกมหนึ่งมีแค่ Capsem หรือแค่ Fullbottle) · Abaranger กับ King-Ohger ใช้ Mecha Gauge / Giant Slot ร่วมกันได้ตามเดิม

---

## 1. Rider — Kamen Rider Build

**แนว**: **Fullbottle** (Gear) ใช้กับ Rider ตัวไหนก็ได้ +1/+1 ถาวร ถ้าเป็น Build (ทุกร่าง `formOf: build_rabbittank`) เปลี่ยนเป็นฟอร์ม **Best Match** ด้วย (แบบ Capsem) · Cross-Z โตเมื่อโดนตี (Hazard Level) · Grease ทน และตายแล้วส่งพลังให้ทีม

**การ์ดในร้าน: ร่างคนและผู้ช่วย**
| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `sento_kiryu` | Sento Kiryu | 1/2 | Henshin (1) → Build RabbitTank | ตัวเอก นักฟิสิกส์อัจฉริยะ |
| 1 | `misora_isurugi` | Misora Isurugi | 1/3 | Deploy: ได้ Gear เผ่า Rider แบบสุ่มเข้ามือ | ชำระ Fullbottle |
| 1 | `sawa_takigawa` | Sawa Takigawa | 2/2 | Deploy: ให้ Build (ทุกร่าง) +1/+1 ถาวร | นักข่าว |
| 2 | `banjo_ryuga` | Banjo Ryuga | 2/2 | Henshin (1) → Kamen Rider Cross-Z | นักมวยที่ถูกใส่ร้าย |
| 2 | `three_crows` | Hokuto Three Crows | 2/3 | Last Stand: ให้ Grease (ทุกร่าง) +2/+2 ถาวร | Akaba, Aoba, Kiba ลูกน้องของ Kazumi |
| 2 | `gentoku_himuro` | Gentoku Himuro *(ฝ่ายร้าย)* | 2/2 | Henshin (1) → Night Rogue | ผู้นำ Faust |
| 3 | `kazumi_sawatari` | Kazumi Sawatari | 2/3 | Henshin (1) → Kamen Rider Grease | Rider ของ Hokuto |
| 3 | `soichi_isurugi` | Soichi Isurugi *(ฝ่ายร้าย)* | 3/3 | Henshin (1) → Blood Stalk | นักบินอวกาศที่ถูก Evolto สิง |
| 3 | `nariaki_utsumi` | Nariaki Utsumi *(ฝ่ายร้าย)* | 3/3 | Henshin (1) → Mad Rogue | เลขาของ Gentoku |
| 4 | `cross_z_dragon` | Cross-Z Dragon | 4/4 | Deploy: ให้ Cross-Z (ทุกร่าง) +2/+2 ถาวร | มังกรกลของ Banjo |
| 4 | `juzo_namba` | Juzo Namba *(ฝ่ายร้าย)* | 4/5 | Deploy: ได้ Gear เผ่า Rider แบบสุ่มเข้ามือ (2 ครั้ง) | ประธาน Namba Heavy Industries |
| 5 | `takumi_katsuragi` | Takumi Katsuragi | 5/6 | Deploy: ให้ Build (ทุกร่าง) +2/+2 ถาวร · Rider Gauge +1 | ตัวตนเดิมของ Sento ผู้สร้างระบบ Build |
| 5 | `killbas` | Killbas *(ฝ่ายร้าย)* | 4/5 | Henshin (1) → Kamen Rider Killbas | น้องชายของ Evolto |
| 6 | `evolto` | Evolto *(ฝ่ายร้าย)* | 5/5 | Henshin (1) → Kamen Rider Evol (Black Hole) | มนุษย์ต่างดาวจากดาวอังคาร |

**ร่างไรเดอร์** (token)
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `build_rabbittank` | Kamen Rider Build (RabbitTank) | 4/4 | — · Final Form → Genius Form |
| `build_genius` | Build Genius Form (Final Form) | 10/10 *(Rider Kick)* | เริ่มการต่อสู้: ให้พวกเราทุกตัว +1/+1 และตัวนี้ได้ Barrier (จนจบการสู้) |
| `cross_z` | Kamen Rider Cross-Z | 4/4 | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +1/+0 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น) · Final Form → Cross-Z Magma |
| `cross_z_magma` | Cross-Z Magma (Final Form) | 9/8 *(Rider Kick)* | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +2/+0 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น) |
| `grease` | Kamen Rider Grease | 4/5 *(Guard)* | — · Final Form → Grease Blizzard |
| `grease_blizzard` | Grease Blizzard (Final Form) | 8/10 *(Guard)* | Last Stand: ให้ Rider ทุกตัว +3/+3 ถาวร |
| `night_rogue` | Night Rogue *(ฝ่ายร้าย)* | 3/4 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −2/−0 · Henshin (2) → Kamen Rider Rogue |
| `rogue` | Kamen Rider Rogue | 5/6 *(Guard)* | — · Final Form → Prime Rogue |
| `prime_rogue` | Prime Rogue (Final Form) | 9/10 *(Guard, Barrier)* | — |
| `mad_rogue` | Mad Rogue *(ฝ่ายร้าย)* | 5/4 | เมื่อโจมตี: ให้ศัตรูแบบสุ่ม −1/−0 (จนจบการสู้) |
| `blood_stalk` | Blood Stalk *(ฝ่ายร้าย)* | 5/5 *(Rapid)* | — |
| `killbas_rider` | Kamen Rider Killbas *(ฝ่ายร้าย)* | 7/7 | เมื่อโจมตี: ทำดาเมจ 2 ใส่ศัตรูแบบสุ่ม |
| `evol_blackhole` | Kamen Rider Evol (Black Hole) *(ฝ่ายร้าย)* | 9/9 | เริ่มการต่อสู้: ทำลายศัตรูแบบสุ่ม 1 ตัว |

**ฟอร์ม Best Match ของ Build** (token · ทุกร่างตั้ง `formOf: build_rabbittank` และ Final Form → `build_genius`)
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `build_gorillamond` | GorillaMond | 4/6 *(Barrier)* | — |
| `build_hawkgatling` | HawkGatling | 4/3 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม (3 ครั้ง) |
| `build_ninnincomic` | NinninComic | 3/4 | เริ่มการต่อสู้: เรียกสำเนาของตัวนี้ (การ์ดพื้นฐาน) |
| `build_kaizokuressha` | KaizokuRessha | 4/4 *(Rapid)* | — |
| `build_sparkling` | RabbitTank Sparkling | 6/6 *(Rapid, Rider Kick)* | — |
| `build_hazard` | RabbitTank Hazard | 7/4 *(Rapid)* | เมื่อโจมตี: ตัวนี้ +2/+0 (จนจบการสู้) |

**Fullbottle** (Gear เผ่า Rider · ใช้กับ Rider ที่เลือก: +1/+1 ถาวร · ถ้าเป็น Build (ทุกร่าง) แปลงเป็น… ด้วย)
| R | key | Gear | ราคา | แปลงเป็น |
|---|---|---|---|---|
| 1 | `fb_gorilla_diamond` | Gorilla & Diamond Fullbottle | 1 | GorillaMond |
| 2 | `fb_hawk_gatling` | Hawk & Gatling Fullbottle | 2 | HawkGatling |
| 2 | `fb_ninja_comic` | Ninja & Comic Fullbottle | 2 | NinninComic |
| 3 | `fb_pirate_train` | Pirate & Train Fullbottle | 3 | KaizokuRessha |
| 4 | `sparkling_can` | RabbitTank Sparkling | 4 | RabbitTank Sparkling |
| 4 | `hazard_trigger` | Hazard Trigger | 3 | RabbitTank Hazard |

**Hero**
| key | Hero | Armor | พลัง |
|---|---|---|---|
| `h_sento` | Sento Kiryu | 0 | Hero Power (2 Energy, เทิร์นละครั้ง): ได้ Gear เผ่า Rider แบบสุ่มเข้ามือ |
| `h_banjo` | Banjo Ryuga | 0 | Passive: ต้นทุกเทิร์น: ให้ยูนิต Kamen Rider แบบสุ่ม 1 ตัว +1/+0 ถาวร |
| `h_gentoku` | Gentoku Himuro | 4 | Hero Power (2 Energy, เทิร์นละครั้ง): ให้ยูนิต Kamen Rider ขวาสุดได้ Guard และ +1/+2 ถาวร |
| `h_misora` | Misora Isurugi | 0 | Hero Power (0 Energy, ครั้งเดียวต่อเกม): เลือกรับยูนิต Kamen Rider 1 จาก 3 · Rider Gauge +1 |

**Relic**
| key | Relic | ระดับ | ราคา | ผล |
|---|---|---|---|---|
| `rl_build_driver` | Build Driver | Lesser | 1 | เมื่อได้รับ: Rider Gauge +2 |
| `rl_pandora_box` | Pandora Box | Greater | 5 | ต้นทุกเทิร์น: ให้ยูนิต Kamen Rider ทุกตัว +1/+1 ถาวร |

---

## 2. Sentai — Bakuryuu Sentai Abaranger

**แนว**: เรนเจอร์ 4 สี + **AbareKiller เป็น EXTRA** (นับเป็นสีที่ขาด และให้ keyword กับหุ่นตอน Super Gattai) · **Bakuryuu** (ไดโนเสาร์) ไม่มีสี เติม Mecha Gauge และบัฟหุ่น แบบ Shugod · ทีมได้พลังจาก **Dino Guts**

**การ์ดในร้าน**
| R | key | การ์ด | สี | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|---|
| 1 | `aba_red` | AbaRed | RED | 2/3 | Team-Up (3): เริ่มการต่อสู้: ตัวนี้ +2/+2 · Final Form → Abare Max | Ryoga Hakua · Bakuryuu Tyrannosaurus |
| 1 | `aba_blue` | AbaBlue | BLUE | 2/3 | Deploy: ให้ Sentai ตัวอื่นแบบสุ่ม +1/+1 ถาวร | Yukito Sanjyo · Triceratops |
| 1 | `bakuryuu_tyranno` | Bakuryuu Tyrannosaurus | — | 2/2 | Deploy: ให้ Giant Robo +1/+1 ถาวร | คู่หูของ AbaRed |
| 2 | `aba_yellow` | AbaYellow | YELLOW | 3/2 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม | Ranru Itsuki · Pteranodon |
| 2 | `emiri` | Emiri Imanaka | — | 2/3 | Deploy: Mecha Gauge +1 (ไม่เกิน 1 ครั้งต่อเกม) | คุยกับ Bakuryuu ได้ |
| 2 | `bakuryuu_tricera` | Bakuryuu Triceratops | — | 3/3 | Deploy: ให้ Giant Robo +2/+2 ถาวร | คู่หูของ AbaBlue |
| 3 | `aba_black` | AbaBlack | BLACK | 3/4 *(Guard)* | Team-Up (3): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +0/+2 | Asuka นักรบจาก Dino Earth |
| 3 | `bakuryuu_ptera` | Bakuryuu Pteranodon | — | 3/3 | Deploy: ให้ Giant Robo ได้ Barrier | คู่หูของ AbaYellow |
| 3 | `bakuryuu_ankylo` | Bakuryuu Ankylosaurus | — | 3/4 | Deploy: ให้ Giant Robo +3/+3 ถาวร | ชิ้นส่วนแขนเสริมของ AbarenOh |
| 4 | `aba_killer` | AbareKiller | EXTRA | 5/4 *(Rapid)* | — | Mikoto Nakadai ศัลยแพทย์ที่สู้เพื่อความสนุก |
| 4 | `top_galer` | TopGaler | — | 4/5 | Deploy: ให้ Giant Robo ได้ Rapid | Bakuryuu ของ AbareKiller |
| 5 | `bakuryuu_dimenokov` | Bakuryuu Dimenokov | — | 6/7 | Deploy: ให้ Giant Robo ได้ Lethal | Bakuryuu ข้ามมิติ |
| 5 | `bakuryuu_stego` | Bakuryuu Stegosaurus | — | 6/7 *(Guard)* | เมื่อเรียกยูนิตอื่นเข้าสนาม: ถ้าเป็น Sentai ให้ตัวนั้น +1/+1 ถาวร | |
| 6 | `bakuryuu_brachio` | Bakuryuu Brachiosaurus | — | 8/10 *(Guard)* | Deploy: Mecha Gauge +2 · Team-Up (4): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +2/+2 | คู่หูของ AbaBlack (ยานแม่) |

**ร่าง / หุ่นยักษ์**
| ชนิด | key | การ์ด | ATK/HP | ความสามารถ |
|---|---|---|---|---|
| ร่าง (token) | `abare_max` | Abare Max (Final Form ของ AbaRed) | 8/8 *(Power Strike)* | Team-Up (3): เริ่มการต่อสู้: ให้ Sentai ทุกตัว +2/+1 |
| Giant | `abarenoh` | AbarenOh | 10/12 *(Final Blow)* | Tyranno + Tricera + Ptera · Final Form → Max Ohja |
| Giant | `killer_oh` | Killer Oh | 11/10 *(Final Blow, Rapid)* | หุ่นของ AbareKiller |
| Giant (ร่างอัปเกรด) | `max_ohja` | Max Ohja | 18/18 *(Final Blow, Guard)* | ร่างรวมใหญ่สุด — ได้จาก Final Form เป้า Giant Robo |

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 1 | `dino_bracer` | Dino Bracer | 1 | ใช้กับ Sentai ที่เลือก: +1/+2 ถาวร |
| 3 | `dino_guts` | Dino Guts | 2 | ให้ Sentai ทุกตัว +1/+0 ถาวร |
| 4 | `abare_summon` | Bakuryuu Call | 3 | Mecha Gauge +1 · ให้ Giant Robo +2/+2 ถาวร |

**Hero**
| key | Hero | Armor | พลัง |
|---|---|---|---|
| `h_ryoga` | Ryoga Hakua | 0 | Hero Power (2 Energy, เทิร์นละครั้ง): ให้ยูนิต Super Sentai ซ้ายสุด +2/+2 ถาวร |
| `h_emiri` | Emiri Imanaka | 0 | Passive: ต้นทุกเทิร์น: ให้ Giant Robo ของเรา +1/+1 ถาวร |
| `h_mikoto` | Mikoto Nakadai | 0 | Hero Power (2 Energy, เทิร์นละครั้ง): ให้ยูนิต Super Sentai แบบสุ่ม 1 ตัวได้ Rapid (ไม่เกิน 2 ครั้งต่อเกม) |
| `h_asuka` | Asuka | 5 | Hero Power (1 Energy, ครั้งเดียวต่อเกม): Mecha Gauge +2 |

**Relic**
| key | Relic | ระดับ | ราคา | ผล |
|---|---|---|---|---|
| `rl_dino_bracer` | Dino Bracer | Lesser | 1 | เริ่มการต่อสู้: ให้ยูนิต Super Sentai ทุกตัว +1/+0 |
| `rl_dino_earth` | Dino Earth | Greater | 4 | เมื่อได้รับ: Mecha Gauge +3 |

---

## 3. Shonen — My Hero Academia

**แนว**: นักเรียน U.A. โตจากการต่อสู้ (Bakugo ระเบิดแรงขึ้นทุกครั้งที่ตี, Kirishima แข็งขึ้นเมื่อโดนตี) · Izuku Henshin เป็น Full Cowl แล้ว Final Form เป็น One For All 100% · All Might ส่งพลังให้ Izuku

**การ์ดในร้าน**
| R | key | การ์ด | ATK/HP | ความสามารถ | อ้างอิง |
|---|---|---|---|---|---|
| 1 | `izuku` | Izuku Midoriya | 1/4 | Henshin (3) → Deku (Full Cowl) | ตัวเอก ผู้สืบทอด One For All |
| 1 | `ochaco` | Ochaco Uraraka | 1/4 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −1/−0 (จนจบการสู้) | Zero Gravity |
| 1 | `iida` | Tenya Iida | 2/2 *(Rapid)* | — | Engine |
| 2 | `bakugo` | Katsuki Bakugo | 3/2 | เมื่อโจมตี: ตัวนี้ +1/+0 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น) | Explosion |
| 2 | `todoroki` | Shoto Todoroki | 2/4 | เริ่มการต่อสู้: ทำดาเมจ 2 ใส่ศัตรูซ้ายสุด | Half-Cold Half-Hot |
| 2 | `tsuyu` | Tsuyu Asui | 2/4 | Deploy: ให้ตัวที่อยู่ข้างๆ ได้ Guard | Froppy |
| 3 | `kirishima` | Eijiro Kirishima | 2/5 *(Guard)* | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +0/+2 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น) | Hardening |
| 3 | `momo` | Momo Yaoyorozu | 2/5 | Deploy: ได้ Gear เผ่า Shonen แบบสุ่มเข้ามือ | Creation |
| 3 | `aizawa` | Shota Aizawa | 3/4 | เริ่มการต่อสู้: ให้ศัตรูซ้ายสุด −3/−0 (จนจบการสู้) | Eraser Head ลบอัตลักษณ์ |
| 4 | `tokoyami` | Fumikage Tokoyami | 4/5 | เริ่มการต่อสู้: เรียก Dark Shadow 3/3 | Dark Shadow |
| 4 | `hawks` | Hawks | 4/4 *(Rapid)* | เมื่อโจมตี: ทำดาเมจ 1 ใส่ศัตรูแบบสุ่ม | Fierce Wings |
| 5 | `endeavor` | Endeavor | 6/7 | เริ่มการต่อสู้: ทำดาเมจ 1 ใส่ศัตรูทุกตัว | ฮีโร่อันดับ 1, Hellflame |
| 5 | `mirio` | Mirio Togata | 5/6 *(Barrier)* | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +3/+0 ถาวร (ไม่เกิน 1 ครั้งต่อเทิร์น) | Permeation |
| 6 | `all_might` | All Might | 9/9 *(Power Strike)* | Deploy: ให้ Izuku (ทุกร่าง) +3/+3 ถาวร · Avenge (2): ตัวนี้ +2/+2 ถาวร | Symbol of Peace |

**ร่าง / Token**
| key | ร่าง | ATK/HP | ความสามารถ |
|---|---|---|---|
| `deku_full_cowl` | Deku (Full Cowl) | 5/5 *(Power Strike)* | เมื่อโดนดาเมจแล้วยังรอด: ตัวนี้ +1/+1 ถาวร (ไม่เกิน 2 ครั้งต่อเทิร์น) · Final Form → One For All 100% |
| `deku_ofa` | Deku (One For All 100%) (Final Form) | 10/9 *(Rapid, Power Strike)* | Avenge (2): ตัวนี้ +2/+2 ถาวร |
| `dark_shadow` | Dark Shadow | 3/3 | — |

**Gear**
| R | key | Gear | ราคา | ความสามารถ |
|---|---|---|---|---|
| 1 | `hero_costume` | Hero Costume | 1 | ใช้กับ Shonen ที่เลือก: +1/+2 ถาวร |
| 3 | `hero_license` | Hero License | 2 | เลือกรับยูนิต Shonen 1 จาก 3 |
| 4 | `plus_ultra` | Plus Ultra | 3 | ใช้กับ Shonen ที่เลือก: ได้ Rapid และ +1/+1 ถาวร |

**Hero**
| key | Hero | Armor | พลัง |
|---|---|---|---|
| `h_all_might` | All Might | 0 | Hero Power (2 Energy, ครั้งเดียวต่อเกม): ให้ยูนิต Shonen ซ้ายสุด +4/+4 ถาวร |
| `h_aizawa` | Shota Aizawa | 3 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Shonen แบบสุ่ม 1 ตัว +1/+1 ถาวร |
| `h_nezu` | Principal Nezu | 0 | Passive: Refresh ฟรี 1 ครั้งต่อเทิร์น |
| `h_recovery_girl` | Recovery Girl | 0 | Hero Power (1 Energy, เทิร์นละครั้ง): ให้ยูนิต Shonen แบบสุ่ม 1 ตัว +0/+3 ถาวร |

**Relic**
| key | Relic | ระดับ | ราคา | ผล |
|---|---|---|---|---|
| `rl_ua_training` | U.A. Training Ground | Lesser | 1 | เริ่มการต่อสู้: ให้ยูนิต Shonen ทุกตัว +1/+1 |
| `rl_one_for_all` | One For All | Greater | 5 | เริ่มการต่อสู้: ให้ยูนิต Shonen ซ้ายสุด +5/+5 |

---

## หมายเหตุ
- ทุกความสามารถใช้กลไกที่ engine มีอยู่แล้ว ไม่ต้องแก้ code (ยกเว้นข้อ 1ข / 2 ด้านบนถ้าเลือก)
- ไม่ได้ใส่: สัตว์ประหลาด Smash (Build), Evolien (Abaranger), วายร้าย League of Villains (MHA)
- รูป: ยังไม่มี หาจาก wiki แฟนคลับแบบชุด Gear ได้

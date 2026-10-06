# HeroTime — Game Rules v0.1

ตัวเลขทุกค่าในเอกสารนี้เป็นค่าเริ่มต้น ปรับได้ผ่าน config / admin editor

## 1. ภาพรวม
- ล็อบบี้มี 8 ผู้เล่น ถ้าคนไม่ครบให้ bot เติม
- เลือก **Hero** 1 ตัวจากที่สุ่มมา **2 ตัว** ทุก Hero มี **HP 30** + **Armor** (0–10 ตาม Hero) และ **Hero Power**
- แต่ละเทิร์นมี 2 phase: **Recruit** (ซื้อ/จัดทัพ) → **Battle** (สู้อัตโนมัติ)
- HP ≤ 0 = ตกรอบ. อันดับตามลำดับที่ตกรอบ คนสุดท้ายที่รอดชนะ

### 1.1 Timer
| ช่วง | เวลา |
|---|---|
| เลือก Hero | 30s |
| Recruit เทิร์น 1 | 40s |
| Recruit เทิร์น 2+ | +5s ทุกเทิร์น สูงสุด 75s (ถึง cap ราวเทิร์น 8) |
| Battle | 20s: replay เล่นอัตโนมัติ ถ้า fight ยาวจะเร่งให้จบในเวลา (กดเร่ง ×2/×4 หรือ Skip เองได้) แล้วนับถอยหลังเข้าเทิร์นถัดไป |
| จบ Recruit | **ไม่มีปุ่ม Ready**: ทุกเทิร์นใช้เวลาเต็ม เมื่อหมดเวลาจะเล่น replay และแสดงนับถอยหลัง "Next turn in" เพื่อเริ่มเทิร์นใหม่พร้อมกัน |
| ยอมแพ้ | ปุ่ม Surrender ใช้ได้ทุก phase: ออกทันที ได้อันดับล่างสุดของคนที่ยังอยู่ เกมจบเมื่อเหลือคนเดียวหรือไม่เหลือคนจริง |

ประมาณเกมละ 20–30 นาที. Quick Mode (อนาคต): Recruit 35s คงที่, HP 20

## 2. Recruit Phase
| รายการ | ค่า |
|---|---|
| Energy | เทิร์น 1 = 3, +1 ทุกเทิร์น สูงสุด 10 |
| ซื้อยูนิต | 3 |
| ขายยูนิต | ได้คืน 1 |
| Refresh ร้าน | 1 |
| Freeze ร้าน | 0 (เก็บร้านไว้เทิร์นหน้า) |
| อัป Base Rank 1→2→3→4→5→6 | 5 / 7 / 8 / 9 / 11 — ลดลง 1 ทุกเทิร์นที่ยังไม่อัป |
| ขนาดร้านตาม Rank | 3 / 4 / 4 / 5 / 5 / 6 |
| Board | 7 ช่อง (+ Giant Slot 1 ช่อง ดูข้อ 6) |
| Hand | 10 ใบ |

- **Shared pool** ต่อชนิดยูนิต: R1:16, R2:15, R3:13, R4:11, R5:9, R6:7 — ซื้อแล้ว pool ลด, ขายแล้วคืน pool
- **Triple → Final Form**: ยูนิตเดียวกัน 3 ตัวรวมเป็น Final Form (stat ×2, effect ×2) + ได้ Discover ยูนิต Rank+1 1 ใบ
- ล็อบบี้สุ่มใช้ **5 จาก 7 Faction**

## 3. Battle Phase
- จับคู่สุ่ม ห้ามเจอคู่เดิมใน 3 รอบล่าสุด. ถ้าคนเหลือเป็นเลขคี่ คนที่เกินเจอ **Ghost** (บอร์ดล่าสุดของคนที่ตกรอบไปแล้ว)
- ฝ่ายที่มียูนิตมากกว่าตีก่อน ถ้าเท่ากันสุ่ม
- ผลัดกันตีจากซ้ายไปขวา เลือกเป้าหมายสุ่ม แต่ต้องตี **Guard** ก่อน
- ทั้งสองตัวเสีย HP เท่ากับ ATK ของอีกฝ่าย HP ≤ 0 = ตาย
- จบเมื่อฝ่ายหนึ่งไม่เหลือยูนิต. ผู้ชนะทำดาเมจ = **Base Rank + ผลรวม Rank ยูนิตที่รอด** (cap 15 ในเทิร์น 1–8). เสมอ = ไม่มีดาเมจ
- สนามรบใช้สำเนาบอร์ด ยูนิตที่ตายกลับมาครบในเทิร์นหน้า ยกเว้น effect ที่ระบุว่า "ถาวร"
- ใช้ seeded RNG บน server, client เล่น replay จาก combat log

## 4. Faction
| Faction | ธีม | กลไกเด่น |
|---|---|---|
| **Rider** | ไรเดอร์สวมเข็มขัด | **Henshin**: แปลงร่างเมื่อถึงเงื่อนไข, scaling ตัวเดียว |
| **Sentai** | ทีม 5 สี | **Team-Up**: บัฟตามจำนวนสีไม่ซ้ำบนบอร์ด |
| **Mecha** | หุ่นยนต์/ยาน | **Gattai**: Mecha ≥3 ตัวติดกัน รวมร่างตอนเริ่มสู้ |
| **Kaijin** | สัตว์ประหลาด/ปีศาจ | **Kyodaika**: ตายครั้งแรกฟื้นเป็นร่างยักษ์ |
| **Grunt** | พลทหารองค์กรร้าย | swarm, token, Last Stand เรียกลูกน้อง |
| **Ally** | พลเรือน/ทีม support | economy และ support: ได้ Energy, เพิ่มการ์ดเข้ามือ, บัฟ ally ตอนจบเทิร์น (ลดราคา/บัฟการ์ดในมือ: ยังไม่มีการ์ดที่ทำ) |
| **Dark Rider** | ไรเดอร์ฝ่ายร้าย | sacrifice: Henshin Call ทำลาย ally สุ่ม 1 ตัว แล้วตัวเองได้ stat ตายตัว (ขโมย stat/keyword ของตัวที่ทำลาย: ยังไม่มี action นี้ใน engine) |

ยูนิต 1 ตัวมีได้หลาย Faction หรือเป็น **Neutral**

## 5. Universe → Franchise → Series
มีสองแกนแยกกัน:
- **Faction** = แกน gameplay (คำนวณ synergy)
- **Origin** = แกนธีม: `Universe` (Tokusatsu, Anime) → `Franchise` (Kamen Rider, Super Sentai, …) → `Series` (เช่น Den-O, Gokaiger หรือขบวนการ original)

เพิ่ม anime ทีหลัง = เพิ่ม Universe/Franchise/Series + faction ใหม่ถ้าต้องการ (เช่น Shonen, Magical Girl) และใช้ faction เดิมซ้ำได้ (anime หุ่นยนต์ → Mecha)

### 5.1 Series Template
| ช่อง | Sentai Squad | Rider Series |
|---|---|---|
| Core | 5 สีหลัก (กระจาย Rank 1–4) | Rider หลัก + ร่างย่อย (Henshin chain 2–3 ขั้น) |
| Extra | 6th Ranger (Rank 4–5, wildcard สี) | Rider รอง/คู่หู 1–2 ตัว |
| Mecha | Giant Robo ของขบวนการ (ไม่อยู่ในร้าน) | Machine/Bike (ยูนิต Mecha) |
| Villain | Kaijin 1–2 ตัว | Dark Rider/ตัวร้าย 1–2 ตัว |
| Series Bond | โบนัสเมื่อซีรีส์เดียวกัน ≥2 / ≥4 | เหมือนกัน |
| Signature | กลไกเด่น 1 อย่าง (effect DSL) | เช่น Den-O = สิง (ยืม keyword), W = ยูนิตคู่ |

- Series Bond เล็กกว่า Faction synergy — เล่นข้ามซีรีส์ได้ แต่สะสมซีรีส์เดียวกันได้ "รางวัลแฟน"
- **Featured Series**: แต่ละล็อบบี้สุ่ม 3 ซีรีส์ต่อ franchise ทำให้ pool ไม่บวม
- การ์ด Neutral/original ใช้เติมช่องว่างของ pool

## 6. Giant Robo — Mecha Gauge
โครงเดียวกับตอนในซีรีส์: **รวมทีม → ประกาศชื่อ → สัตว์ประหลาดขยายร่าง → เรียกหุ่น**

1. **Roll Call** — Start of Combat ถ้ามี Sentai **ครบ 5 สีไม่ซ้ำ** (Extra = wildcard) → Sentai ทุกตัว +1/+1 ในการสู้นั้น และ **Mecha Gauge +1**. ถ้าชนะการสู้นั้นได้อีก +1 (สูงสุด +2/เทิร์น)
2. **Gauge ครบ 3** → ได้การ์ด Gear **"Kyodai Gattai!"** ใส่มือ
3. **เล่นการ์ด** → Discover หุ่น 1 จาก 3 — หุ่นของขบวนการที่มีสมาชิกบนบอร์ดมากที่สุดออกแน่นอน 1 ตัวเลือก
4. หุ่นอยู่ใน **Giant Slot** (นอกบอร์ด 7 ช่อง) ถาวร
5. **ตอนสู้** หุ่นลงสนามเมื่อเกิดเหตุการณ์แรก: (ก) ยูนิตเราเหลือ ≤2 ตัว หรือ (ข) ศัตรูเกิด Kyodaika
   - Stat = base หุ่น + ครึ่งหนึ่งของ ATK/HP รวมของ Sentai บนบอร์ดตอนเริ่มสู้
   - **Final Blow**: ตีครั้งแรกดาเมจ ×2 และดาเมจ ×2 ใส่ยูนิตยักษ์/Kyodaika
6. **Super Gattai**: Gauge ถึง 6 + บอร์ดมี Extra Ranger → หุ่นได้ร่างรวมขั้นสูง (stat ↑ + keyword ของหุ่น Extra)

### 6.1 Gauge system กลาง
Gauge นิยามใน DB: `{key, max, sources[] (trigger + condition + amount), thresholds[] (value → reward action)}`
- Sentai → **Mecha Gauge** → Giant Robo
- Rider → **Rider Gauge** (ได้แต้มตอน Henshin) → การ์ด **Ultimate Form**
- Anime (อนาคต) → เช่น **Power-Up Gauge** → ปลดร่าง/ท่าไม้ตาย

## 7. Keywords
| Keyword | เทียบใน HS | ผล |
|---|---|---|
| Guard | Taunt | ศัตรูต้องตีตัวนี้ก่อน |
| Barrier | Divine Shield | กันดาเมจได้ 1 ครั้ง |
| Last Stand | Deathrattle | ทำงานตอนตาย |
| Henshin Call | Battlecry | ทำงานตอนวางจาก hand |
| Rapid | Windfury | ตี 2 ครั้ง |
| Lethal | Poisonous | ทำดาเมจโดน = ตายทันที |
| Revive | Reborn | ฟื้นครั้งเดียว HP 1 |
| Rider Kick | — | การตีครั้งแรกของการสู้ดาเมจ ×2 |
| Henshin(N) | — | อยู่บนบอร์ดครบ N เทิร์น/ถึงเงื่อนไข → แปลงเป็น `transformInto` |
| Team-Up(k) | — | ทำงานเมื่อมีสี Sentai ไม่ซ้ำ ≥ k |
| Gattai | — | ร่วมรวมร่าง Mecha |
| Kyodaika | — | ตายครั้งแรก ฟื้นด้วย stat ×2 แต่ไม่มี keyword อื่น |
| Start of Combat / End of Turn / Avenge(N) | เหมือน HS | trigger มาตรฐาน |

## 8. Hero (ตามที่อยู่ใน prototype set ตอนนี้)
- **Time Traveler** — passive: Refresh ฟรี 1 ครั้งต่อเทิร์น
- **Red Leader** — 2 Energy ต่อเทิร์น: ยูนิตซ้ายสุด +2/+2 (แผนเดิม "ให้ Sentai ได้สีเพิ่ม" ยังทำไม่ได้: ไม่มี action เพิ่มสี)
- **Mecha Commander** — passive: Gattai ใช้แค่ 2 ตัว
- **Kaijin General** — 1 Energy ต่อเทิร์น: ยูนิตซ้ายสุดได้ Kyodaika (ถาวร ไม่ใช่แค่สู้รอบถัดไป)
- **Professor Belt** (original) — 0 Energy ครั้งเดียวต่อเกม: ได้ Street Guardian เข้ามือ (แผนเดิม "Discover Henshin Driver" ยังไม่มีการ์ดนี้)
- **Shocker Boss** — passive: ต้นทุกเทิร์นได้ Recruit (1/1) บนบอร์ด (ถ้าบอร์ดยังไม่เต็ม)
- **Cafe Master** — 1 Energy ต่อเทิร์น: Ally ทุกตัว +1/+1
- **Iron Guard** — ไม่มี power, armor 6

ชุด production มี hero ของตัวเอง (Captain Marvelous, Kyoryu Red, Philip, Ryotaro, Eiji Hino, Professor Belt, Himmapan Guardian, Shocker Boss, Iron Guard) ดูรายละเอียดในแท็บ Library

## 9. Gear / Spell (P1)
Gear (เข็มขัด, อาวุธ, การ์ดแปลงร่าง) ขายในช่องพิเศษของร้าน ใช้ทันทีกับยูนิต — data model รองรับไว้ตั้งแต่แรก

## 10. ตัวอย่างยูนิต Rank 1 (prototype set หลัง balance pass ล่าสุด)
| ชื่อ | Faction | ATK/HP | Effect |
|---|---|---|---|
| Combatant | Grunt | 2/1 | Last Stand: เรียก Recruit 1/1 |
| Red Cadet | Sentai (Red) | 1/3 | Team-Up(2): +2/+2 ตอนเริ่มสู้ |
| Rookie Rider | Rider | 2/2 | Henshin(2) → Rider Form 4/4 Rider Kick |
| Scout Drone | Mecha | 2/2 | Gattai |
| Cafe Owner | Ally | 1/2 | End of Turn: ถ้าเหลือ Energy ≥1 ally สุ่ม +1/+1 |

ค่าทั้งหมดอยู่ใน `packages/content/src/` หรือแก้ในแท็บ Admin. เอกสารนี้อาจตามไม่ทัน: ดูค่าจริงในแท็บ Library

## 11. Launch Series (ชุดแรก)
แต่ละซีรีส์มี Signature ไม่ซ้ำกัน ครอบคลุมกลไกหลักของ engine (copy, stack, keyword grant, merge, attach, combo)

| Franchise | Series | Signature | กลไก |
|---|---|---|---|
| Sentai | **Gokaiger** | Gokai Change | Henshin Call: copy keyword 1 อย่างจาก Sentai ตัวอื่นบนบอร์ด |
| Sentai | **Kyoryuger** | Brave | ตีแล้วศัตรูตาย = ได้ 1 stack, ครบ 3 ได้ +ATK ถาวร; Giant Robo เลือก keyword ตอนเรียก |
| Sentai | **Shinkenger** | Mojikara | Henshin Call: ให้ยูนิตข้างเคียง 1 keyword (Guard / Barrier / Rapid) |
| Rider | **W** | Pair | ยูนิต W 2 ตัวอยู่ติดกัน รวมเป็นตัวเดียวตอนเริ่มสู้ ได้ keyword ของทั้งสองครึ่ง |
| Rider | **Den-O** | Imagin Possession | วาง Imagin ทับยูนิตอื่น ให้ stat + keyword (Imagin ไม่กินช่องบอร์ด) |
| Rider | **OOO** | Medal Combo | สะสม Medal 3 สี, ครบ 3 เหรียญสีเดียวกัน → Combo Form + bonus ตามสี |
| Original | **Himmapan Sentai** (ครุฑ, นาค, คชสีห์, กินรี, หงส์) | Mythic Bond | Last Stand: ส่งพลังให้หุ่นใน Giant Slot (+stat ถาวร) |

- MVP: ~5 ยูนิตต่อซีรีส์ (≈35) + Neutral/Grunt/Kaijin เติม pool
- Hero 6 ตัว, Giant Robo 4 ตัว (1 ต่อขบวนการ Sentai รวม Himmapan)
- Himmapan Sentai ทำหน้าที่ทดสอบด้วยว่าเพิ่ม/เปลี่ยน IP ได้จาก DB โดยไม่แก้ code

---

## 12. Ability DSL (data-driven)
Effect เก็บเป็น JSON ใน DB, engine ตีความ — admin สร้างการ์ดใหม่ได้โดยไม่แก้ code. Schema จริงอยู่ที่ `packages/shared/src/schemas/effect.ts` (zod) ใช้ validate ทั้ง admin editor และ server

```jsonc
{
  "scope": "UNIT",                       // UNIT (ผูกกับยูนิต) | PLAYER (Hero Power, Relic, Series Bond, Gear)
  "trigger": "START_OF_COMBAT",
  "condition": { "type": "TEAM_UP_COLORS_GTE", "value": 3 },
  "target": { "selector": "SELF" },      // + faction / series filter สำหรับ selector ฝั่งเรา
  "actions": [
    { "type": "BUFF", "atk": 2, "hp": 2, "permanent": false },
    { "type": "SUMMON", "cardKey": "grunt_token", "count": 1 }
  ],
  "goldenMultiplier": 2
}
```

### 12.1 Triggers
| ระดับ | Trigger |
|---|---|
| ยูนิต | `ON_PLAY` (Henshin Call), `END_OF_TURN`, `HENSHIN`, `START_OF_COMBAT`, `ON_ATTACK`, `AFTER_DAMAGED`, `LAST_STAND`, `AVENGE` (+ `every`: ทุก N ตัวที่ตาย) |
| ผู้เล่น | `ON_ACQUIRE` (เลือก Relic/Hero), `ON_TURN_START`, `ON_USE` (Hero Power), `START_OF_COMBAT` (Relic/Series Bond), `ON_PLAY` (Gear) |
| แหล่ง Gauge | `ON_ROLL_CALL`, `ON_ROLL_CALL_WIN`, `HENSHIN` |

### 12.2 Conditions / Selectors / Actions
- **Conditions**: `TEAM_UP_COLORS_GTE`, `FACTION_COUNT_GTE`, `SERIES_COUNT_GTE`, `ENERGY_GTE` (ใน combat ไม่มี energy → ไม่ผ่าน)
- **Selectors**: `SELF`, `ADJACENT`, `LEFTMOST_FRIENDLY`, `RIGHTMOST_FRIENDLY`, `RANDOM_FRIENDLY` (**ไม่เลือกตัวเอง**), `ALL_FRIENDLY`, `LEFTMOST_ENEMY`, `RANDOM_ENEMY`, `ALL_ENEMY` (selector ศัตรูใช้ได้เฉพาะใน combat)
- **Actions**: `BUFF`, `SUMMON`, `DAMAGE` (combat เท่านั้น), `GIVE_KEYWORD`, `TRANSFORM`, `DESTROY`, `GAIN_ENERGY`, `GAUGE_ADD`, `MODIFY_RULE`, `ADD_TO_HAND`, `DISCOVER_GIANT`. ยังไม่มี: `STEAL_STATS`, `MERGE`, `COPY_KEYWORD`, `DISCOVER` ทั่วไป (ซีรีส์ Gokaiger/Kyoryuger/W/Den-O/OOO ใช้ตอน content pass: เพิ่ม handler ตามต้องการ)
- action ที่ใช้ได้เฉพาะตอน recruit: `GAIN_ENERGY`, `GAUGE_ADD`, `MODIFY_RULE`, `ADD_TO_HAND`, `DISCOVER_GIANT`

### 12.3 กฎที่ engine บังคับ (ได้จากการทำ + fuzz จริง)
- **Golden**: ตัวเลข `BUFF`/`SUMMON count`/`DAMAGE`/`GAIN_ENERGY`/`GAUGE_ADD` คูณ `goldenMultiplier` (ค่าเริ่มต้น 2) เมื่อ *ยูนิตเจ้าของ* เป็น Final Form
- **Last Stand ทำงานทุกครั้งที่ตาย** รวมครั้งที่ตามด้วย Revive/Kyodaika (ยูนิตที่ฟื้นกลับมา summon ไปทางขวาของตัวเอง; ยูนิตที่ตายจริงๆ summon ลงช่องของมัน). ยูนิตที่ฟื้นจึงมี event DEATH 2 ครั้ง
- **Kyodaika** ใช้ HP สูงสุด ×ตัวคูณ (ไม่ใช่ HP ที่เหลือ), ล้าง keyword, เป็น "ตัวใหญ่" (FINAL_BLOW ตีแรงขึ้น ×2) และทำให้หุ่นฝั่งตรงข้ามลงสนาม
- **FINAL_BLOW**: ตีครั้งแรก ×2 และ ×2 อีกชั้นเมื่อเป้าหมายเป็นตัวใหญ่ (หุ่น/Kyodaika) — ซ้อนกันเป็น ×4
- **ลำดับตี**: ใช้ pointer ที่ปรับตามการเพิ่ม/ลบยูนิตทั้งสองฝั่ง ไม่มีตัวไหนถูกข้ามเมื่อยูนิตทางซ้ายตาย
- **การ์ดที่ effect สร้างและอยู่ใน pool** (`ADD_TO_HAND`, `SUMMON`, `TRANSFORM`, Henshin) ดึง/สลับจาก pool จริง — ถ้า pool ไม่มีให้ ไม่เกิดผล (Henshin รอเทิร์นถัดไป). token/Gear/Giant ไม่อยู่ใน pool จึงไม่กระทบ
- **combat ที่ effect วนไม่รู้จบ** (ตาย→summon→ตาย…) จบเป็นเสมอ ไม่ crash แมตช์
- **Content validation** (ตอน publish): reference ที่ไม่มีอยู่, `MODIFY_RULE` ชื่อกฎที่ไม่มี, Series Bond ที่ไม่ใช่ player-scope `START_OF_COMBAT`, Gear ที่ effect ไม่ใช่ player-scope `ON_PLAY`, การ์ดยูนิตที่มี player-scope effect, รางวัล Gauge ที่ต้องมีเป้าหมาย
- **`MODIFY_RULE`**: กฎที่ปรับได้ = `startEnergy`, `energyPerTurn`, `maxEnergy`, `buyCost`, `sellValue`, `refreshCost`, `boardSize`, `handSize`, `maxRank`, `freeRefreshesPerTurn`, `rollCallColors`, `rollCallBuff`, `gattaiSize`, `giantEntryThreshold`, `giantSentaiScale`, `kyodaikaMultiplier`. Engine อ่านผ่านกฎของผู้เล่นเสมอ ห้าม hardcode
- **Content versioning**: draft → Publish = snapshot ที่ไม่เปลี่ยน, ล็อบบี้ lock เวอร์ชันตอนเริ่มเกม

### 12.4 Gauge / Gear / Giant
- Gauge: `sources` (trigger+amount) + `thresholds` (`at`, `reward` = actions ที่ไม่ต้องมีเป้าหมาย). `once: true` จ่ายครั้งเดียวตอนข้าม; `once: false` จ่ายซ้ำและหัก `at` ทุกครั้ง
- **Gear** = การ์ด `kind: "GEAR"` ในมือ ใช้ด้วย `useGear` (รัน player-scope `ON_PLAY`) ขายไม่ได้ ไม่อยู่ใน pool
- **Giant** = การ์ด `kind: "GIANT"` ไม่อยู่ใน pool; เลือกผ่าน `DISCOVER_GIANT` (3 ตัว, ตัวของซีรีส์ที่มียูนิตบนบอร์ดมากสุดออกแน่นอน) เข้า Giant Slot. ลงสนามเมื่อยูนิตเหลือ ≤ `giantEntryThreshold` หรือศัตรู Kyodaika; ลงได้ครั้งเดียวต่อการสู้

---

## 13. Relic (ระบบสมบัติ)
สมบัติติดตัวผู้เล่นแบบถาวร เลือกกลางเกม (แนว Trinket ของ HS BG)

### 13.1 กฎ
| รายการ | ค่า |
|---|---|
| เทิร์น 5 | เลือก **Lesser Relic** 1 จาก 4 |
| เทิร์น 9 | เลือก **Greater Relic** 1 จาก 4 |
| ราคา | Lesser 0–4 Energy, Greater 0–6 Energy จ่ายตอนเลือก — มีตัวเลือกราคา 0 อย่างน้อย 1 อันเสมอ |
| ถือได้ | สูงสุด 2 (Lesser 1 + Greater 1) ถาวรทั้งเกม ขายไม่ได้ |
| เวลา | เทิร์นที่เลือก Relic, Recruit +10s |
| เลือกไม่ทันเวลา | ได้ตัวเลือกราคา 0 อัตโนมัติ |

**สุ่มตัวเลือก 4 อัน**
1. 1 อันผูกกับ Faction ที่มีมากที่สุดบนบอร์ด
2. 1 อันผูกกับ Series ที่มีบนบอร์ด (ไม่มีก็สุ่มทั่วไป)
3. 2 อันสุ่มทั่วไป

กรองเฉพาะ Faction/Series ที่ล็อบบี้เปิดใช้. ผู้เล่นหลายคนได้รับเสนอและเลือก Relic ชิ้นเดียวกันได้ (ไม่มีการจองชิ้นต่อล็อบบี้). ผู้เล่นคนเดียวถือได้ tier ละ 1 อัน จึงไม่มีทางได้ซ้ำกับตัวเอง. น้ำหนักการสุ่มปรับได้ด้วย `weight`; หมดเวลาจะได้ตัวฟรี.

### 13.2 ประเภท
| ประเภท | ตัวอย่างผล |
|---|---|
| Economy | ได้ Energy, ลดราคา, Refresh ฟรี |
| Shop | ยูนิตในร้าน +stat, การันตี Rank สูง |
| Combat trigger | Start of Combat / Avenge / Last Stand ระดับผู้เล่น |
| Mechanic boost | เสริม Henshin, Team-Up, Gattai, Kyodaika, Gauge |
| Series | เสริม Signature ของซีรีส์ |

### 13.3 Lesser Relic (ชุดแรก)
| Relic | ผูกกับ | ราคา | ผล |
|---|---|---|---|
| Ranger Key | Gokaiger | 2 | Start of Combat: Sentai ซ้ายสุด copy keyword ของ Sentai ขวาสุด |
| Core Medal Set | OOO | 1 | ได้ Medal ทุกสีอย่างละ 1 ทันที |
| Gaia Memory | W | 2 | ยูนิตที่เกิดจาก Pair ได้ +2/+2 |
| Rider Pass | Den-O | 0 | Imagin ราคาลด 1 |
| Shodophone | Shinkenger | 2 | Mojikara ให้ Lethal เป็นตัวเลือกได้ด้วย |
| Brave Battery | Kyoryuger | 1 | ยูนิต Kyoryuger ทุกตัวเริ่มด้วย Brave 1 stack |
| Grunt Whistle | Grunt | 1 | Last Stand ที่เรียก Grunt เรียกเพิ่มอีก 1 |
| Base Café Coupon | Ally | 0 | ทุกๆ 3 เทิร์น +1 Energy |
| Training Bracelet | ทั่วไป | 3 | ยูนิตในร้าน +1/+1 |

### 13.4 Greater Relic (ชุดแรก)
| Relic | ผูกกับ | ราคา | ผล |
|---|---|---|---|
| Prototype Driver | Rider | 4 | Henshin(N) ทำงานเร็วขึ้น 1 เทิร์น |
| Mecha Gauge Core | Sentai/Mecha | 3 | Mecha Gauge +2 ทันที, Giant Robo ลงสนามเมื่อเหลือ ≤3 ตัว |
| Garuda Feather | Himmapan | 4 | Giant Robo ได้ Revive |
| Kaijin Cell | Kaijin | 3 | Kyodaika ฟื้นด้วย stat ×3 แทน ×2 |
| Dark Contract | Dark Rider | 2 | Sacrifice แล้วได้ Energy +1 |
| Universal Belt | ทั่วไป | 6 | ทุกครั้งที่ Refresh มียูนิต Rank เท่ากับ Base Rank ของเรา ≥1 ตัวในร้าน |
| Team Spirit Banner | Sentai | 4 | Roll Call ใช้แค่ 4 สี |

### 13.5 อื่นๆ
- เขียนผลด้วย Ability DSL (owner scope `PLAYER`) — ส่วนใหญ่ใช้ `MODIFY_RULE` หรือ trigger ระดับผู้เล่น
- Bot เลือก Relic ที่ตรง faction หลักก่อน ถ้า Energy ไม่พอเลือกตัวราคา 0
- ผู้เล่นทุกคนเห็น Relic ของคนอื่นใน leaderboard

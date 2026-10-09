# HeroTime — Game Rules

ตัวเลขเป็นค่าเริ่มต้นของ engine · หลายค่าเปลี่ยนได้ใน Admin → Rules (ดู [ADMIN_GUIDE.md](ADMIN_GUIDE.md) ข้อ 9) · ค่าจริงของการ์ดดูในหนังสือการ์ด หรือ [CARD_SET_V1.md](CARD_SET_V1.md)

## 1. ภาพรวม
- ล็อบบี้ 8 คน ไม่ครบ bot เติม · เลือก **Hero** 1 จาก 2: HP 30 + Armor (ตาม Hero) + **Hero Power**
- แต่ละเทิร์น: **Recruit** (ซื้อ/จัดทัพ) → **Battle** (สู้อัตโนมัติ)
- HP ≤ 0 = ตกรอบ · อันดับตามลำดับที่ตกรอบ · คนสุดท้ายชนะ
- ยอมแพ้ได้ทุก phase: ได้อันดับล่างสุดของคนที่ยังอยู่ · เกมจบเมื่อเหลือคนเดียวหรือไม่เหลือคนจริง

| ช่วง | เวลา |
|---|---|
| เลือก Hero | 30s |
| Recruit | เทิร์น 1 = 40s, +5s ต่อเทิร์น สูงสุด 75s · เทิร์นเลือก Relic +10s · ไม่มีปุ่ม Ready |
| Battle | 20s: replay (fight ยาวเร่งให้จบในเวลา, กดเร่ง/Skip ได้) แล้วนับถอยหลังเข้าเทิร์นถัดไป |

**Quick Mode**: Recruit 35s ทุกเทิร์น, HP 20, คิวแยก, ไม่นับอันดับ

## 2. Recruit
| รายการ | ค่า |
|---|---|
| Energy | เทิร์น 1 = 3, +1 ต่อเทิร์น สูงสุด 10 (ไม่สะสมข้ามเทิร์น) |
| ซื้อ / ขาย / Refresh / Freeze | 3 / ได้คืน 1 / 1 / 0 |
| อัป Base Rank 1→6 | 5 / 7 / 8 / 9 / 11 ลดลง 1 ทุกเทิร์นที่ยังไม่อัป |
| ขนาดร้านตาม Rank | 3 / 4 / 4 / 5 / 5 / 6 ยูนิต + Gear 1 ช่อง |
| Board / Hand | 7 (+ Giant Slot) / 10 |

- **Freeze**: การ์ดที่แช่อยู่ต่อ ช่องที่ซื้อไปเติมใหม่ตอนเริ่มเทิร์น
- **Shared pool** ต่อชนิด: R1 16, R2 15, R3 13, R4 11, R5 9, R6 7 · ซื้อแล้วลด ขายแล้วคืน (แก้ใน Admin ไม่ได้)
- **การ์ดของ Hero**: การ์ดซีรีส์เดียวกับ Hero หรือที่ Hero Power ระบุชื่อ สุ่มเจอบ่อยขึ้น `heroCardWeight` เท่า (ค่าเริ่ม 2) ไม่เพิ่มจำนวนใน pool
- **Triple**: ยูนิตเดียวกัน 3 ตัว → ร่างทอง (stat ×2, effect ×2) + Discover ยูนิต Rank+1 · รวมทันทีไม่ว่าใบที่ 3 มาทางไหน
- เผ่าในล็อบบี้: สุ่ม 5 เผ่าจากเผ่าที่เปิดและมียูนิตในร้าน

## 3. Battle
- จับคู่สุ่มตอน**เริ่ม Recruit** (บอกทุกคน) ห้ามเจอคู่เดิมใน 3 รอบล่าสุด · คนเหลือคี่ คนที่เกินเจอ **Ghost** (บอร์ดล่าสุดของคนที่ตกรอบ) · มีคนออกก่อนสู้ = จับคู่ใหม่
- ฝ่ายที่มียูนิตมากกว่าตีก่อน (เท่ากันสุ่ม) · ผลัดกันตีจากซ้ายไปขวา เป้าสุ่ม แต่ต้องตี **Guard** ก่อน
- ทั้งสองตัวเสีย HP เท่า ATK อีกฝ่าย · จบเมื่อฝ่ายหนึ่งไม่เหลือยูนิต
- ผู้ชนะทำดาเมจ = **Base Rank + ผลรวม Rank ยูนิตที่รอด** (cap 15 ในเทิร์น 1–8) · เสมอ = ไม่มีดาเมจ
- สนามรบใช้สำเนาบอร์ด ยูนิตที่ตายกลับมาเทิร์นหน้า ยกเว้นผลที่ระบุ "ถาวร"
- seeded RNG บน server, client เล่น replay จาก log

## 4. Faction และ Series
- **Faction** = แกน gameplay (synergy) · ยูนิตมีได้หลายเผ่าหรือไม่มีเผ่า (มีทุกเกม) · แนวแต่ละเผ่าดู [FACTIONS.md](FACTIONS.md)
- **Series** = แกนธีม: `Universe` (tokusatsu / anime) → `Franchise` → `Series`
- **Series Bond**: โบนัสเมื่อมีการ์ดซีรีส์เดียวกันครบ N ใบ (ชุดปัจจุบันยังไม่มี)
- **Featured Series**: franchise ที่มีเกิน 3 ซีรีส์ สุ่มใช้ 3 ต่อล็อบบี้

## 5. Giant Robo (Mecha Gauge)
1. **Roll Call** — เริ่มการต่อสู้ ถ้ามี Sentai สีไม่ซ้ำครบ `rollCallColors` (ชุดปัจจุบัน 3, Extra = wildcard) → Sentai ทุกตัว +1/+1 ในการสู้นั้น และ Mecha Gauge +1 · ชนะการสู้นั้น +1 อีก
2. **Gauge 3** → การ์ด **Kyodai Gattai!** → Discover หุ่น 1 จาก 3 (หุ่นของซีรีส์ที่มีบนบอร์ดมากสุดออกแน่นอน · ไม่มีร่างอัปเกรด) → อยู่ใน **Giant Slot** ถาวร
3. **ตอนสู้** หุ่นลงสนามครั้งเดียว เมื่อยูนิตเราเหลือ ≤ `giantEntryThreshold` (2) หรือศัตรูเกิด Kyodaika
   - Stat = base + `giantSentaiScale` × ATK/HP รวมของ Sentai บนบอร์ดตอนเริ่มสู้ (ชุดปัจจุบัน 0.5)
   - **Final Blow**: ตีครั้งแรก ×2 และ ×2 อีกชั้นใส่ตัวใหญ่ (หุ่น/Kyodaika) รวม ×4
4. **Gauge 6** → Super Gattai: การสู้ที่บอร์ดมี Extra Ranger หุ่น +4/+4 และได้ keyword ของ Extra Ranger · ชุดปัจจุบันได้การ์ด Final Form ด้วย ใช้กับหุ่นที่มีร่างอัปเกรด (`ultimateInto`) ได้ → เช่น King-Ohger → God King-Ohger

Gauge อื่นใช้ระบบเดียวกัน (`sources` + `thresholds`) เช่น **Rider Gauge**: +1 ทุก Henshin ทุก 3 แต้มได้การ์ด Final Form · **มือเต็ม 10 ใบตอนได้รางวัล = การ์ดรางวัลหาย** (รางวัลครั้งเดียวต่อเกมจะไม่ได้อีก) ผู้เล่นต้องเว้นที่ในมือเอง

## 6. Keywords
| Keyword | เทียบ HS | ผล |
|---|---|---|
| Guard | Taunt | ศัตรูต้องตีตัวนี้ก่อน |
| Barrier | Divine Shield | กันดาเมจ 1 ครั้ง |
| Last Stand | Deathrattle | ทำงานตอนตาย (ทุกครั้งที่ตาย รวมก่อน Revive/Kyodaika) |
| Deploy | Battlecry | ทำงานตอนลงจากมือ |
| Rapid | Windfury | ตี 2 ครั้ง |
| Lethal | Poisonous | ทำดาเมจโดน = ตาย |
| Revive | Reborn | ฟื้นครั้งเดียว HP 1 |
| Echo | Brann | ระหว่างอยู่บนบอร์ด Deploy ของการ์ดที่ลงทีหลังทำงาน 2 ครั้ง |
| Power Strike | — | ตีครั้งแรกของการสู้ ×2 · บนการ์ด Rider แสดงเป็น **Rider Kick** (key `RIDER_KICK`) |
| Henshin(N) | — | อยู่บนบอร์ดครบ N เทิร์น → แปลงเป็น `henshin.into` ตอนจบเทิร์น (บัฟติดไป) |
| Team-Up(k) | — | ทำงานเมื่อมีสี Sentai ไม่ซ้ำ ≥ k · Extra นับแทนสีที่ขาดได้ 1 สี |
| Gattai | — | core (`gattaiInto`) ซ้ายสุด + ชิ้น Gattai ติดกันครบ `gattaiSize` → กด Combine ช่วงซื้อของ รวมถาวร (stat ร่าง + ผลรวมชิ้นส่วน, keyword ทั้งหมด) รวมได้ชั้นเดียว |
| Kyodaika | — | ตายครั้งแรก ฟื้นด้วย HP สูงสุด ×2 (`kyodaikaMultiplier`) ไม่มี keyword อื่น นับเป็นตัวใหญ่ |
| Final Blow | — | ของ Giant Robo (ดูข้อ 5) |

## 7. Gear
- ร้านมี Gear 1 ใบเสมอ: สุ่มจาก Gear rank ≤ rank ร้าน ของเผ่าในล็อบบี้หรือไม่มีเผ่า · ไม่อยู่ใน pool (หลายคนได้ใบเดียวกันได้)
- ราคาของแต่ละใบ: `ENERGY` หรือ `HEALTH` (จ่ายจาก HP, ต้องเหลือ ≥ 1, เกราะไม่ช่วย)
- ซื้อแล้วเข้ามือ กด **Use** (ผลช่วงซื้อของจึงถาวร) · ขายได้เฉพาะตอนที่ยังใช้ไม่ได้
- **เลือกเป้าหมาย** (`CHOSEN_FRIENDLY`): ลากไปวางบนยูนิต หรือ Use แล้วคลิก · มีตัวเดียวที่ใช้ได้ = เลือกให้ · Gear หลายผลใช้กับยูนิตที่เข้า**ผลใดผลหนึ่ง** ผลที่ไม่เข้าถูกข้าม (เช่น Capsem: Rider ทุกตัวได้บัฟ แปลงร่างเฉพาะ Zeztz) · การ์ด Final Form (`ULTIMATE_FORM`) เลือกหุ่นในช่อง Giant ได้ด้วย (ลากไปวางหรือคลิกที่หุ่น) · นอก Gear `CHOSEN_FRIENDLY` = ซ้ายสุด
- Gear จาก Gauge (Kyodai Gattai!) ไม่ขายในร้าน

## 8. Relic
| รายการ | ค่า |
|---|---|
| เทิร์น 5 / 9 | เลือก Lesser / Greater 1 จาก 4 |
| ราคา | Energy จ่ายตอนเลือก มีตัวราคา 0 อย่างน้อย 1 อันเสมอ · หมดเวลาได้ตัวฟรี |
| ถือได้ | Lesser 1 + Greater 1 ถาวร ขายไม่ได้ |
| ตัวเลือก | 1 อันตรงเผ่าที่มีมากสุดบนบอร์ด, 1 อันตรงซีรีส์บนบอร์ด (ไม่มีก็สุ่ม), 2 อันสุ่ม · เฉพาะเผ่า/ซีรีส์ในล็อบบี้ · สุ่มตาม `weight` · หลายคนเลือกชิ้นเดียวกันได้ |

## 9. Ability DSL — กฎที่ engine บังคับ
Effect เป็น JSON (`packages/shared/src/schemas/effect.ts`) = trigger + condition + target + actions · รายการ trigger / selector / action และวิธีตั้งดู [ADMIN_GUIDE.md](ADMIN_GUIDE.md) ข้อ 6

- **Golden**: ตัวเลข BUFF / SUMMON count / DAMAGE / GAIN_ENERGY / GAUGE_ADD คูณ `goldenMultiplier` (2) เมื่อยูนิตเจ้าของเป็นร่างทอง
- **รางวัลหลังสู้**: GAIN_ENERGY, ADD_TO_HAND, RANDOM_CARD, DISCOVER_UNIT, GAUGE_ADD, BUFF_SHOP, BUFF_GEAR ใน trigger ช่วงต่อสู้ ได้ตอนเริ่มเทิร์นหน้า (หลังเติม Energy ก่อน `ON_TURN_START`)
- action ช่วงซื้อของที่เหลือ (MODIFY_RULE, DISCOVER_GIANT, SUPER_GATTAI, ULTIMATE_FORM, DEVOUR_SHOP, DISCARD) ใช้ตอนสู้ไม่ได้ · DAMAGE / เป้าศัตรูใช้ได้เฉพาะตอนสู้ · `ALLY_SUMMONED` เกิดทั้งสองช่วง ใช้ได้แค่ action ที่ทำงานทั้งคู่ — Save แล้วระบบเตือน
- **HENSHIN** trigger รัน effect ของใบก่อนแปลงกับร่างใหม่ · ร่างใหม่ไม่รัน HENSHIN ของตัวเอง
- **กรองชื่อการ์ด** (`target.cards`, `HAS_CARD`) นับร่างที่แปลงแล้ว (`henshin.into`, `ultimateInto`, `formOf` ไล่ต่อได้หลายขั้น) ไม่นับ Gattai
- **ค่าติดลบใส่ศัตรู** หยุดที่ ATK 0 / HP 1 ไม่ฆ่า · "ถาวร" มีผลกับยูนิตฝั่งตัวเองเท่านั้น
- **การ์ดที่ effect สร้างและอยู่ใน pool** (ADD_TO_HAND, SUMMON, TRANSFORM, Henshin) ดึงจาก pool จริง ไม่มีให้ = ไม่เกิดผล · token / Gear / Giant ไม่อยู่ใน pool · สำเนาจาก COPY ไม่ดึงจาก pool และขายแล้วไม่คืน
- **ลำดับตี** ปรับตามการเพิ่ม/ลบยูนิต ไม่มีตัวถูกข้าม
- **กันวนไม่รู้จบ**: ค่าพลังไม่เกิน 999,999 · การสู้สร้างยูนิตได้ ≤ 100 ตัว เกิน = เสมอ · ปฏิกิริยา "เมื่อเรียกยูนิต" ช่วงซื้อของซ้อนได้ 8 ชั้น
- **`limit`** ต่อเทิร์น/ต่อเกม นับแยกต่อยูนิต (หรือต่อ Relic/Hero/Gear) ตอนสู้นับต่อการสู้ · **`repeat`** 1–5 ครั้งต่อการเกิด
- **`MODIFY_RULE`** ใช้ได้กับ: startEnergy, energyPerTurn, maxEnergy, buyCost, sellValue, refreshCost, boardSize, handSize, maxRank, freeRefreshesPerTurn, rollCallColors, rollCallBuff, gattaiSize, giantEntryThreshold, giantSentaiScale, kyodaikaMultiplier · engine อ่านกฎผ่านผู้เล่นเสมอ
- **Content validation** ตอน Save/Publish: reference ที่ไม่มีอยู่, ชื่อกฎผิด, scope/trigger ผิดชนิด (Gear = PLAYER `ON_PLAY`, Bond = PLAYER `START_OF_COMBAT`), รางวัล Gauge ที่ต้องมีเป้า, ปิดทุก Hero / ทุกเผ่า

# Prompt สร้างภาพการ์ดที่ยังขาด

ตอนนี้ขาดแค่เผ่า **Human** (ปิดอยู่) ใช้ตอนจะเปิดเผ่านี้

ใช้กับ model สร้างภาพตัวไหนก็ได้ (Midjourney, SDXL, Flux, DALL·E ฯลฯ) · prompt เป็นภาษาอังกฤษเพราะ model ส่วนใหญ่เข้าใจดีกว่า
ตั้งชื่อไฟล์ตาม key แล้ววางในโฟลเดอร์ภาพเดิม (`C:\Users\SilSea\Pictures\herotime\<เผ่า>\...`) จากนั้นอัปโหลดใน Admin แล้วปรับกรอบด้วย "ปรับภาพในการ์ด"

## สไตล์ร่วม (ต่อท้ายทุก prompt ให้ภาพทั้งชุดเข้ากัน)

```
, tokusatsu trading card game art, dynamic heroic composition, bold clean shapes, dramatic rim lighting, saturated colors, subject centered with space around it, detailed digital painting, no text, no letters, no logo, no watermark, no card frame, no border
```

**Negative prompt** (ถ้า model รองรับ):
```
text, letters, words, logo, watermark, signature, card frame, border, blurry, lowres, extra limbs, deformed hands, cropped head
```

**ขนาด**
| ชนิด | ขนาดแนะนำ | เหตุผล |
|---|---|---|
| การ์ดยูนิต / token / Gear | 1024×1024 (1:1) | กรอบการ์ดกว้างกว่าสูง ส่วนบนบอร์ดเป็นวงรีแนวตั้ง ภาพจัตุรัสครอปได้ทั้งสองแบบ |
| Hero | 1024×1024 วางหน้าไว้กลางภาพ | กรอบ Hero เป็นวงกลม |
| Relic | 1024×1024 วัตถุชิ้นเดียวกลางภาพ พื้นหลังเรียบ | แสดงเป็นไอคอนเล็ก |

---

## Human — 24 ภาพ

**การ์ด**
| key | การ์ด | Prompt |
|---|---|---|
| `street_vendor` | Street Vendor | `a cheerful street food vendor at a night market stall, apron and headband, steam rising from grilled skewers, lanterns glowing behind` |
| `intern_researcher` | Intern Researcher | `a nervous young lab intern in an oversized white coat carrying a stack of gadgets and a glowing prototype device, high-tech lab background` |
| `volunteer` | Volunteer | `a friendly city volunteer in a bright safety vest handing out supply boxes, sleeves rolled up, smiling, emergency shelter background` |
| `shop_manager` | Shop Manager | `a confident shop manager behind a counter of hero action figures and gear, arms crossed, warm shop lights` |
| `field_scout` | Field Scout | `a field scout in rugged gear looking through binoculars from a rooftop, wind blowing a scarf, city skyline at dawn` |
| `mechanic` | Mechanic | `a grease-stained mechanic with goggles tuning a glowing hero gadget on a workbench, sparks from a welding tool` |
| `banker` | Banker | `a sharp banker in a tailored suit counting glowing energy coins at a marble desk, vault door behind` |
| `quartermaster` | Quartermaster | `a stern quartermaster checking a clipboard in a supply depot full of crates and gear, forklift and shelves behind` |
| `recruiter` | Recruiter | `an energetic recruiter pointing forward with a tablet showing candidate profiles, defense force banners behind` |
| `mayor` | Mayor | `a dignified city mayor at a podium with a sash, waving to a crowd, city hall and flags behind` |
| `arms_dealer` | Arms Dealer | `a mysterious arms dealer opening a briefcase full of glowing hero weapons in a dim alley, neon reflections` |
| `tycoon` | Tycoon | `a powerful business tycoon in a penthouse office overlooking the city at night, gold accents, holding a glowing coin` |
| `defense_commander` | Defense Commander | `a battle-hardened defense force commander in a command uniform giving orders in a war room, holographic city map` |
| `president` | President | `a resolute president addressing the nation from a grand balcony, flags and spotlights, crowd below` |

**Gear**
| key | การ์ด | Prompt |
|---|---|---|
| `supply_crate` | Supply Crate | `a sturdy military supply crate with its lid open, glowing energy cells and coins inside, plain dark background` |
| `med_kit` | Med Kit | `a high-tech first aid kit opened, glowing healing vials and bandages, soft green light, plain dark background` |
| `contract` | Contract | `a glowing signed contract scroll with a wax seal and a fountain pen, floating sparks, plain dark background` |

**Hero** (ภาพครึ่งตัว หน้าอยู่กลางภาพ)
| key | Hero | Prompt |
|---|---|---|
| `hero_h_merchant` | Guild Merchant | `portrait of a shrewd guild merchant with a fur-trimmed coat, rings on his fingers, a ledger under one arm, market banners behind` |
| `hero_h_mayor` | City Mayor | `portrait of a charismatic city mayor in a suit with a mayoral sash, confident smile, city skyline behind` |
| `hero_h_banker` | Central Banker | `portrait of a calm central banker with silver hair and glasses, pinstripe suit, golden coins floating around` |
| `hero_h_general` | Defense General | `portrait of a scarred defense force general in armored uniform with medals, determined stare, burning city behind` |

**Relic** (วัตถุชิ้นเดียว พื้นหลังเรียบ)
| key | Relic | Prompt |
|---|---|---|
| `relic_rl_savings_bond` | Savings Bond | `an ornate savings bond certificate with gold seal and ribbon, faint glow, plain dark background` |
| `relic_rl_coupon_book` | Coupon Book | `a thick colorful coupon booklet with torn tickets fluttering out, plain dark background` |
| `relic_rl_city_grant` | City Grant | `an official city grant document with a large city emblem stamp and a stack of coins, plain dark background` |

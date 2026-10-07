import type { Action, CardDef, Condition, Effect, HeroDef, KeywordKey, RelicDef, Target, Trigger } from "@herotime/shared";
import type { Names } from "./text.js";

/**
 * Thai rules text, generated from the same effects as the English text (text.ts). Keyword and trigger names
 * that are printed on cards stay in English so both languages point at the same chips.
 */

const KEYWORD: Record<KeywordKey, string> = {
  GUARD: "Guard",
  BARRIER: "Barrier",
  RAPID: "Rapid",
  LETHAL: "Lethal",
  REVIVE: "Revive",
  RIDER_KICK: "Rider Kick",
  FINAL_BLOW: "Final Blow",
  KYODAIKA: "Kyodaika",
  GATTAI: "Gattai",
  ECHO: "Echo",
};

const TRIGGER: Record<Trigger, string> = {
  ON_PLAY: "Deploy",
  END_OF_TURN: "จบเทิร์น",
  HENSHIN: "เมื่อแปลงร่าง",
  START_OF_COMBAT: "เริ่มการต่อสู้",
  ON_ATTACK: "เมื่อโจมตี",
  AFTER_DAMAGED: "เมื่อโดนดาเมจแล้วยังรอด",
  LAST_STAND: "Last Stand",
  AVENGE: "Avenge",
  ALLY_SUMMONED: "เมื่อเรียกยูนิตเข้าสนาม",
  ON_SELL: "เมื่อถูกขาย",
  ON_DISCARD: "เมื่อถูกทิ้ง",
  ON_ACQUIRE: "เมื่อได้รับ",
  ON_TURN_START: "ต้นทุกเทิร์น",
  ON_USE: "เมื่อใช้",
  ON_ROLL_CALL: "เมื่อเกิด Roll Call",
  ON_ROLL_CALL_WIN: "เมื่อชนะการต่อสู้ที่เกิด Roll Call",
};

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

function who(t: Target | undefined, names: Names): string {
  const filter = [t?.faction, t?.series].filter((x): x is string => !!x).map(names).join(" ");
  const one = filter ? `ยูนิต ${filter} ` : "พันธมิตร";
  const many = filter ? `ยูนิต ${filter} ทุกตัว` : "พันธมิตรทุกตัว";
  if (t?.cards) {
    // การ์ดที่ระบุชื่อ: "Agent Number 7 หรือ Kamen Rider Zeztz"
    const list = `ยูนิต ${[filter, t.cards.map(names).join(" หรือ ")].filter(Boolean).join(" ")}`;
    switch (t.selector) {
      case "LEFTMOST_FRIENDLY": return `${list} ตัวซ้ายสุด`;
      case "RIGHTMOST_FRIENDLY": return `${list} ตัวขวาสุด`;
      case "RANDOM_FRIENDLY": return `${list} ตัวอื่นแบบสุ่ม 1 ตัว`;
      case "ALL_FRIENDLY": return `${list} ทุกตัว`;
      case "CHOSEN_FRIENDLY": return `${list} ที่เลือก`;
      default: break;
    }
  }
  switch (t?.selector ?? "SELF") {
    case "SELF": return "ตัวนี้";
    case "ADJACENT": return "ยูนิตที่อยู่ข้างๆ";
    case "LEFTMOST_FRIENDLY": return `${one}ซ้ายสุด`;
    case "RIGHTMOST_FRIENDLY": return `${one}ขวาสุด`;
    case "RANDOM_FRIENDLY": return `${one}อื่นแบบสุ่ม 1 ตัว`;
    case "ALL_FRIENDLY": return many;
    case "SUMMONED": return "ตัวที่ถูกเรียก";
    case "GIANT_SLOT": return "Giant Robo ของเรา";
    case "CHOSEN_FRIENDLY": return filter ? `ยูนิต ${filter} ที่เลือก` : "พันธมิตรที่เลือก";
    case "LEFTMOST_ENEMY": return "ศัตรูซ้ายสุด";
    case "RANDOM_ENEMY": return "ศัตรูแบบสุ่ม 1 ตัว";
    case "ALL_ENEMY": return "ศัตรูทุกตัว";
  }
}

function condition(c: Condition | undefined, names: Names): string {
  if (!c) return "";
  switch (c.type) {
    case "TEAM_UP_COLORS_GTE": return `ถ้ามี Sentai ${c.value} สีขึ้นไป `;
    case "FACTION_COUNT_GTE": return `ถ้ามียูนิต ${names(c.faction)} ${c.value} ตัวขึ้นไป `;
    case "SERIES_COUNT_GTE": return `ถ้ามียูนิต ${names(c.series)} ${c.value} ตัวขึ้นไป `;
    case "ENERGY_GTE": return `ถ้ามี Energy ${c.value} ขึ้นไป `;
    case "HAS_CARD": return `ถ้ามี ${c.cards.map(names).join(" หรือ ")} `;
  }
}

function action(a: Action, target: Target | undefined, names: Names): string {
  const t = who(target, names);
  switch (a.type) {
    case "BUFF": {
      const stats = `${signed(a.atk)}/${signed(a.hp)}`;
      const own = a.fromSelf ? (a.atk || a.hp ? `ได้ ATK/HP เท่าตัวนี้ ${stats}` : "ได้ ATK/HP เท่าตัวนี้") : stats;
      return `ให้${t} ${own}${a.permanent ? " ถาวร" : ""}`;
    }
    case "COPY": return a.to === "HAND" ? `ได้สำเนาของ${t}เข้ามือ${a.withBuffs ? " (รวมบัฟ)" : ""}` : `เรียกสำเนาของ${t}${a.withBuffs ? " (รวมบัฟ)" : ""}`;
    case "CONSUME_ALLIES": return `ทำลายยูนิตอื่นของเราทั้งหมด แล้วให้${t}ได้ ATK/HP รวมของพวกมัน${a.permanent ? " ถาวร" : ""}`;
    case "SUMMON": return `เรียก ${names(a.cardKey)}${a.count > 1 ? ` ${a.count} ตัว` : ""}`;
    case "DAMAGE": return `ทำดาเมจ ${a.amount} ใส่${t}`;
    case "GIVE_KEYWORD": return `ให้${t}ได้ ${KEYWORD[a.keyword]}`;
    case "TRANSFORM": return `เปลี่ยน${t}เป็น ${names(a.into)}`;
    case "DESTROY": return `ทำลาย${t}`;
    case "GAIN_ENERGY": return `ได้ ${a.amount} Energy`;
    case "GAUGE_ADD": return `เพิ่ม ${a.gauge} gauge ${a.amount}`;
    case "MODIFY_RULE": return ruleTextTh(a.rule, a.op, a.value);
    case "ADD_TO_HAND": return `ได้ ${names(a.cardKey)} เข้ามือ`;
    case "DISCOVER_GIANT": return "เลือกรับ Giant Robo";
    case "SUPER_GATTAI": return `Super Gattai: การต่อสู้ที่มี Extra Ranger บนบอร์ด Giant Robo ได้ +${a.atk}/+${a.hp} และ keyword ของ Extra Ranger`;
    case "RANDOM_CARD": return `ได้${a.cardKind === "GEAR" ? " Gear" : "ยูนิต"}${a.faction ? ` ${names(a.faction)}` : ""}แบบสุ่มเข้ามือ`;
    case "ULTIMATE_FORM": return `เปลี่ยน${t}เป็นร่าง Ultimate`;
    case "BUFF_SHOP": return `ยูนิตในร้านได้ ${signed(a.atk)}/${signed(a.hp)} จนจบเกม`;
    case "BUFF_GEAR": return `Gear ที่ให้ค่าพลังให้เพิ่มอีก ${signed(a.atk)}/${signed(a.hp)} จนจบเกม`;
    case "DEVOUR_SHOP": return `กลืนกินยูนิต${a.faction ? ` ${names(a.faction)}` : ""}ในร้าน${a.choose === "STRONGEST" ? "ที่ค่าพลังมากสุด" : a.choose === "WEAKEST" ? "ที่ค่าพลังน้อยสุด" : "แบบสุ่ม"} แล้วให้ค่าพลังของมันกับ${t}`;
    case "DISCARD": {
      const what = a.cardKind === "GEAR" ? "Gear" : a.cardKind === "UNIT" ? "ยูนิต" : "การ์ด";
      const which = a.pick === "LEFTMOST" ? "ซ้ายสุด" : a.pick === "RIGHTMOST" ? "ขวาสุด" : "แบบสุ่ม";
      return `ทิ้ง${what}${which}ในมือ${a.count > 1 ? ` ${a.count} ใบ` : ""}`;
    }
    case "SUMMON_FROM_HAND": return `เรียกยูนิตจากมือ${a.count > 1 ? ` ${a.count} ตัว` : ""}`;
    case "DISCOVER_UNIT": return a.faction ? `เลือกรับยูนิต ${names(a.faction)} 1 จาก 3` : "เลือกรับยูนิต 1 จาก 3";
  }
}

const RULE_LABEL: Record<string, string> = {
  startEnergy: "Energy เริ่มต้น",
  energyPerTurn: "Energy ที่ได้เพิ่มต่อเทิร์น",
  maxEnergy: "Energy สูงสุด",
  buyCost: "ราคาซื้อยูนิต",
  sellValue: "Energy ที่ได้จากการขาย",
  refreshCost: "ราคา Refresh",
  boardSize: "ขนาดบอร์ด",
  handSize: "ขนาดมือ",
  maxRank: "rank สูงสุด",
  freeRefreshesPerTurn: "Refresh ฟรีต่อเทิร์น",
  rollCallColors: "จำนวนสีที่ Roll Call ต้องใช้",
  rollCallBuff: "โบนัสจาก Roll Call",
  gattaiSize: "จำนวนยูนิตที่ Gattai ต้องใช้",
  giantEntryThreshold: "จำนวนยูนิตที่เหลือตอน Giant Robo ลงสนาม",
  giantSentaiScale: "สัดส่วน stat Sentai ที่ Giant Robo ได้",
  kyodaikaMultiplier: "ตัวคูณ stat ของ Kyodaika",
};

export function ruleTextTh(rule: string, op: "SET" | "ADD" | "MUL", value: number): string {
  if (op === "SET") {
    switch (rule) {
      case "freeRefreshesPerTurn": return `Refresh ฟรี ${value} ครั้งต่อเทิร์น`;
      case "gattaiSize": return `Gattai ใช้แค่ ${value} ตัวที่ติดกัน`;
      case "rollCallColors": return `Roll Call ใช้แค่ ${value} สี`;
      case "giantEntryThreshold": return `Giant Robo ลงสนามเมื่อยูนิตเหลือ ${value} ตัวหรือน้อยกว่า`;
      case "kyodaikaMultiplier": return `Kyodaika ฟื้นด้วย stat x${value}`;
    }
  }
  const label = RULE_LABEL[rule] ?? `กฎ "${rule}"`;
  if (op === "SET") return `${label} เป็น ${value}`;
  if (op === "ADD") return `${label} ${value >= 0 ? "+" : ""}${value}`;
  return `${label} x${value}`;
}

const FIGHT_TRIGGERS = new Set(["START_OF_COMBAT", "ON_ATTACK", "AFTER_DAMAGED", "LAST_STAND", "AVENGE"]);
const LATER = new Set(["GAIN_ENERGY", "ADD_TO_HAND", "RANDOM_CARD", "DISCOVER_UNIT", "GAUGE_ADD", "BUFF_SHOP", "BUFF_GEAR"]);

export function effectTextTh(e: Effect, names: Names): string {
  const trigger = e.trigger === "AVENGE" ? `Avenge (${e.every ?? 1})` : TRIGGER[e.trigger];
  // In a fight, Energy / cards / Gauge are earned for the start of the next turn.
  const later = (a: Effect["actions"][number]): string => (FIGHT_TRIGGERS.has(e.trigger) && (LATER.has(a.type) || (a.type === "COPY" && a.to === "HAND")) ? " ในเทิร์นหน้า" : "");
  const body = e.actions.map((a) => action(a, e.target, names) + later(a)).join(" แล้ว");
  const limit = e.limit ? (e.limit.times === 1 ? ` (${e.limit.per === "TURN" ? "เทิร์นละครั้ง" : "ครั้งเดียวต่อเกม"})` : ` (ไม่เกิน ${e.limit.times} ครั้งต่อ${e.limit.per === "TURN" ? "เทิร์น" : "เกม"})`) : "";
  const text = `${trigger}: ${condition(e.condition, names)}${body}${e.repeat && e.repeat > 1 ? ` (${e.repeat} ครั้ง)` : ""}${limit}`;
  return e.goldenMultiplier && e.goldenMultiplier !== 2 ? `${text} (Golden: x${e.goldenMultiplier})` : text;
}

export function cardTextTh(c: CardDef, names: Names): string {
  const lines: string[] = [];
  if (c.henshin) lines.push(`Henshin (${c.henshin.afterTurns}): แปลงร่างเป็น ${names(c.henshin.into)}`);
  if (c.gattaiInto) lines.push(`Gattai core: เป็นตัวนำกลุ่ม Gattai แล้วกด Combine จะรวมเป็น ${names(c.gattaiInto)}`);
  if (c.ultimateInto) lines.push(`ร่าง Ultimate: ${names(c.ultimateInto)}`);
  if (c.keywords.includes("ECHO")) lines.push("Echo: Deploy ของเราทำงาน 2 ครั้ง");
  for (const e of c.effects) lines.push(c.kind === "GEAR" && e.trigger === "ON_PLAY" ? effectTextTh(e, names).replace(/^Deploy: /, "ใช้: ") : effectTextTh(e, names));
  return lines.join(" · ");
}

export function relicTextTh(r: RelicDef, names: Names): string {
  return r.effects.map((e) => effectTextTh(e, names)).join(" · ");
}

export function heroTextTh(h: HeroDef, names: Names): string {
  const p = h.power;
  if (!p) return h.armor > 0 ? `เกราะ ${h.armor}` : "";
  const mode = p.mode === "ACTIVE" ? `Hero Power (${p.cost ?? 0} Energy, เทิร์นละครั้ง)` : p.mode === "ONCE" ? `Hero Power (${p.cost ?? 0} Energy, ครั้งเดียวต่อเกม)` : "Passive";
  // As in English, "when used" / "when acquired" go without saying for a hero power.
  const body = p.effects.map((e) => { const t = effectTextTh(e, names); return e.trigger === "ON_USE" || e.trigger === "ON_ACQUIRE" ? t.replace(/^[^:]+: /, "") : t; }).join(" · ");
  return `${mode}: ${body}${h.armor > 0 ? ` · เกราะ ${h.armor}` : ""}`;
}

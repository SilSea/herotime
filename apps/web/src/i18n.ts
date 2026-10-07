/**
 * Two languages for the game screens (the admin editor stays English). Strings live next to the code that
 * shows them as tr("English", "ไทย") pairs, so a screen reads the same in both and nothing goes missing.
 */
export type Lang = "en" | "th";

const LANG_KEY = "herotime.lang";

function initial(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "th") return saved;
  } catch {
    // no storage (private mode): fall through to the browser's language
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("th") ? "th" : "en";
}

let current: Lang = initial();

export const lang = (): Lang => current;

export function setLang(next: Lang): void {
  current = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    // remembered for this visit only
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
}

/** The string for the current language. */
export const tr = (en: string, th: string): string => (current === "th" ? th : en);

/** Text written in both languages (content: cards, relics, heroes, factions). Thai falls back to English. */
export const pick = (o: { text?: string; textTh?: string } | undefined): string => (current === "th" && o?.textTh ? o.textTh : (o?.text ?? ""));

/** Server refusals players see often, in Thai (anything else is shown as the server wrote it). */
const SERVER_TH: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^not enough energy: need (\d+), have (\d+)$/, (m) => `Energy ไม่พอ: ต้องใช้ ${m[1]} มี ${m[2]}`],
  [/^hand is full$/, () => "มือเต็มแล้ว"],
  [/^not enough health: need more than (\d+), have (\d+)$/, (m) => `เลือดไม่พอ: ต้องมีมากกว่า ${m[1]} มี ${m[2]}`],
  [/^board is full$/, () => "บอร์ดเต็มแล้ว"],
  [/^already at max rank$/, () => "ร้านอยู่ rank สูงสุดแล้ว"],
  [/^gear cannot be sold$/, () => "ขาย Gear ไม่ได้"],
  [/^there is no gear in the tavern$/, () => "ร้านไม่มี Gear"],
  [/^(.+) has no unit to go on$/, (m) => `${m[1]} ไม่มียูนิตที่ใช้ได้`],
  [/^choose a unit for (.+)$/, (m) => `เลือกยูนิตที่จะใช้ ${m[1]}`],
  [/^(.+) cannot go on that unit$/, (m) => `ใช้ ${m[1]} กับยูนิตนั้นไม่ได้`],
  [/^hero power already used this turn$/, () => "ใช้พลัง Hero ไปแล้วเทิร์นนี้"],
  [/^hero power already used this game$/, () => "ใช้พลัง Hero ไปแล้วในเกมนี้"],
  [/^this hero power is passive$/, () => "พลัง Hero นี้เป็น Passive"],
  [/^you can only do that while recruiting$/, () => "ทำได้เฉพาะช่วงซื้อของ"],
  [/^you have been eliminated$/, () => "คุณตกรอบแล้ว"],
  [/^the match is over$/, () => "เกมจบแล้ว"],
  [/^no room with that code$/, () => "ไม่มีห้องที่ใช้รหัสนี้"],
  [/^you are not in a room$/, () => "คุณไม่ได้อยู่ในห้อง"],
  [/^(.+) costs Health$/, (m) => `${m[1]} ต้องจ่ายด้วยเลือด`],
  [/^(.+) needs a Giant Robo in the Giant Slot$/, (m) => `${m[1]} ต้องมี Giant Robo ในช่อง Giant ก่อน`],
  [/^request body too large$/, () => "ข้อมูลที่ส่งใหญ่เกินไป"],
  [/^that room is full$/, () => "ห้องเต็มแล้ว"],
  [/^only the host can start the match$/, () => "เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้"],
  [/^you are already in a match$/, () => "คุณอยู่ในเกมอยู่แล้ว"],
  [/^these units cannot combine/, () => "รวมร่างไม่ได้: วาง Gattai core ไว้ซ้ายสุดของยูนิต Gattai ที่ติดกันให้ครบ"],
  [/^(.+) is not a unit \(use it instead\)$/, (m) => `${m[1]} ไม่ใช่ยูนิต (กดใช้แทน)`],
  [/^already holding a (lesser|greater) relic$/, (m) => `มี ${m[1] === "lesser" ? "Lesser" : "Greater"} Relic อยู่แล้ว`],
];

/** A server message in the current language. */
export function serverText(message: string): string {
  if (current !== "th") return message;
  for (const [re, th] of SERVER_TH) {
    const m = message.match(re);
    if (m) return th(m);
  }
  return message;
}

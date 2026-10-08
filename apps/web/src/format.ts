import { tr } from "./i18n.js";
import type { CardDef, CombatRecord } from "./protocol.js";

const TARGETED_ACTIONS = new Set(["BUFF", "GIVE_KEYWORD", "TRANSFORM", "DESTROY", "ULTIMATE_FORM", "DEVOUR_SHOP", "CONSUME_ALLIES", "COPY"]);

/**
 * Board slots a gear can be used on, or null when it goes on nobody in particular. Same rule as the
 * engine: a unit qualifies when it passes the faction / series filter of every chosen-target effect.
 */
export function gearTargetSlots(gear: CardDef | undefined, board: readonly (CardDef | undefined)[], lineage: (key: string) => readonly string[] = (k) => [k]): number[] | null {
  const chosen = (gear?.effects ?? []).filter((e) => e.target?.selector === "CHOSEN_FRIENDLY" && e.actions.some((a) => TARGETED_ACTIONS.has(a.type)));
  if (chosen.length === 0) return null;
  const fits = (d: CardDef | undefined): boolean =>
    d !== undefined &&
    chosen.some(
      (e) =>
        (e.target?.faction === undefined || d.factions.includes(e.target.faction)) &&
        (e.target?.series === undefined || d.series === e.target.series) &&
        (e.target?.cards === undefined || lineage(d.key).some((k) => e.target?.cards?.includes(k))) &&
        // a Final Form card only fits a unit that has a Final Form (same rule as the engine)
        (!e.actions.some((a) => a.type === "ULTIMATE_FORM") || d.ultimateInto !== undefined),
    );
  return board.flatMap((d, i) => (fits(d) ? [i] : []));
}

/**
 * Cards a card brings into play or points at, for the hover preview: its Henshin / Final Form / Gattai forms,
 * what it summons, adds to the hand or transforms into, and the named cards its targets or conditions need.
 * At most `max`, each once, never the card itself.
 */
export function relatedCards(def: CardDef | undefined, max = 4): { key: string; label: string }[] {
  if (!def) return [];
  const out: { key: string; label: string }[] = [];
  const add = (key: string | undefined, label: string): void => {
    if (key && key !== def.key && !out.some((o) => o.key === key)) out.push({ key, label });
  };
  add(def.henshin?.into, tr("Henshin into", "Henshin เป็น"));
  add(def.ultimateInto, tr("Final Form", "ร่าง Final Form"));
  add(def.gattaiInto, tr("Gattai into", "Gattai รวมเป็น"));
  for (const e of def.effects) {
    for (const a of e.actions) {
      if (a.type === "SUMMON") add(a.cardKey, tr("Summons", "เรียก"));
      if (a.type === "ADD_TO_HAND") add(a.cardKey, tr("Adds to your hand", "ได้เข้ามือ"));
      if (a.type === "TRANSFORM") add(a.into, tr("Transforms into", "แปลงเป็น"));
    }
    for (const k of e.target?.cards ?? []) add(k, tr("Only for", "เฉพาะ"));
    if (e.condition?.type === "HAS_CARD") for (const k of e.condition.cards) add(k, tr("Needs", "ต้องมี"));
  }
  return out.slice(0, max);
}

/**
 * A space wherever Latin letters / digits meet Thai script: names (written in English) dropped into a Thai
 * sentence would otherwise run into the words around them ("Gear Kamen Riderแบบสุ่ม").
 */
/* Same as @herotime/content spaceThai (a test keeps them equal). */
export function spaceThai(s: string): string {
  return s.replace(/([A-Za-z0-9)\]])(?=[฀-๿])/g, "$1 ").replace(/([฀-๿])(?=[A-Za-z0-9(\[])/g, "$1 ");
}

/** Alphabetical by name (then key), ignoring case, numbers in order ("Unit 2" before "Unit 10"). */
export const byName = (a: { name?: unknown; key?: unknown }, b: { name?: unknown; key?: unknown }): number =>
  String(a.name ?? a.key ?? "").localeCompare(String(b.name ?? b.key ?? ""), undefined, { sensitivity: "base", numeric: true }) ||
  String(a.key ?? "").localeCompare(String(b.key ?? ""));

/** Plain-language explanations shown when hovering a keyword (names stay English: they are printed on cards). */
export const KEYWORDS: Record<string, { name: string; text: string; textTh: string }> = {
  GUARD: { name: "Guard", text: "Enemies must attack this unit before any other.", textTh: "ศัตรูต้องโจมตียูนิตนี้ก่อนตัวอื่นเสมอ" },
  BARRIER: { name: "Barrier", text: "Ignores the first damage it would take.", textTh: "ไม่รับดาเมจครั้งแรกที่โดน (โล่แตกแทน)" },
  RAPID: { name: "Rapid", text: "Attacks twice each turn.", textTh: "โจมตี 2 ครั้งทุกครั้งที่ถึงตาของตัวเอง" },
  LETHAL: { name: "Lethal", text: "Any unit it damages is destroyed.", textTh: "ยูนิตใดที่โดนดาเมจจากตัวนี้ จะถูกทำลายทันที" },
  REVIVE: { name: "Revive", text: "Comes back once with 1 HP after dying.", textTh: "ตายครั้งแรกจะฟื้นกลับมาพร้อม HP 1" },
  RIDER_KICK: { name: "Power Strike", text: "Its first attack of the fight deals double damage. On Rider units it is called Rider Kick.", textTh: "การโจมตีครั้งแรกของการต่อสู้ทำดาเมจ ×2 · บนยูนิต Rider เรียกว่า Rider Kick" },
  FINAL_BLOW: { name: "Final Blow", text: "First attack deals double damage, and double again against giants.", textTh: "การโจมตีครั้งแรกทำดาเมจ ×2 และ ×2 อีกเท่าเมื่อตีใส่ยูนิตยักษ์" },
  KYODAIKA: { name: "Kyodaika", text: "The first time it dies it returns as a giant with doubled stats and no keywords.", textTh: "ตายครั้งแรกจะฟื้นเป็นร่างยักษ์ stat ×2 แต่ไม่มี keyword อื่น" },
  ECHO: { name: "Echo", text: "While this is on your board, your Deploy effects happen twice.", textTh: "ระหว่างอยู่บนบอร์ด เอฟเฟค Deploy ของเราทำงาน 2 ครั้ง" },
  GATTAI: { name: "Gattai", text: "Can be combined: with a Gattai core leftmost of 3 adjacent Gattai units, press Combine in the recruit phase and the group becomes the core's form for good.", textTh: "เป็นชิ้นส่วนรวมร่างได้: วาง core ไว้ซ้ายสุดของยูนิต Gattai ที่ติดกันครบ 3 ตัว แล้วกด Combine ช่วงซื้อของ ทั้งกลุ่มจะรวมเป็นร่างของ core ถาวร" },
};

/** A keyword's explanation in the current language. */
export const keywordText = (k: string): string => {
  const kw = KEYWORDS[k];
  return kw ? tr(kw.text, kw.textTh) : "";
};

/** A keyword's printed name. Power Strike is called Rider Kick on a card of the Rider faction. */
export const keywordName = (k: string, factions?: readonly string[]): string =>
  k === "RIDER_KICK" && factions?.includes("rider") ? "Rider Kick" : (KEYWORDS[k]?.name ?? k);

export const SENTAI_COLORS: Record<string, string> = {
  RED: "#e53935",
  BLUE: "#1e88e5",
  YELLOW: "#fdd835",
  GREEN: "#43a047",
  PINK: "#ec407a",
  // Black is drawn dark grey so it still shows on the dark background.
  BLACK: "#5c6370",
  WHITE: "#f5f5f5",
  PURPLE: "#9c27b0",
  SILVER: "#b0bec5",
  GOLD: "#ffb300",
  ORANGE: "#fb8c00",
  // The wildcard: a colour no ranger uses.
  EXTRA: "#00e5ff",
};

export const stars = (rank: number): string => "★".repeat(rank);

export const phaseLabel = (phase: string): string =>
  ({ HERO_SELECT: tr("Choose your hero", "เลือก Hero"), RECRUIT: tr("Recruit", "ช่วงซื้อของ"), BATTLE: tr("Battle", "ต่อสู้"), ENDED: tr("Match over", "จบเกม") })[phase] ?? phase;

export function ordinal(n: number): string {
  if (tr("en", "th") === "th") return `ที่ ${n}`;
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

/** One-line summary of a finished fight for the match log. */
export function describeCombat(r: CombatRecord): string {
  const won = r.result.winner === r.meSide;
  const lost = r.result.winner !== "DRAW" && !won;
  const outcome = r.result.winner === "DRAW" ? tr("Draw", "เสมอ") : won ? tr("Won", "ชนะ") : tr("Lost", "แพ้");
  const detail = lost ? tr(`took ${r.damageTaken} damage`, `โดน ${r.damageTaken} ดาเมจ`) : won && r.damageDealt > 0 ? tr(`dealt ${r.damageDealt} damage`, `ทำ ${r.damageDealt} ดาเมจ`) : "";
  return `${tr("Turn", "เทิร์น")} ${r.turn} vs ${r.opponentName}: ${outcome}${detail ? `, ${detail}` : ""}`;
}

export interface BoardSummaryLike {
  units: number;
  factions: Record<string, number>;
  neutral: number;
}

/**
 * How a board reads at a glance: "Sentai 4" when one faction clearly leads (at least 2 units and at least half
 * the board, and no tie), otherwise "Mixed" with the biggest groups. A unit with two factions counts for both.
 */
export function boardLabel(b: BoardSummaryLike, name: (faction: string) => string): { headline: string; parts: string[] } {
  if (b.units === 0) return { headline: tr("Empty board", "บอร์ดว่าง"), parts: [] };
  const groups = Object.entries(b.factions).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  const parts = [...groups.map(([f, n]) => `${name(f)} ${n}`), ...(b.neutral > 0 ? [`${tr("Neutral", "ไม่มีเผ่า")} ${b.neutral}`] : [])];
  const [top, second] = groups;
  // A board of one faction is that faction, however small; otherwise the leader needs 2+ units and half the board.
  const pure = groups.length === 1 && b.neutral === 0;
  if (top && (pure || top[1] >= 2) && top[1] * 2 >= b.units && (!second || second[1] < top[1])) return { headline: `${name(top[0])} ${top[1]}`, parts };
  return { headline: tr("Mixed", "ผสม"), parts };
}

export interface GaugeLike {
  name: string;
  max: number;
  sources: { trigger: string; amount: number }[];
  thresholds: { at: number; once: boolean; reward: { type: string; cardKey?: string }[] }[];
}

const gaugeSource = (trigger: string): string =>
  ({
    ON_ROLL_CALL: tr("when Roll Call fires (Sentai of {colors} different colours at the start of a fight)", "เมื่อเกิด Roll Call (มี Sentai {colors} สีไม่ซ้ำตอนเริ่มการต่อสู้)"),
    ON_ROLL_CALL_WIN: tr("more if you also win that fight", "เพิ่มอีกถ้าชนะการต่อสู้นั้น"),
    HENSHIN: tr("each time one of your units transforms (Henshin)", "ทุกครั้งที่ยูนิตของเราแปลงร่าง (Henshin)"),
  })[trigger] ?? trigger;

/** What a gauge does, in words, from its data: how it fills and what it pays out. */
export function gaugeText(g: GaugeLike, cardName: (key: string) => string, rollCallColors = 5): { fills: string[]; rewards: string[]; short: string } {
  const fills = g.sources.map((s) => `+${s.amount} ${gaugeSource(s.trigger).replace("{colors}", String(rollCallColors))}`);
  const reward = (r: { type: string; cardKey?: string }): string =>
    r.type === "ADD_TO_HAND" && r.cardKey ? `${tr("get", "ได้")} ${cardName(r.cardKey)}` : r.type === "DISCOVER_GIANT" ? tr("discover a Giant Robo", "เลือกรับ Giant Robo") : r.type === "DISCOVER_UNIT" ? tr("discover a unit", "เลือกรับยูนิต") : r.type === "SUPER_GATTAI" ? tr("Super Gattai (Giant + Extra Ranger)", "Super Gattai (Giant + Extra Ranger)") : r.type.toLowerCase().replace(/_/g, " ");
  const rewards = [...g.thresholds].sort((a, b) => a.at - b.at).map((t) => `${t.once ? tr(`At ${t.at}`, `ถึง ${t.at}`) : tr(`Every ${t.at}`, `ทุก ${t.at}`)}: ${t.reward.map(reward).join(tr(", then ", " แล้ว"))}${t.once ? tr(" (once per game)", " (ครั้งเดียวต่อเกม)") : ""}`);
  const first = [...g.thresholds].sort((a, b) => a.at - b.at)[0];
  const short = first ? `${first.once ? tr("at", "ถึง") : tr("every", "ทุก")} ${first.at} → ${first.reward.map(reward).join(", ").replace(/^(get|ได้) /, "")}` : "";
  return { fills, rewards, short };
}

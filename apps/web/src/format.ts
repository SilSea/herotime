import { tr } from "./i18n.js";
import type { CardDef, CombatRecord } from "./protocol.js";

const TARGETED_ACTIONS = new Set(["BUFF", "GIVE_KEYWORD", "TRANSFORM", "DESTROY"]);

/**
 * Board slots a gear can be used on, or null when it goes on nobody in particular. Same rule as the
 * engine: a unit qualifies when it passes the faction / series filter of every chosen-target effect.
 */
export function gearTargetSlots(gear: CardDef | undefined, board: readonly (CardDef | undefined)[]): number[] | null {
  const chosen = (gear?.effects ?? []).filter((e) => e.target?.selector === "CHOSEN_FRIENDLY" && e.actions.some((a) => TARGETED_ACTIONS.has(a.type)));
  if (chosen.length === 0) return null;
  const fits = (d: CardDef | undefined): boolean =>
    d !== undefined && chosen.every((e) => (e.target?.faction === undefined || d.factions.includes(e.target.faction)) && (e.target?.series === undefined || d.series === e.target.series));
  return board.flatMap((d, i) => (fits(d) ? [i] : []));
}

/** Plain-language explanations shown when hovering a keyword (names stay English: they are printed on cards). */
export const KEYWORDS: Record<string, { name: string; text: string; textTh: string }> = {
  GUARD: { name: "Guard", text: "Enemies must attack this unit before any other.", textTh: "ศัตรูต้องโจมตียูนิตนี้ก่อนตัวอื่นเสมอ" },
  BARRIER: { name: "Barrier", text: "Ignores the first damage it would take.", textTh: "ไม่รับดาเมจครั้งแรกที่โดน (โล่แตกแทน)" },
  RAPID: { name: "Rapid", text: "Attacks twice each turn.", textTh: "โจมตี 2 ครั้งทุกครั้งที่ถึงตาของตัวเอง" },
  LETHAL: { name: "Lethal", text: "Any unit it damages is destroyed.", textTh: "ยูนิตใดที่โดนดาเมจจากตัวนี้ จะถูกทำลายทันที" },
  REVIVE: { name: "Revive", text: "Comes back once with 1 HP after dying.", textTh: "ตายครั้งแรกจะฟื้นกลับมาพร้อม HP 1" },
  RIDER_KICK: { name: "Rider Kick", text: "Its first attack of the fight deals double damage.", textTh: "การโจมตีครั้งแรกของการต่อสู้ทำดาเมจ ×2" },
  FINAL_BLOW: { name: "Final Blow", text: "First attack deals double damage, and double again against giants.", textTh: "การโจมตีครั้งแรกทำดาเมจ ×2 และ ×2 อีกเท่าเมื่อตีใส่ยูนิตยักษ์" },
  KYODAIKA: { name: "Kyodaika", text: "The first time it dies it returns as a giant with doubled stats and no keywords.", textTh: "ตายครั้งแรกจะฟื้นเป็นร่างยักษ์ stat ×2 แต่ไม่มี keyword อื่น" },
  GATTAI: { name: "Gattai", text: "Can be combined: with a Gattai core leftmost of 3 adjacent Gattai units, press Combine in the recruit phase and the group becomes the core's form for good.", textTh: "เป็นชิ้นส่วนรวมร่างได้: วาง core ไว้ซ้ายสุดของยูนิต Gattai ที่ติดกันครบ 3 ตัว แล้วกด Combine ช่วงซื้อของ ทั้งกลุ่มจะรวมเป็นร่างของ core ถาวร" },
};

/** A keyword's explanation in the current language. */
export const keywordText = (k: string): string => {
  const kw = KEYWORDS[k];
  return kw ? tr(kw.text, kw.textTh) : "";
};

export const keywordName = (k: string): string => KEYWORDS[k]?.name ?? k;

export const SENTAI_COLORS: Record<string, string> = {
  RED: "#e53935",
  BLUE: "#1e88e5",
  YELLOW: "#fdd835",
  GREEN: "#43a047",
  PINK: "#ec407a",
  EXTRA: "#8e24aa",
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
    r.type === "ADD_TO_HAND" && r.cardKey ? `${tr("get", "ได้")} ${cardName(r.cardKey)}` : r.type === "DISCOVER_GIANT" ? tr("discover a Giant Robo", "เลือกรับ Giant Robo") : r.type === "DISCOVER_UNIT" ? tr("discover a unit", "เลือกรับยูนิต") : r.type.toLowerCase().replace(/_/g, " ");
  const rewards = [...g.thresholds].sort((a, b) => a.at - b.at).map((t) => `${t.once ? tr(`At ${t.at}`, `ถึง ${t.at}`) : tr(`Every ${t.at}`, `ทุก ${t.at}`)}: ${t.reward.map(reward).join(tr(", then ", " แล้ว"))}${t.once ? tr(" (once per game)", " (ครั้งเดียวต่อเกม)") : ""}`);
  const first = [...g.thresholds].sort((a, b) => a.at - b.at)[0];
  const short = first ? `${first.once ? tr("at", "ถึง") : tr("every", "ทุก")} ${first.at} → ${first.reward.map(reward).join(", ").replace(/^(get|ได้) /, "")}` : "";
  return { fills, rewards, short };
}

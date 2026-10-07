import type { CombatRecord } from "./protocol.js";

/** Plain-language explanations shown when hovering a keyword. */
export const KEYWORDS: Record<string, { name: string; text: string }> = {
  GUARD: { name: "Guard", text: "ศัตรูต้องโจมตียูนิตนี้ก่อนตัวอื่นเสมอ" },
  BARRIER: { name: "Barrier", text: "ไม่รับดาเมจครั้งแรกที่โดน (โล่แตกแทน)" },
  RAPID: { name: "Rapid", text: "โจมตี 2 ครั้งทุกครั้งที่ถึงตาของตัวเอง" },
  LETHAL: { name: "Lethal", text: "ยูนิตใดที่โดนดาเมจจากตัวนี้ จะถูกทำลายทันที" },
  REVIVE: { name: "Revive", text: "ตายครั้งแรกจะฟื้นกลับมาพร้อม HP 1" },
  RIDER_KICK: { name: "Rider Kick", text: "การโจมตีครั้งแรกของการต่อสู้ทำดาเมจ ×2" },
  FINAL_BLOW: { name: "Final Blow", text: "การโจมตีครั้งแรกทำดาเมจ ×2 และ ×2 อีกเท่าเมื่อตีใส่ยูนิตยักษ์" },
  KYODAIKA: { name: "Kyodaika", text: "ตายครั้งแรกจะฟื้นเป็นร่างยักษ์ stat ×2 แต่ไม่มี keyword อื่น" },
  GATTAI: { name: "Gattai", text: "เป็นชิ้นส่วนรวมร่างได้: วาง core ไว้ซ้ายสุดของยูนิต Gattai ที่ติดกันครบ 3 ตัว แล้วกด Combine ช่วงซื้อของ ทั้งกลุ่มจะรวมเป็นร่างของ core ถาวร" },
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

export const PHASE_LABEL: Record<string, string> = {
  HERO_SELECT: "Choose your hero",
  RECRUIT: "Recruit",
  BATTLE: "Battle",
  ENDED: "Match over",
};

export function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

/** One-line summary of a finished fight for the match log. */
export function describeCombat(r: CombatRecord): string {
  const won = r.result.winner === r.meSide;
  const lost = r.result.winner !== "DRAW" && !won;
  const outcome = r.result.winner === "DRAW" ? "Draw" : won ? "Won" : "Lost";
  const detail = lost ? `took ${r.damageTaken} damage` : won && r.damageDealt > 0 ? `dealt ${r.damageDealt} damage` : "";
  return `Turn ${r.turn} vs ${r.opponentName}: ${outcome}${detail ? `, ${detail}` : ""}`;
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
  if (b.units === 0) return { headline: "Empty board", parts: [] };
  const groups = Object.entries(b.factions).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  const parts = [...groups.map(([f, n]) => `${name(f)} ${n}`), ...(b.neutral > 0 ? [`Neutral ${b.neutral}`] : [])];
  const [top, second] = groups;
  // A board of one faction is that faction, however small; otherwise the leader needs 2+ units and half the board.
  const pure = groups.length === 1 && b.neutral === 0;
  if (top && (pure || top[1] >= 2) && top[1] * 2 >= b.units && (!second || second[1] < top[1])) return { headline: `${name(top[0])} ${top[1]}`, parts };
  return { headline: "Mixed", parts };
}

export interface GaugeLike {
  name: string;
  max: number;
  sources: { trigger: string; amount: number }[];
  thresholds: { at: number; once: boolean; reward: { type: string; cardKey?: string }[] }[];
}

const GAUGE_SOURCE: Record<string, string> = {
  ON_ROLL_CALL: "when Roll Call fires (Sentai of {colors} different colours at the start of a fight)",
  ON_ROLL_CALL_WIN: "more if you also win that fight",
  HENSHIN: "each time one of your units transforms (Henshin)",
};

/** What a gauge does, in words, from its data: how it fills and what it pays out. */
export function gaugeText(g: GaugeLike, cardName: (key: string) => string, rollCallColors = 5): { fills: string[]; rewards: string[]; short: string } {
  const fills = g.sources.map((s) => `+${s.amount} ${(GAUGE_SOURCE[s.trigger] ?? s.trigger).replace("{colors}", String(rollCallColors))}`);
  const reward = (r: { type: string; cardKey?: string }): string =>
    r.type === "ADD_TO_HAND" && r.cardKey ? `get ${cardName(r.cardKey)}` : r.type === "DISCOVER_GIANT" ? "discover a Giant Robo" : r.type.toLowerCase().replace(/_/g, " ");
  const rewards = [...g.thresholds].sort((a, b) => a.at - b.at).map((t) => `${t.once ? `At ${t.at}` : `Every ${t.at}`}: ${t.reward.map(reward).join(", then ")}${t.once ? " (once per game)" : ""}`);
  const first = [...g.thresholds].sort((a, b) => a.at - b.at)[0];
  const short = first ? `${first.once ? "at" : "every"} ${first.at} → ${first.reward.map(reward).join(", ").replace(/^get /, "")}` : "";
  return { fills, rewards, short };
}

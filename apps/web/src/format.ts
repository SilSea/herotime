import type { CombatRecord } from "./protocol.js";

/** Plain-language explanations shown when hovering a keyword. */
export const KEYWORDS: Record<string, { name: string; text: string }> = {
  GUARD: { name: "Guard", text: "Enemies must attack this unit before any other." },
  BARRIER: { name: "Barrier", text: "Ignores the first damage it would take." },
  RAPID: { name: "Rapid", text: "Attacks twice each turn." },
  LETHAL: { name: "Lethal", text: "Any unit it damages is destroyed." },
  REVIVE: { name: "Revive", text: "Comes back once with 1 HP after dying." },
  RIDER_KICK: { name: "Rider Kick", text: "Its first attack of the fight deals double damage." },
  FINAL_BLOW: { name: "Final Blow", text: "First attack deals double damage, and double again against giants." },
  KYODAIKA: { name: "Kyodaika", text: "The first time it dies it returns as a giant with doubled stats and no keywords." },
  GATTAI: { name: "Gattai", text: "3 adjacent Gattai units merge into one at the start of combat." },
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

import type { ContentIndex } from "../content-index.js";
import { KEYWORDS, keywordName, SENTAI_COLORS, stars } from "../format.js";
import { bg } from "./art.js";
import { h } from "./dom.js";

export interface CardOpts {
  key: string;
  /** Current stats of an owned unit. Omit to show the card's printed stats. */
  atk?: number;
  hp?: number;
  golden?: boolean;
  /** Keywords gained on top of the card's own. */
  extraKeywords?: readonly string[];
  /** A price badge (shop cards, relic offers). */
  cost?: number;
  small?: boolean;
  /** A unit on the board or in a fight: drawn as an oval portrait, like a minion in play. */
  minion?: boolean;
  hideText?: boolean;
  classes?: readonly string[];
  /** Replay: carries a live Barrier. */
  barrier?: boolean;
  /** Who buffed this unit (owned units only). */
  buffs?: readonly BuffLike[];
  onClick?: () => void;
}

export interface BuffLike {
  kind: "card" | "gear" | "relic" | "hero" | "combat";
  key: string | null;
  atk: number;
  hp: number;
  keywords?: readonly string[];
}

/** "Armor Plate (gear)", "Kaijin General (hero)", "Combat": where a buff came from, in words. */
export function buffSource(ix: ContentIndex, b: BuffLike): string {
  if (b.kind === "combat" || b.key === null) return b.kind === "combat" ? "Earned in combat" : "Effect";
  if (b.kind === "relic") return `${ix.relicName(b.key)} (relic)`;
  if (b.kind === "hero") return `${ix.heroName(b.key)} (hero)`;
  if (b.kind === "gear") return `${ix.cardName(b.key)} (gear)`;
  return ix.cardName(b.key);
}

/** "+2/+3, Guard": what a buff gave. */
export function buffValue(b: BuffLike): string {
  const parts: string[] = [];
  if (b.atk !== 0 || b.hp !== 0) parts.push(`${b.atk >= 0 ? "+" : ""}${b.atk}/${b.hp >= 0 ? "+" : ""}${b.hp}`);
  for (const k of b.keywords ?? []) parts.push(keywordName(k));
  return parts.join(", ");
}

/** Small marks for what a unit does, shown on the board where there is no room for text. */
const KEYWORD_ICON: Record<string, string> = {
  GUARD: "🛡",
  BARRIER: "✦",
  RAPID: "»",
  LETHAL: "☠",
  REVIVE: "↺",
  RIDER_KICK: "⚡",
  FINAL_BLOW: "✸",
  KYODAIKA: "▲",
  GATTAI: "⚙",
};
const TRIGGER_ICON: Record<string, { icon: string; name: string }> = {
  LAST_STAND: { icon: "💀", name: "Last Stand" },
  START_OF_COMBAT: { icon: "⚔", name: "Start of combat" },
  END_OF_TURN: { icon: "⌛", name: "End of turn" },
  AVENGE: { icon: "✊", name: "Avenge" },
  ON_ATTACK: { icon: "➹", name: "When it attacks" },
  AFTER_DAMAGED: { icon: "❤", name: "After it takes damage" },
  HENSHIN: { icon: "✧", name: "On Henshin" },
};

/** One card, drawn the same way everywhere (shop, hand, board, offers, replay, library). */
export function cardEl(ix: ContentIndex, o: CardOpts): HTMLElement {
  const def = ix.card(o.key);
  const atk = o.atk ?? def?.atk ?? 0;
  const hp = o.hp ?? def?.hp ?? 0;
  const keywords = [...new Set([...(def?.keywords ?? []), ...(o.extraKeywords ?? [])])];
  const factions = (def?.factions ?? []).map((f) => ix.factionName(f));
  const kind = def?.kind ?? "UNIT";

  const art = ix.artUrl(o.key);
  const buffs = (o.buffs ?? []).filter((b) => b.atk !== 0 || b.hp !== 0 || (b.keywords?.length ?? 0) > 0);
  const tooltip = [
    `${ix.cardName(o.key)}${def ? ` (rank ${def.rank})` : ""}${o.golden ? " - Final Form" : ""}`,
    factions.join(", "),
    keywords.map((k) => `${keywordName(k)}: ${KEYWORDS[k]?.text ?? ""}`).join("\n"),
    def?.text ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const triggers = [...new Set((def?.effects ?? []).map((e) => e.trigger))].filter((t) => TRIGGER_ICON[t]);
  const icons = [
    ...keywords.map((k) => ({ icon: KEYWORD_ICON[k] ?? "•", tip: keywordName(k) })),
    ...triggers.map((t) => ({ icon: TRIGGER_ICON[t]?.icon ?? "•", tip: TRIGGER_ICON[t]?.name ?? t })),
    ...(def?.henshin ? [{ icon: "✧", tip: `Henshin (${def.henshin.afterTurns})` }] : []),
  ];
  const faction = factions[0];

  const classes = ["card", o.small ? "small" : "", o.minion ? "minion" : "", ...keywords.map((k) => `kw-${k.toLowerCase().replace(/_/g, "-")}`), o.golden ? "golden" : "", kind === "GEAR" ? "gear" : "", kind === "GIANT" ? "giant" : "", o.barrier ? "has-barrier" : "", o.onClick ? "clickable" : "", ...(o.classes ?? [])];

  return h(
    "div",
    { class: classes.filter(Boolean).join(" "), style: `--c:${ix.cardColor(o.key)}`, data: { key: o.key, tip: tooltip }, on: o.onClick ? { click: o.onClick } : {} },
    o.cost !== undefined && h("div", { class: "cost", text: String(o.cost), title: "Energy cost" }),
    h("div", { class: "art", style: bg(art) }, art ? null : h("span", { text: ix.initials(o.key) })),
    h("div", { class: "name", text: ix.cardName(o.key) }),
    def && kind === "UNIT" && h("div", { class: "rank", title: `Rank ${def.rank} ${stars(def.rank)}` }, h("span", { text: String(def.rank) })),
    def && def.colors.length > 0 && h("div", { class: "colors" }, ...def.colors.map((c) => h("span", { class: "dot", style: `background:${SENTAI_COLORS[c] ?? "#999"}`, title: c }))),
    keywords.length > 0 && h("div", { class: "kws" }, ...keywords.map((k) => h("span", { class: "kw", text: keywordName(k), title: KEYWORDS[k]?.text ?? k }))),
    !o.hideText && def?.text && h("div", { class: "text", text: def.text }),
    icons.length > 0 && h("div", { class: "icons" }, ...icons.slice(0, 5).map((i) => h("span", { class: "icon", title: i.tip, text: i.icon }))),
    faction && kind === "UNIT" && h("div", { class: "faction-plate", text: faction }),
    buffs.length > 0 && h("div", { class: "buff-list" }, h("div", { class: "buff-title", text: "Buffs" }), ...buffs.slice(0, 6).map((b) => h("div", { class: "buff-line" }, h("span", { class: "buff-src", text: buffSource(ix, b) }), h("span", { class: "buff-val", text: buffValue(b) })))),
    buffs.length > 0 && h("div", { class: "buff-badge", title: `Buffed by ${buffs.length} source${buffs.length > 1 ? "s" : ""}`, text: `▲${buffs.length}` }),
    // One layer per keyword, so a unit with several shows them all at once.
    keywords.length > 0 && h("div", { class: "auras" }, ...keywords.map((k) => h("span", { class: `aura aura-${k.toLowerCase().replace(/_/g, "-")}` }))),
    kind !== "GEAR" && h("div", { class: "stats" }, h("span", { class: `atk ${def && atk > def.atk * (o.golden ? 2 : 1) ? "up" : def && atk < def.atk * (o.golden ? 2 : 1) ? "down" : ""}`, text: String(atk) }), h("span", { class: `hp ${def && hp > def.hp * (o.golden ? 2 : 1) ? "up" : def && hp < def.hp * (o.golden ? 2 : 1) ? "down" : ""}`, text: String(hp) })),
    kind === "GEAR" && h("div", { class: "stats gear-label", text: "GEAR" }),
  );
}

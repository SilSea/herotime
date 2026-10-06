import type { ContentIndex } from "../content-index.js";
import { KEYWORDS, keywordName, SENTAI_COLORS, stars } from "../format.js";
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
  hideText?: boolean;
  classes?: readonly string[];
  /** Replay: carries a live Barrier. */
  barrier?: boolean;
  onClick?: () => void;
}

/** One card, drawn the same way everywhere (shop, hand, board, offers, replay, library). */
export function cardEl(ix: ContentIndex, o: CardOpts): HTMLElement {
  const def = ix.card(o.key);
  const atk = o.atk ?? def?.atk ?? 0;
  const hp = o.hp ?? def?.hp ?? 0;
  const keywords = [...new Set([...(def?.keywords ?? []), ...(o.extraKeywords ?? [])])];
  const factions = (def?.factions ?? []).map((f) => ix.factionName(f));
  const kind = def?.kind ?? "UNIT";

  const art = ix.artUrl(o.key);
  const tooltip = [
    `${ix.cardName(o.key)}${def ? ` (rank ${def.rank})` : ""}${o.golden ? " - Final Form" : ""}`,
    factions.join(", "),
    keywords.map((k) => `${keywordName(k)}: ${KEYWORDS[k]?.text ?? ""}`).join("\n"),
    def?.text ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const classes = ["card", o.small ? "small" : "", o.golden ? "golden" : "", kind === "GEAR" ? "gear" : "", kind === "GIANT" ? "giant" : "", o.barrier ? "has-barrier" : "", o.onClick ? "clickable" : "", ...(o.classes ?? [])];

  return h(
    "div",
    { class: classes.filter(Boolean).join(" "), style: `--c:${ix.cardColor(o.key)}`, data: { key: o.key, tip: tooltip }, on: o.onClick ? { click: o.onClick } : {} },
    o.cost !== undefined && h("div", { class: "cost", text: String(o.cost), title: "Energy cost" }),
    h("div", { class: "art", style: art ? `background-image:url('${art}')` : "" }, art ? null : h("span", { text: ix.initials(o.key) })),
    h("div", { class: "name", text: ix.cardName(o.key) }),
    def && kind === "UNIT" && h("div", { class: "rank", text: stars(def.rank) }),
    def && def.colors.length > 0 && h("div", { class: "colors" }, ...def.colors.map((c) => h("span", { class: "dot", style: `background:${SENTAI_COLORS[c] ?? "#999"}`, title: c }))),
    keywords.length > 0 && h("div", { class: "kws" }, ...keywords.map((k) => h("span", { class: "kw", text: keywordName(k), title: KEYWORDS[k]?.text ?? k }))),
    !o.hideText && def?.text && h("div", { class: "text", text: def.text }),
    kind !== "GEAR" && h("div", { class: "stats" }, h("span", { class: "atk", text: String(atk) }), h("span", { class: "hp", text: String(hp) })),
    kind === "GEAR" && h("div", { class: "stats gear-label", text: "GEAR" }),
  );
}

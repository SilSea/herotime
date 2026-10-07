import type { ContentIndex } from "../content-index.js";
import { keywordName, keywordText, SENTAI_COLORS, stars } from "../format.js";
import { tr } from "../i18n.js";
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
  /** The price is paid in hero Health, not Energy. */
  costHealth?: boolean;
  small?: boolean;
  /** A unit on the board or in a fight: drawn as an oval portrait, like a minion in play. */
  minion?: boolean;
  hideText?: boolean;
  classes?: readonly string[];
  /** Replay: carries a live Barrier. */
  barrier?: boolean;
  /** A small badge on the card, e.g. the extra stats a Gear gives now. */
  note?: { text: string; title: string };
  /** Who buffed this unit (owned units only). */
  buffs?: readonly BuffLike[];
  onClick?: () => void;
}

export interface BuffLike {
  kind: "card" | "gear" | "relic" | "hero" | "combat" | "gattai";
  key: string | null;
  atk: number;
  hp: number;
  keywords?: readonly string[];
}

/** "Armor Plate (gear)", "Kaijin General (hero)", "Combat": where a buff came from, in words. */
export function buffSource(ix: ContentIndex, b: BuffLike): string {
  if (b.kind === "combat" || b.key === null) return b.kind === "combat" ? tr("Earned in combat", "ได้จากการต่อสู้") : tr("Effect", "เอฟเฟค");
  if (b.kind === "relic") return `${ix.relicName(b.key)} (relic)`;
  if (b.kind === "hero") return `${ix.heroName(b.key)} (hero)`;
  if (b.kind === "gear") return `${ix.cardName(b.key)} (gear)`;
  if (b.kind === "gattai") return tr("Combined parts", "ชิ้นส่วนที่รวมร่าง");
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
  ECHO: "⟳",
};
const TRIGGERS: Record<string, { icon: string; name: [string, string]; text: [string, string] }> = {
  LAST_STAND: { icon: "💀", name: ["Last Stand", "Last Stand"], text: ["Does something when this unit dies.", "ทำงานเมื่อยูนิตนี้ตาย"] },
  START_OF_COMBAT: { icon: "⚔", name: ["Start of combat", "เริ่มการต่อสู้"], text: ["Does something as the fight begins, before anyone attacks.", "ทำงานตอนเริ่มการต่อสู้ ก่อนที่ใครจะโจมตี"] },
  END_OF_TURN: { icon: "⌛", name: ["End of turn", "จบเทิร์น"], text: ["Does something when the recruit phase ends.", "ทำงานตอนจบช่วงซื้อของ (ก่อนเข้าการต่อสู้)"] },
  AVENGE: { icon: "✊", name: ["Avenge", "Avenge"], text: ["Does something after a number of your units have died in the fight.", "ทำงานเมื่อยูนิตฝ่ายเราตายครบตามจำนวนที่กำหนดระหว่างการต่อสู้"] },
  ON_ATTACK: { icon: "➹", name: ["When it attacks", "เมื่อโจมตี"], text: ["Does something each time this unit attacks.", "ทำงานทุกครั้งที่ยูนิตนี้โจมตี"] },
  AFTER_DAMAGED: { icon: "❤", name: ["After it takes damage", "เมื่อโดนดาเมจแล้วยังรอด"], text: ["Does something when this unit is hit and survives.", "ทำงานเมื่อยูนิตนี้โดนโจมตีแล้วยังไม่ตาย"] },
  HENSHIN: { icon: "✧", name: ["On Henshin", "เมื่อแปลงร่าง"], text: ["Does something when this unit transforms.", "ทำงานเมื่อยูนิตนี้แปลงร่าง (Henshin)"] },
  ON_DISCARD: { icon: "🗑", name: ["When discarded", "เมื่อถูกทิ้ง"], text: ["Does something when another card discards it from your hand.", "ทำงานเมื่อการ์ดใบอื่นทิ้งการ์ดนี้ออกจากมือ"] },
  ON_SELL: { icon: "$", name: ["When sold", "เมื่อถูกขาย"], text: ["Does something when you sell this unit.", "ทำงานเมื่อขายยูนิตนี้"] },
  ALLY_SUMMONED: { icon: "✚", name: ["When you summon", "เมื่อเรียกยูนิต"], text: ["Does something each time another unit is summoned onto your side (in the tavern or in a fight).", "ทำงานทุกครั้งที่มียูนิตตัวอื่นถูกเรียกเข้าฝั่งเรา (ทั้งช่วงซื้อของและตอนต่อสู้)"] },
  ON_PLAY: { icon: "▶", name: ["Deploy", "Deploy (ลงสนาม)"], text: ["Does something when you play this unit from your hand onto the board.", "ทำงานเมื่อคุณลงยูนิตนี้จากมือ"] },
};

/** A kind of ability a card shows an icon for, named and explained in the current language. */
export function triggerInfo(trigger: string): { icon: string; name: string; text: string } | undefined {
  const t = TRIGGERS[trigger];
  return t && { icon: t.icon, name: tr(...t.name), text: tr(...t.text) };
}

export const KEYWORD_ICON_OF = (k: string): string => KEYWORD_ICON[k] ?? "•";

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
    keywords.map((k) => `${keywordName(k)}: ${keywordText(k)}`).join("\n"),
    ix.cardText(o.key),
  ]
    .filter(Boolean)
    .join("\n");

  const triggers = [...new Set((def?.effects ?? []).map((e) => e.trigger))].filter((t) => TRIGGERS[t]);
  const icons = [
    ...keywords.map((k) => ({ icon: KEYWORD_ICON[k] ?? "•", tip: keywordName(k) })),
    ...triggers.map((t) => ({ icon: triggerInfo(t)?.icon ?? "•", tip: triggerInfo(t)?.name ?? t })),
    ...(def?.henshin ? [{ icon: "✧", tip: `Henshin (${def.henshin.afterTurns})` }] : []),
    ...(def?.gattaiInto ? [{ icon: "◈", tip: `Gattai core → ${ix.cardName(def.gattaiInto)}` }] : []),
    ...(def?.ultimateInto ? [{ icon: "★", tip: `Ultimate Form → ${ix.cardName(def.ultimateInto)}` }] : []),
  ];
  const faction = factions[0];

  const classes = ["card", o.small ? "small" : "", o.minion ? "minion" : "", ...keywords.map((k) => `kw-${k.toLowerCase().replace(/_/g, "-")}`), o.golden ? "golden" : "", kind === "GEAR" ? "gear" : "", kind === "GIANT" ? "giant" : "", o.barrier ? "has-barrier" : "", o.onClick ? "clickable" : "", ...(o.classes ?? [])];

  return h(
    "div",
    { class: classes.filter(Boolean).join(" "), style: `--c:${ix.cardColor(o.key)}`, data: { key: o.key, tip: tooltip, kws: keywords.join(","), triggers: [...new Set((def?.effects ?? []).map((e) => e.trigger))].join(","), henshin: def?.henshin ? `${def.henshin.afterTurns}|${ix.cardName(def.henshin.into)}` : "", core: def?.gattaiInto ? ix.cardName(def.gattaiInto) : "", ultimate: def?.ultimateInto ? ix.cardName(def.ultimateInto) : "" }, on: o.onClick ? { click: o.onClick } : {} },
    o.note && h("div", { class: "card-note", text: o.note.text, title: o.note.title }),
    o.cost !== undefined && h("div", { class: `cost ${o.costHealth ? "health" : ""}`, text: String(o.cost), title: o.costHealth ? tr("Health cost: paid from your hero's Health", "ราคาเป็นเลือด: จ่ายจาก HP ของ Hero") : tr("Energy cost", "ราคา Energy") }),
    h("div", { class: "art", style: bg(art) }, art ? null : h("span", { text: ix.initials(o.key) })),
    h("div", { class: "name", text: ix.cardName(o.key) }),
    def && kind === "UNIT" && h("div", { class: "rank", title: `Rank ${def.rank} ${stars(def.rank)}` }, h("span", { text: String(def.rank) })),
    def && def.colors.length > 0 && h("div", { class: "colors" }, ...def.colors.map((c) => h("span", { class: "dot", style: `background:${SENTAI_COLORS[c] ?? "#999"}`, title: c }))),
    keywords.length > 0 && h("div", { class: "kws" }, ...keywords.map((k) => h("span", { class: "kw", text: keywordName(k), title: keywordText(k) || k }))),
    !o.hideText && def?.text && h("div", { class: "text", text: ix.cardText(o.key) }),
    icons.length > 0 && h("div", { class: "icons" }, ...icons.slice(0, 5).map((i) => h("span", { class: "icon", title: i.tip, text: i.icon }))),
    faction && kind === "UNIT" && h("div", { class: "faction-plate", text: faction }),
    buffs.length > 0 && h("div", { class: "buff-list" }, h("div", { class: "buff-title", text: tr("Buffs", "บัฟ") }), ...buffs.slice(0, 6).map((b) => h("div", { class: "buff-line" }, h("span", { class: "buff-src", text: buffSource(ix, b) }), h("span", { class: "buff-val", text: buffValue(b) })))),
    buffs.length > 0 && h("div", { class: "buff-badge", title: tr(`Buffed by ${buffs.length} source${buffs.length > 1 ? "s" : ""}`, `ได้บัฟจาก ${buffs.length} แหล่ง`), text: `▲${buffs.length}` }),
    // One layer per keyword, so a unit with several shows them all at once.
    keywords.length > 0 && h("div", { class: "auras" }, ...keywords.map((k) => h("span", { class: `aura aura-${k.toLowerCase().replace(/_/g, "-")}` }))),
    kind !== "GEAR" && h("div", { class: "stats" }, h("span", { class: `atk ${def && atk > def.atk * (o.golden ? 2 : 1) ? "up" : def && atk < def.atk * (o.golden ? 2 : 1) ? "down" : ""}`, text: String(atk) }), h("span", { class: `hp ${def && hp > def.hp * (o.golden ? 2 : 1) ? "up" : def && hp < def.hp * (o.golden ? 2 : 1) ? "down" : ""}`, text: String(hp) })),
    kind === "GEAR" && h("div", { class: "stats gear-label", text: "GEAR" }),
  );
}

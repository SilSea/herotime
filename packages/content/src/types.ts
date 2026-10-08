import type { CardDef, ContentRules, FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef, SoundsDef } from "@herotime/shared";
import { cardText, heroText, relicText } from "./text.js";
import { cardTextTh, heroTextTh, relicTextTh, spaceThai } from "./text-th.js";

/** Everything one content set contains. The server feeds this to the engine's Content. */
export interface ContentSetData {
  factions: FactionDef[];
  series: SeriesDef[];
  cards: CardDef[];
  gauges: GaugeDef[];
  relics: RelicDef[];
  heroes: HeroDef[];
  /** Game-wide rule numbers (prices, sizes, Roll Call, Gattai, Giant...). Missing ones use the engine defaults. */
  rules?: ContentRules;
  /** Uploaded sounds and music (see SOUND_SLOTS / MUSIC_SLOTS); absent = built-in sounds only. */
  sounds?: SoundsDef;
}

/** Fill in rules text for anything whose author did not write any. */
export function withGeneratedText(set: ContentSetData): ContentSetData {
  // Cards first, then factions and series, so a target filter reads "Ally units", not "ally units".
  // Gauges are looked up as "gauge:<key>": their keys share names with factions ("rider").
  const byKey = new Map<string, string>([...set.gauges.map((g) => [`gauge:${g.key}`, g.name] as const), ...set.series.map((s) => [s.key, s.name] as const), ...set.factions.map((f) => [f.key, f.name] as const), ...set.cards.map((c) => [c.key, c.name] as const)]);
  const names = (key: string): string => byKey.get(key) ?? key;
  return {
    ...set,
    // A hand-written English text has no generated Thai: the client shows the English one rather than a mismatch.
    cards: set.cards.map((c) => (c.text ? c : { ...c, text: cardText(c, names), textTh: c.textTh || spaceThai(cardTextTh(c, names)) })),
    relics: set.relics.map((r) => (r.text ? r : { ...r, text: relicText(r, names), textTh: r.textTh || spaceThai(relicTextTh(r, names)) })),
    heroes: set.heroes.map((h) => (h.text ? h : { ...h, text: heroText(h, names), textTh: h.textTh || spaceThai(heroTextTh(h, names)) })),
  };
}

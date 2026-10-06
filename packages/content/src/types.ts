import type { CardDef, FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";
import { cardText, heroText, relicText } from "./text.js";

/** Everything one content set contains. The server feeds this to the engine's Content. */
export interface ContentSetData {
  factions: FactionDef[];
  series: SeriesDef[];
  cards: CardDef[];
  gauges: GaugeDef[];
  relics: RelicDef[];
  heroes: HeroDef[];
}

/** Fill in rules text for anything whose author did not write any. */
export function withGeneratedText(set: ContentSetData): ContentSetData {
  // Cards first, then factions and series, so a target filter reads "Ally units", not "ally units".
  const byKey = new Map<string, string>([...set.series.map((s) => [s.key, s.name] as const), ...set.factions.map((f) => [f.key, f.name] as const), ...set.cards.map((c) => [c.key, c.name] as const)]);
  const names = (key: string): string => byKey.get(key) ?? key;
  return {
    ...set,
    cards: set.cards.map((c) => (c.text ? c : { ...c, text: cardText(c, names) })),
    relics: set.relics.map((r) => (r.text ? r : { ...r, text: relicText(r, names) })),
    heroes: set.heroes.map((h) => (h.text ? h : { ...h, text: heroText(h, names) })),
  };
}

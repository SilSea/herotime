import type { CardDef, ContentSnapshot, FactionDef, HeroDef, RelicDef } from "./protocol.js";

/** Lookups over the content the server sent. Unknown keys fall back to the key itself so a stale client never crashes. */
export class ContentIndex {
  readonly cards = new Map<string, CardDef>();
  readonly factions = new Map<string, FactionDef>();
  readonly relics = new Map<string, RelicDef>();
  readonly heroes = new Map<string, HeroDef>();

  constructor(readonly snapshot: ContentSnapshot) {
    for (const c of snapshot.cards) this.cards.set(c.key, c);
    for (const f of snapshot.factions) this.factions.set(f.key, f);
    for (const r of snapshot.relics) this.relics.set(r.key, r);
    for (const h of snapshot.heroes) this.heroes.set(h.key, h);
  }

  card(key: string): CardDef | undefined {
    return this.cards.get(key);
  }

  cardName = (key: string): string => this.cards.get(key)?.name ?? key;
  heroName = (key: string): string => this.heroes.get(key)?.name ?? key;
  relicName = (key: string): string => this.relics.get(key)?.name ?? key;
  factionName = (key: string): string => this.factions.get(key)?.name ?? key;
  factionColor = (key: string): string => this.factions.get(key)?.color ?? "#888888";

  /** The faction colour a card is drawn with: its first faction, or neutral grey. */
  cardColor(key: string): string {
    const first = this.cards.get(key)?.factions[0];
    return first ? this.factionColor(first) : "#9e9e9e";
  }

  /** One or two letters for the placeholder art. */
  initials(key: string): string {
    const words = this.cardName(key).split(/[\s_-]+/).filter(Boolean);
    return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
  }

  /** Where the card's art lives, or undefined to draw the placeholder. */
  artUrl(key: string): string | undefined {
    const art = this.cards.get(key)?.art;
    if (!art) return undefined;
    return /^(https?:)?\//.test(art) ? art : `/art/${art}`;
  }
}

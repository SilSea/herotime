import { Injectable } from "@nestjs/common";
import { Content } from "@herotime/engine";
import { getContentSet } from "@herotime/content";
import { CardDef, FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";
import { z } from "zod";

const ContentFile = z.object({
  factions: z.array(FactionDef).default([]),
  cards: z.array(CardDef),
  series: z.array(SeriesDef).default([]),
  gauges: z.array(GaugeDef).default([]),
  relics: z.array(RelicDef).default([]),
  heroes: z.array(HeroDef).default([]),
});

/** Parse and cross-check content JSON. Throws with every problem listed if it is not playable. */
export function parseContent(raw: unknown): Content {
  const data = ContentFile.parse(raw);
  const content = new Content(data); // throws on dangling references
  if (content.heroes.size < 2) throw new Error("content needs at least 2 heroes");
  if (![...content.cards.values()].some((c) => c.kind === "UNIT" && !c.token)) {
    throw new Error("content needs at least one shop unit");
  }
  return content;
}

/**
 * Holds the content new matches are built from. Today it loads a JSON file; once the admin editor
 * exists this becomes "the latest published ContentVersion". A running match keeps the Content it
 * started with, so republishing never changes a game in progress.
 */
@Injectable()
export class ContentService {
  private current: Content;
  private version = 1;

  constructor(content: Content, readonly setName = "custom") {
    this.current = content;
  }

  /** Everything the web client needs to draw cards, as plain JSON. */
  snapshot(): Record<string, unknown> {
    const c = this.current;
    return {
      set: this.setName,
      version: this.version,
      factions: [...c.factions.values()],
      series: [...c.series.values()],
      cards: [...c.cards.values()],
      gauges: [...c.gauges.values()],
      relics: [...c.relics.values()],
      heroes: [...c.heroes.values()],
    };
  }

  /** Build from a named set in @herotime/content ("prototype", "production"). */
  static fromSet(name: string): ContentService {
    return new ContentService(parseContent(getContentSet(name)), name);
  }

  get latest(): { content: Content; version: number } {
    return { content: this.current, version: this.version };
  }

  /** Swap in new content for matches that start from now on. */
  publish(content: Content): number {
    this.current = content;
    return ++this.version;
  }
}

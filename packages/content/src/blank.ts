import { hero, unit } from "./dsl.js";
import type { ContentSetData } from "./types.js";

/**
 * BLANK set: a clean start for building the production content in the Admin editor. It holds only what a
 * match cannot start without (2 heroes to choose from and 1 tavern unit); replace or delete them once
 * real cards exist. No factions, series, gauges or relics. Pick it with CONTENT_SET=blank.
 */
export const blankRaw: ContentSetData = {
  rules: { rollCallColors: 3 },
  factions: [],
  series: [],
  cards: [unit("placeholder_unit", "Placeholder Unit", { rank: 1, atk: 2, hp: 2, text: "A stand-in so the tavern is never empty. Delete it once real units exist." })],
  gauges: [],
  relics: [],
  heroes: [
    hero("placeholder_hero_a", "Placeholder Hero A", { armor: 0 }),
    hero("placeholder_hero_b", "Placeholder Hero B", { armor: 0 }),
  ],
};

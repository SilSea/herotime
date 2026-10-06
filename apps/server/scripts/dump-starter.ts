// Writes content/starter.json from the engine's test world. Run: pnpm --filter @herotime/server exec tsx scripts/dump-starter.ts
// This is placeholder content so the server is playable before the admin editor and real seed data exist.
import { writeFileSync } from "node:fs";
import { buildWorld } from "../../../packages/engine/src/testing-world.js";

const w = buildWorld();
const data = {
  cards: [...w.cards.values()],
  series: [...w.series.values()],
  gauges: [...w.gauges.values()],
  relics: [...w.relics.values()],
  heroes: [...w.heroes.values()],
};
writeFileSync(new URL("../content/starter.json", import.meta.url), JSON.stringify(data, null, 2) + "\n");
console.log(`wrote ${data.cards.length} cards, ${data.heroes.length} heroes, ${data.relics.length} relics`);

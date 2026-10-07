import { blankRaw } from "./blank.js";
import type { ContentSetData } from "./types.js";

/**
 * PRODUCTION set: starts blank. The real cards, factions, series, relics and heroes are made in the Admin
 * editor and published as versions; only what a match needs to start is here (see blank.ts). The former
 * production line-up is now the prototype set, used for testing.
 */
export const productionRaw: ContentSetData = blankRaw;

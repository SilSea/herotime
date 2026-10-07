import { productionRaw } from "./production.js";
import { prototypeRaw } from "./prototype.js";
import { blankRaw } from "./blank.js";
import { withGeneratedText, type ContentSetData } from "./types.js";

export * from "./dsl.js";
export * from "./text.js";
export * from "./text-th.js";
export * from "./types.js";

/** Sets exactly as authored: this is what gets stored as the first published version. */
export const RAW_CONTENT_SETS: Record<string, ContentSetData> = { prototype: prototypeRaw, production: productionRaw, blank: blankRaw };

/** Every set that can be selected with CONTENT_SET, with rules text filled in. */
export const CONTENT_SETS: Record<string, ContentSetData> = Object.fromEntries(Object.entries(RAW_CONTENT_SETS).map(([k, v]) => [k, withGeneratedText(v)]));

export const prototype = CONTENT_SETS.prototype as ContentSetData;
export const production = CONTENT_SETS.production as ContentSetData;

function lookup(sets: Record<string, ContentSetData>, name: string): ContentSetData {
  const set = sets[name];
  if (!set) throw new Error(`unknown content set "${name}" (available: ${Object.keys(sets).join(", ")})`);
  return set;
}

export const getContentSet = (name: string): ContentSetData => lookup(CONTENT_SETS, name);
export const getRawContentSet = (name: string): ContentSetData => lookup(RAW_CONTENT_SETS, name);

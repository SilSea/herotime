import { production } from "./production.js";
import { prototype } from "./prototype.js";
import type { ContentSetData } from "./types.js";

export * from "./dsl.js";
export * from "./text.js";
export * from "./types.js";
export { production, prototype };

/** Every set that can be selected with CONTENT_SET. */
export const CONTENT_SETS: Record<string, ContentSetData> = { prototype, production };

export function getContentSet(name: string): ContentSetData {
  const set = CONTENT_SETS[name];
  if (!set) throw new Error(`unknown content set "${name}" (available: ${Object.keys(CONTENT_SETS).join(", ")})`);
  return set;
}

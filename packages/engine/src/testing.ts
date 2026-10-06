import { CardDef, Effect } from "@herotime/shared";
import { Content, type ContentData } from "./content.js";
import type { CombatUnitInput } from "./types.js";

/** Test builders: parse through the real zod schemas so tests can't drift from the contract. */
export const card = (key: string, over: Record<string, unknown> = {}): CardDef =>
  CardDef.parse({ key, name: key, rank: 1, atk: 1, hp: 1, ...over });

export const effect = (e: Record<string, unknown>): Effect => Effect.parse(e);

export const content = (data: ContentData): Content => new Content(data);

export const fighter = (
  cardKey: string,
  atk: number,
  hp: number,
  extra: Partial<CombatUnitInput> = {},
): CombatUnitInput => ({ cardKey, rank: 1, atk, hp, ...extra });

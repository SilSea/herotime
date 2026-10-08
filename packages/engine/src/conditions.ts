import type { Condition, SentaiColor } from "@herotime/shared";

/** The bits of a unit that conditions and selectors care about (board units and fighters both fit). */
export interface UnitView {
  factions?: readonly string[];
  colors?: readonly SentaiColor[];
  series?: string;
  /** Its card key plus every card it is a later form of (see Content.lineage). */
  names?: readonly string[];
}

/** Whether a unit is one of `cards` (or a form one of them turned into). */
export const isOneOf = (names: readonly string[] | undefined, cards: readonly string[]): boolean =>
  names !== undefined && names.some((n) => cards.includes(n));

const REAL_COLORS: readonly SentaiColor[] = ["RED", "BLUE", "YELLOW", "GREEN", "PINK", "BLACK", "WHITE", "PURPLE", "SILVER", "GOLD", "ORANGE"];

/**
 * Team-Up / Roll Call color count: distinct real colors, plus one per Extra
 * (a wildcard fills any missing color), never above the number of real colors.
 */
export function sentaiColorCount(units: readonly UnitView[]): number {
  const seen = new Set<SentaiColor>();
  let extras = 0;
  for (const u of units) {
    for (const c of u.colors ?? []) {
      if (c === "EXTRA") extras++;
      else seen.add(c);
    }
  }
  return Math.min(REAL_COLORS.length, seen.size + extras);
}

export function checkCondition(
  condition: Condition | undefined,
  friendly: readonly UnitView[],
  energy?: number,
): boolean {
  if (condition === undefined) return true;
  switch (condition.type) {
    case "TEAM_UP_COLORS_GTE":
      return sentaiColorCount(friendly) >= condition.value;
    case "FACTION_COUNT_GTE":
      return friendly.filter((u) => u.factions?.includes(condition.faction)).length >= condition.value;
    case "SERIES_COUNT_GTE":
      return friendly.filter((u) => u.series === condition.series).length >= condition.value;
    case "ENERGY_GTE":
      return energy !== undefined && energy >= condition.value;
    case "HAS_CARD":
      return friendly.some((u) => isOneOf(u.names, condition.cards));
  }
}

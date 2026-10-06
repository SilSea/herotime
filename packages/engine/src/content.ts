import type { Action, CardDef, Effect, GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";
import type { CombatUnitInput, Keyword } from "./types.js";

export interface ContentData {
  cards?: readonly CardDef[];
  series?: readonly SeriesDef[];
  gauges?: readonly GaugeDef[];
  relics?: readonly RelicDef[];
  heroes?: readonly HeroDef[];
}

/** A unit the player owns. `golden` = Final Form (made by a triple). */
export interface Unit {
  key: string;
  golden: boolean;
  /** Permanent buffs picked up in the recruit phase or carried over from combat. */
  bonusAtk?: number;
  bonusHp?: number;
  /** Keywords granted on top of the card's own. */
  keywords?: Keyword[];
  /** End-of-turns spent on the board; drives Henshin(N). */
  turns?: number;
}

function index<T extends { key: string }>(kind: string, items: readonly T[] = []): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.key)) throw new Error(`duplicate ${kind} key: ${item.key}`);
    map.set(item.key, item);
  }
  return map;
}

function* actionsOf(effects: readonly Effect[] | undefined): Generator<Action> {
  for (const e of effects ?? []) yield* e.actions;
}

/** Immutable, validated snapshot of everything an admin can edit (one ContentVersion). */
export class Content {
  readonly cards: Map<string, CardDef>;
  readonly series: Map<string, SeriesDef>;
  readonly gauges: Map<string, GaugeDef>;
  readonly relics: Map<string, RelicDef>;
  readonly heroes: Map<string, HeroDef>;

  constructor(data: ContentData) {
    this.cards = index("card", data.cards);
    this.series = index("series", data.series);
    this.gauges = index("gauge", data.gauges);
    this.relics = index("relic", data.relics);
    this.heroes = index("hero", data.heroes);

    const problems = this.validate();
    if (problems.length > 0) throw new Error(`invalid content:\n- ${problems.join("\n- ")}`);
  }

  card(key: string): CardDef {
    const def = this.cards.get(key);
    if (!def) throw new Error(`unknown card: ${key}`);
    return def;
  }

  /** Every dangling reference (card/series/gauge keys). Empty when content is consistent. */
  validate(): string[] {
    const problems: string[] = [];
    const needCard = (key: string, from: string): void => {
      if (!this.cards.has(key)) problems.push(`${from} references unknown card "${key}"`);
    };
    const needSeries = (key: string | undefined, from: string): void => {
      if (key !== undefined && !this.series.has(key)) problems.push(`${from} references unknown series "${key}"`);
    };
    const checkActions = (actions: Iterable<Action>, from: string): void => {
      for (const a of actions) {
        if (a.type === "SUMMON" || a.type === "ADD_TO_HAND") needCard(a.cardKey, from);
        else if (a.type === "TRANSFORM") needCard(a.into, from);
        else if (a.type === "GAUGE_ADD" && !this.gauges.has(a.gauge)) {
          problems.push(`${from} references unknown gauge "${a.gauge}"`);
        }
      }
    };

    for (const c of this.cards.values()) {
      needSeries(c.series, `card "${c.key}"`);
      if (c.henshin) needCard(c.henshin.into, `card "${c.key}" henshin`);
      checkActions(actionsOf(c.effects), `card "${c.key}"`);
    }
    for (const s of this.series.values()) {
      for (const b of s.bonds) checkActions(actionsOf(b.effects), `series "${s.key}" bond`);
    }
    for (const g of this.gauges.values()) {
      for (const t of g.thresholds) checkActions(t.reward, `gauge "${g.key}"`);
    }
    for (const r of this.relics.values()) {
      needSeries(r.series, `relic "${r.key}"`);
      checkActions(actionsOf(r.effects), `relic "${r.key}"`);
    }
    for (const h of this.heroes.values()) {
      checkActions(actionsOf(h.power?.effects), `hero "${h.key}"`);
    }
    return problems;
  }

  /** Current ATK/HP of an owned unit: (base x2 if golden) + permanent bonuses. */
  stats(unit: Unit): { atk: number; hp: number } {
    const def = this.card(unit.key);
    const mult = unit.golden ? 2 : 1;
    return { atk: def.atk * mult + (unit.bonusAtk ?? 0), hp: def.hp * mult + (unit.bonusHp ?? 0) };
  }

  /** Snapshot an owned unit for combat. `sourceId` lets permanent buffs be written back. */
  toCombat(unit: Unit, sourceId?: string): CombatUnitInput {
    const def = this.card(unit.key);
    const { atk, hp } = this.stats(unit);
    const input: CombatUnitInput = {
      cardKey: def.key,
      rank: def.rank,
      atk,
      hp,
      keywords: [...new Set([...def.keywords, ...(unit.keywords ?? [])])],
      effects: def.effects,
      factions: def.factions,
      colors: def.colors,
      golden: unit.golden,
    };
    if (def.series !== undefined) input.series = def.series;
    if (sourceId !== undefined) input.sourceId = sourceId;
    return input;
  }
}

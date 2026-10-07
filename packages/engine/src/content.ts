import type { Action, CardDef, Effect, FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";
import { isRule } from "./rules.js";
import type { CombatUnitInput, Keyword } from "./types.js";

export interface ContentData {
  factions?: readonly FactionDef[];
  cards?: readonly CardDef[];
  series?: readonly SeriesDef[];
  gauges?: readonly GaugeDef[];
  relics?: readonly RelicDef[];
  heroes?: readonly HeroDef[];
  /** Game-wide rule numbers for this content (see ContentRules). */
  rules?: Readonly<Record<string, number | undefined>>;
  /** Uploaded sounds; the engine only carries them to the client. */
  sounds?: unknown;
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
  /** Who gave the permanent bonuses above, one entry per source (for showing on the card). */
  buffs?: BuffRecord[];
  /** Copies inside it that never came from the pool (COPY): they do not go back to it either. */
  unpooled?: number;
  /** A combined Gattai form keeps the units it was made of, so they go back to the pool when it leaves. */
  components?: Unit[];
  /** Limited effects: times used this game / this turn, by effect. */
  uses?: Record<string, number>;
  usesTurn?: Record<string, number>;
}

/** Where a permanent bonus came from. `key` is a card, gear, relic or hero key; null for combat. */
export interface BuffRecord {
  kind: "card" | "gear" | "relic" | "hero" | "combat" | "gattai";
  key: string | null;
  atk: number;
  hp: number;
  keywords?: Keyword[];
}

/** Add a bonus to a unit's record, merging with an earlier one from the same source. */
export function recordBuff(unit: Unit, from: Pick<BuffRecord, "kind" | "key">, atk: number, hp: number, keyword?: Keyword): void {
  const list = (unit.buffs ??= []);
  let entry = list.find((b) => b.kind === from.kind && b.key === from.key);
  if (!entry) {
    entry = { kind: from.kind, key: from.key, atk: 0, hp: 0 };
    list.push(entry);
  }
  entry.atk += atk;
  entry.hp += hp;
  if (keyword && !(entry.keywords ?? []).includes(keyword)) entry.keywords = [...(entry.keywords ?? []), keyword];
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
  /** Game-wide rule numbers from the content set (missing ones use the engine defaults). */
  readonly rules: Readonly<Record<string, number | undefined>>;
  /** Uploaded sounds and music, passed through untouched. */
  readonly sounds: unknown;
  readonly cards: Map<string, CardDef>;
  /** Empty = the content does not declare factions, so card faction strings are free-form. */
  readonly factions: Map<string, FactionDef>;
  readonly series: Map<string, SeriesDef>;
  readonly gauges: Map<string, GaugeDef>;
  readonly relics: Map<string, RelicDef>;
  readonly heroes: Map<string, HeroDef>;

  constructor(data: ContentData) {
    this.cards = index("card", data.cards);
    this.factions = index("faction", data.factions);
    this.series = index("series", data.series);
    this.gauges = index("gauge", data.gauges);
    this.relics = index("relic", data.relics);
    this.heroes = index("hero", data.heroes);
    this.rules = { ...(data.rules ?? {}) };
    this.sounds = data.sounds ?? { slots: {}, music: {} };

    const problems = this.validate();
    if (problems.length > 0) throw new Error(`invalid content:\n- ${problems.join("\n- ")}`);
  }

  private lineageCache = new Map<string, readonly string[]>();

  /**
   * The card key plus every card that turns into it through Henshin or Ultimate Form
   * (Zeztz Ultimate -> [zeztz_ultimate, zeztz]), so a filter naming a card also finds its later forms.
   */
  lineage(key: string): readonly string[] {
    const hit = this.lineageCache.get(key);
    if (hit) return hit;
    const from = new Map<string, string[]>();
    for (const c of this.cards.values()) {
      for (const into of [c.henshin?.into, c.ultimateInto]) {
        if (into !== undefined) from.set(into, [...(from.get(into) ?? []), c.key]);
      }
    }
    const out = [key];
    for (let i = 0; i < out.length; i++) for (const k of from.get(out[i]!) ?? []) if (!out.includes(k)) out.push(k);
    this.lineageCache.set(key, out);
    return out;
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
    // Faction names are only checked once the content declares its factions.
    const needFaction = (key: string | undefined, from: string): void => {
      if (key !== undefined && this.factions.size > 0 && !this.factions.has(key)) {
        problems.push(`${from} references unknown faction "${key}"`);
      }
    };
    const checkFilters = (effects: readonly Effect[], from: string): void => {
      for (const e of effects) {
        needFaction(e.target?.faction, from);
        if (e.condition?.type === "FACTION_COUNT_GTE") needFaction(e.condition.faction, from);
        for (const k of e.target?.cards ?? []) needCard(k, from);
        if (e.condition?.type === "HAS_CARD") for (const k of e.condition.cards) needCard(k, from);
        checkPhase(e, from);
      }
    };
    // Some actions and targets only make sense in one phase; the engine refuses them in the other at run time.
    const FIGHT = new Set(["START_OF_COMBAT", "ON_ATTACK", "AFTER_DAMAGED", "LAST_STAND", "AVENGE"]);
    // GAIN_ENERGY, ADD_TO_HAND, RANDOM_CARD, DISCOVER_UNIT, GAUGE_ADD, BUFF_SHOP and BUFF_GEAR work in fights too: they arrive next turn.
    const RECRUIT_ONLY = new Set(["MODIFY_RULE", "DISCOVER_GIANT", "SUPER_GATTAI", "ULTIMATE_FORM", "DEVOUR_SHOP", "DISCARD"]);
    // Triggers only the player gets (relic picked, hero power used, Roll Call): a unit effect on them never runs.
    const PLAYER_ONLY = new Set(["ON_ACQUIRE", "ON_USE", "ON_ROLL_CALL", "ON_ROLL_CALL_WIN"]);
    const checkPhase = (e: Effect, from: string): void => {
      if (e.scope === "UNIT" && PLAYER_ONLY.has(e.trigger) && !from.startsWith("relic") && !from.startsWith("hero")) {
        problems.push(`${from}: a unit effect never gets ${e.trigger} (it is for relics, heroes and Gauges)`);
      }
      if (e.target?.selector === "SUMMONED" && e.trigger !== "ALLY_SUMMONED") problems.push(`${from}: target SUMMONED only works with ALLY_SUMMONED`);
      // A summon can happen in either phase, so its reactions must work in both.
      if (e.trigger === "ALLY_SUMMONED") {
        for (const a of e.actions) if (RECRUIT_ONLY.has(a.type) || a.type === "DAMAGE") problems.push(`${from}: ${a.type} cannot be used on ALLY_SUMMONED (summons happen in fights too)`);
        if (e.target?.selector.endsWith("_ENEMY")) problems.push(`${from}: ALLY_SUMMONED cannot target enemies`);
        return;
      }
      const fight = FIGHT.has(e.trigger);
      for (const a of e.actions) {
        if (fight && RECRUIT_ONLY.has(a.type)) problems.push(`${from}: ${a.type} only works in the recruit phase, not on ${e.trigger}`);
        if (!fight && a.type === "DAMAGE") problems.push(`${from}: DAMAGE only works in a fight, not on ${e.trigger}`);
      }
      if (!fight && e.target?.selector.endsWith("_ENEMY") && e.actions.some((a) => a.type === "BUFF" || a.type === "GIVE_KEYWORD" || a.type === "TRANSFORM" || a.type === "DESTROY" || a.type === "COPY")) {
        problems.push(`${from}: enemies can only be targeted in a fight, not on ${e.trigger}`);
      }
    };
    const checkActions = (actions: Iterable<Action>, from: string): void => {
      for (const a of actions) {
        if (a.type === "SUMMON" || a.type === "ADD_TO_HAND") needCard(a.cardKey, from);
        else if (a.type === "DISCOVER_UNIT" || a.type === "RANDOM_CARD" || a.type === "DEVOUR_SHOP") needFaction(a.faction, from);
        else if (a.type === "TRANSFORM") needCard(a.into, from);
        else if (a.type === "GAUGE_ADD" && !this.gauges.has(a.gauge)) {
          problems.push(`${from} references unknown gauge "${a.gauge}"`);
        } else if (a.type === "MODIFY_RULE" && !isRule(a.rule)) {
          problems.push(`${from} modifies unknown rule "${a.rule}"`);
        }
      }
    };

    for (const c of this.cards.values()) {
      const from = `card "${c.key}"`;
      needSeries(c.series, from);
      for (const f of c.factions) needFaction(f, from);
      checkFilters(c.effects, from);
      if (c.henshin) needCard(c.henshin.into, `${from} henshin`);
      if (c.ultimateInto) needCard(c.ultimateInto, `${from} ultimateInto`);
      if (c.gattaiInto) {
        needCard(c.gattaiInto, `${from} gattaiInto`);
        const form = this.cards.get(c.gattaiInto);
        if (form && form.kind !== "UNIT") problems.push(`${from} gattaiInto: "${c.gattaiInto}" must be a unit`);
        if (!c.keywords.includes("GATTAI")) problems.push(`${from} has gattaiInto but not the GATTAI keyword`);
      }
      checkActions(actionsOf(c.effects), from);
      for (const e of c.effects) {
        if (c.kind === "GEAR" && !(e.scope === "PLAYER" && (e.trigger === "ON_PLAY" || e.trigger === "ON_DISCARD"))) {
          problems.push(`${from} is gear: its effects must be player-scope ON_PLAY (or ON_DISCARD)`);
        } else if (c.kind !== "GEAR" && e.scope !== "UNIT") {
          problems.push(`${from} has a player-scope effect, which only gear may have`);
        }
      }
    }
    for (const s of this.series.values()) {
      for (const b of s.bonds) {
        const from = `series "${s.key}" bond`;
        checkActions(actionsOf(b.effects), from);
        checkFilters(b.effects, from);
        for (const e of b.effects) {
          if (e.scope !== "PLAYER" || e.trigger !== "START_OF_COMBAT") {
            problems.push(`${from} effects must be player-scope START_OF_COMBAT`);
          }
        }
      }
    }
    // Rewards run with no source unit, so actions that need a target would silently do nothing.
    const targetless = new Set(["GAIN_ENERGY", "GAUGE_ADD", "MODIFY_RULE", "ADD_TO_HAND", "DISCOVER_GIANT", "DISCOVER_UNIT", "SUPER_GATTAI", "SUMMON", "RANDOM_CARD", "BUFF_SHOP", "SUMMON_FROM_HAND"]);
    for (const g of this.gauges.values()) {
      for (const t of g.thresholds) {
        const from = `gauge "${g.key}"`;
        checkActions(t.reward, from);
        for (const a of t.reward) {
          if (!targetless.has(a.type)) problems.push(`${from} reward uses ${a.type}, which needs a target`);
        }
      }
    }
    for (const r of this.relics.values()) {
      needSeries(r.series, `relic "${r.key}"`);
      for (const f of r.factions) needFaction(f, `relic "${r.key}"`);
      checkFilters(r.effects, `relic "${r.key}"`);
      checkActions(actionsOf(r.effects), `relic "${r.key}"`);
    }
    for (const h of this.heroes.values()) {
      checkActions(actionsOf(h.power?.effects), `hero "${h.key}"`);
      checkFilters(h.power?.effects ?? [], `hero "${h.key}"`);
    }
    return problems;
  }

  /** Current ATK/HP of an owned unit: (base x2 if golden) + permanent bonuses. */
  stats(unit: Unit): { atk: number; hp: number } {
    const def = this.card(unit.key);
    const mult = unit.golden ? 2 : 1;
    return { atk: def.atk * mult + (unit.bonusAtk ?? 0), hp: def.hp * mult + (unit.bonusHp ?? 0) };
  }

  /** Every copy a unit holds in the pool: itself if pooled, plus the parts of a combined Gattai form. */
  pooledCopies(unit: Unit): { key: string; copies: number }[] {
    const own = [{ key: unit.key, copies: unit.golden ? 3 : 1 }];
    return [...own, ...(unit.components ?? []).flatMap((p) => this.pooledCopies(p))];
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

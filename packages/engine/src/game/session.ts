import type { Effect } from "@herotime/shared";
import { recordBuff, type Unit } from "../content.js";
import type { CombatOptions } from "../combat/combat.js";
import { combatRulesOf, withRules } from "../rules.js";
import { DEFAULT_COMBAT_RULES } from "../config.js";
import {
  buy,
  play,
  RuleError,
  sell,
  spend,
  startTurn,
  type PlayerState,
} from "../shop/economy.js";
import { chooseDiscover, resolveTriples, type TripleResult } from "../shop/triple.js";
import type { CombatResult, CombatSideExtras, CombatUnitInput, Keyword, Side } from "../types.js";
import { fireGaugeTrigger, matchesTarget, needsTargets, runTrigger, swapKey, type Origin } from "./effects.js";
import type { GameEnv } from "./env.js";

// ------------------------------------------------------------ recruit intents

/** Start a recruit phase: refill energy, roll the shop, then run ON_TURN_START (relics, hero). */
export function beginTurn(player: PlayerState, turn: number, env: GameEnv): void {
  startTurn(player, turn, env.pool, env.rng, env.cfg, env.gear);
  for (const { effects, origin } of playerEffectSources(player, env)) runTrigger(effects, "ON_TURN_START", "PLAYER", null, player, env, origin);
}

/** Buy from the shop; a purchase that completes a triple merges immediately. */
export function buyUnit(player: PlayerState, shopIndex: number, env: GameEnv): TripleResult[] {
  buy(player, shopIndex, env.cfg);
  return resolveTriples(player, env.pool, env.rng, env.cfg);
}

/** Put a unit on the board, run its Henshin Call (ON_PLAY), then resolve any triple. */
export function playUnit(player: PlayerState, handIndex: number, position: number, env: GameEnv): TripleResult[] {
  const card = player.hand[handIndex];
  if (card === undefined) throw new RuleError(`no hand slot ${handIndex}`);
  const def = env.content.card(card.key);
  if (def.kind !== "UNIT") throw new RuleError(`${def.name} is not a unit${def.kind === "GEAR" ? " (use it instead)" : ""}`);

  play(player, handIndex, position, env.cfg);
  runTrigger(def.effects, "ON_PLAY", "UNIT", card, player, env);
  return resolveTriples(player, env.pool, env.rng, env.cfg);
}

/**
 * The Gattai group whose core (leftmost) is at `index`, if it can be combined for good: the core names a form,
 * and it plus the units right of it that have GATTAI number at least the Gattai size. Undefined otherwise.
 */
export function gattaiGroupAt(player: PlayerState, index: number, env: GameEnv): { form: string; parts: Unit[] } | undefined {
  const core = player.board[index];
  if (!core) return undefined;
  const form = env.content.card(core.key).gattaiInto;
  if (!form) return undefined;
  // One level only: a combined form is never a part again, even if something later grants it Gattai.
  const hasGattai = (u: Unit): boolean => !u.components && (env.content.card(u.key).keywords.includes("GATTAI") || (u.keywords ?? []).includes("GATTAI"));
  const parts: Unit[] = [];
  for (let i = index; i < player.board.length && hasGattai(player.board[i] as Unit); i++) parts.push(player.board[i] as Unit);
  const size = combatRulesOf(player).gattaiSize ?? env.cfg.combatDefaults?.gattaiSize ?? DEFAULT_COMBAT_RULES.gattaiSize;
  return parts.length >= size ? { form, parts } : undefined;
}

/** Combine a Gattai group into its form for good: one unit with the form's stats plus the parts', freeing slots. */
export function combineGattai(player: PlayerState, index: number, env: GameEnv): void {
  const group = gattaiGroupAt(player, index, env);
  if (!group) throw new RuleError("these units cannot combine: put a Gattai core on the left of enough Gattai units");
  const formDef = env.content.card(group.form);
  let atk = 0;
  let hp = 0;
  const keywords = new Set<Keyword>();
  for (const p of group.parts) {
    const st = env.content.stats(p);
    atk += st.atk;
    hp += st.hp;
    for (const k of [...env.content.card(p.key).keywords, ...(p.keywords ?? [])]) keywords.add(k);
  }
  keywords.delete("GATTAI");
  for (const k of formDef.keywords) keywords.delete(k);
  const combined: Unit = { key: group.form, golden: false, bonusAtk: atk, bonusHp: hp, turns: 0, components: group.parts };
  if (keywords.size > 0) combined.keywords = [...keywords];
  recordBuff(combined, { kind: "gattai", key: (group.parts[0] as Unit).key }, atk, hp);
  player.board.splice(index, group.parts.length, combined);
}

/** Buy the tavern's Gear: it goes to the hand, to be used from there. Its price is the card's own cost. */
export function buyGear(player: PlayerState, env: GameEnv): void {
  const key = player.shopGear;
  if (!key) throw new RuleError("there is no gear in the tavern");
  const c = withRules(player, env.cfg);
  if (player.hand.length >= c.handSize) throw new RuleError("hand is full");
  spend(player, env.content.card(key).cost ?? c.buyCost);
  player.hand.push({ key, golden: false });
  player.shopGear = null;
}

/**
 * Board slots a gear can be used on, or null when it targets nobody in particular (no CHOSEN_FRIENDLY effect).
 * A unit qualifies when it passes the filter of every chosen-target effect.
 */
export function gearTargets(player: PlayerState, gearKey: string, env: GameEnv): number[] | null {
  const chosen = env.content.card(gearKey).effects.filter((e) => e.target?.selector === "CHOSEN_FRIENDLY" && e.actions.some(needsTargets));
  if (chosen.length === 0) return null;
  return player.board.flatMap((u, i) => (chosen.every((e) => matchesTarget(env, u, e.target ?? { selector: "SELF" })) ? [i] : []));
}

/**
 * Use a Gear card from hand: its player-scope ON_PLAY effects run, then it is spent. A gear that goes on a
 * chosen unit needs `target` (a board slot) unless only one unit qualifies; with none it cannot be used.
 */
export function useGear(player: PlayerState, handIndex: number, env: GameEnv, target?: number): void {
  const card = player.hand[handIndex];
  if (card === undefined) throw new RuleError(`no hand slot ${handIndex}`);
  const def = env.content.card(card.key);
  if (def.kind !== "GEAR") throw new RuleError(`${def.name} is not gear`);
  const valid = gearTargets(player, card.key, env);
  let chosen: Unit | undefined;
  if (valid) {
    if (valid.length === 0) throw new RuleError(`${def.name} has no unit to go on`);
    const slot = target ?? (valid.length === 1 ? valid[0] : undefined);
    if (slot === undefined) throw new RuleError(`choose a unit for ${def.name}`);
    if (!valid.includes(slot)) throw new RuleError(`${def.name} cannot go on that unit`);
    chosen = player.board[slot];
  }
  player.hand.splice(handIndex, 1);
  runTrigger(def.effects, "ON_PLAY", "PLAYER", null, player, env, { kind: "gear", key: card.key }, chosen);
}

export function sellUnit(player: PlayerState, from: "board" | "hand", index: number, env: GameEnv): void {
  const unit = (from === "board" ? player.board : player.hand)[index];
  if (unit !== undefined && env.content.card(unit.key).kind === "GEAR") throw new RuleError("gear cannot be sold");
  sell(player, from, index, env.pool, env.cfg);
}

/** Take a Discover pick, then resolve a triple the pick may have completed. */
export function pickDiscover(player: PlayerState, index: number, env: GameEnv): TripleResult[] {
  chooseDiscover(player, index, env.pool, env.cfg);
  return resolveTriples(player, env.pool, env.rng, env.cfg);
}

/**
 * End the recruit phase: END_OF_TURN effects (left to right), then each board unit's turn counter
 * ticks and Henshin(N) units transform, firing HENSHIN effects and feeding Henshin gauges.
 */
export function endTurn(player: PlayerState, env: GameEnv): void {
  for (const unit of [...player.board]) {
    if (!player.board.includes(unit)) continue; // an earlier effect removed it
    runTrigger(env.content.card(unit.key).effects, "END_OF_TURN", "UNIT", unit, player, env);
  }

  for (const unit of [...player.board]) {
    if (!player.board.includes(unit)) continue;
    unit.turns = (unit.turns ?? 0) + 1;
    const henshin = env.content.card(unit.key).henshin;
    if (!henshin || unit.turns < henshin.afterTurns) continue;

    if (!swapKey(unit, henshin.into, env)) continue; // pool cannot cover the new form: try again next turn
    runTrigger(env.content.card(unit.key).effects, "HENSHIN", "UNIT", unit, player, env);
    fireGaugeTrigger(player, env, "HENSHIN");
  }
}

// ------------------------------------------------------------------ hero

export function assignHero(player: PlayerState, heroKey: string, env: GameEnv): void {
  const hero = env.content.heroes.get(heroKey);
  if (!hero) throw new RuleError(`unknown hero: ${heroKey}`);
  player.hero = heroKey;
  runTrigger(hero.power?.effects ?? [], "ON_ACQUIRE", "PLAYER", null, player, env, { kind: "hero", key: heroKey });
}

/** Activate the hero power: ACTIVE = once per turn, ONCE = once per game, PASSIVE = not activatable. */
export function useHeroPower(player: PlayerState, env: GameEnv): void {
  const hero = player.hero ? env.content.heroes.get(player.hero) : undefined;
  const power = hero?.power;
  if (!hero || !power) throw new RuleError("no hero power");
  if (power.mode === "PASSIVE") throw new RuleError("this hero power is passive");
  if (power.mode === "ACTIVE" && player.heroPowerUsed) throw new RuleError("hero power already used this turn");
  if (power.mode === "ONCE" && player.heroPowerSpent) throw new RuleError("hero power already used this game");

  spend(player, power.cost);
  if (power.mode === "ACTIVE") player.heroPowerUsed = true;
  else player.heroPowerSpent = true;
  runTrigger(power.effects, "ON_USE", "PLAYER", null, player, env, { kind: "hero", key: hero.key });
}

// ----------------------------------------------------------------- relics

/** Effect lists that act at the player level: owned relics and the hero power. */
function playerEffectSources(player: PlayerState, env: GameEnv): { effects: Effect[]; origin: Origin }[] {
  const lists = player.relics.map((k) => ({ effects: [...(env.content.relics.get(k)?.effects ?? [])], origin: { kind: "relic", key: k } as Origin }));
  const power = player.hero ? env.content.heroes.get(player.hero)?.power : undefined;
  if (power) lists.push({ effects: [...power.effects], origin: { kind: "hero", key: player.hero as string } });
  return lists;
}

function weightedPick<T extends { weight: number }>(items: readonly T[], env: GameEnv): T | undefined {
  const total = items.reduce((n, i) => n + i.weight, 0);
  if (total <= 0) return undefined;
  let roll = env.rng.int(total);
  for (const item of items) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return undefined;
}

function topKey(counts: Map<string, number>): string | undefined {
  let best: string | undefined;
  for (const key of [...counts.keys()].sort()) {
    if (best === undefined || (counts.get(key) ?? 0) > (counts.get(best) ?? 0)) best = key;
  }
  return best;
}

/**
 * Offer 4 relics of `tier`: one for the board's main faction, one for its main series, two random,
 * and always at least one free option. Several players may be offered, and hold, the same relic.
 */
export function offerRelics(
  player: PlayerState,
  tier: "LESSER" | "GREATER",
  env: GameEnv,
): string[] {
  if (player.relics.some((k) => env.content.relics.get(k)?.tier === tier)) {
    throw new RuleError(`already holding a ${tier.toLowerCase()} relic`);
  }

  // A relic tied to factions or a series only shows up when this match uses them.
  const usable = (r: { factions: readonly string[]; series?: string | undefined }): boolean =>
    (r.factions.length === 0 || !env.activeFactions || r.factions.some((f) => env.activeFactions?.has(f))) &&
    (r.series === undefined || !env.activeSeries || env.activeSeries.has(r.series));
  let pool = [...env.content.relics.values()].filter((r) => r.tier === tier && usable(r));
  const chosen: typeof pool = [];
  const take = (r: (typeof pool)[number] | undefined): void => {
    if (!r) return;
    chosen.push(r);
    pool = pool.filter((x) => x !== r);
  };

  const factions = new Map<string, number>();
  const series = new Map<string, number>();
  for (const u of player.board) {
    const def = env.content.card(u.key);
    for (const f of def.factions) factions.set(f, (factions.get(f) ?? 0) + 1);
    if (def.series !== undefined) series.set(def.series, (series.get(def.series) ?? 0) + 1);
  }
  const mainFaction = topKey(factions);
  const mainSeries = topKey(series);

  if (mainFaction !== undefined) take(weightedPick(pool.filter((r) => r.factions.includes(mainFaction)), env));
  if (mainSeries !== undefined) take(weightedPick(pool.filter((r) => r.series === mainSeries), env));
  while (chosen.length < 4) {
    const next = weightedPick(pool, env);
    if (!next) break;
    take(next);
  }

  if (chosen.length > 0 && !chosen.some((r) => r.cost === 0)) {
    const free = weightedPick(pool.filter((r) => r.cost === 0), env);
    if (free) chosen[chosen.length - 1] = free;
  }

  const options = chosen.map((r) => r.key);
  player.relicOffer = { tier, options };
  return options;
}

/** Pay for and take one offered relic. */
export function chooseRelic(player: PlayerState, index: number, env: GameEnv): string {
  const offer = player.relicOffer;
  if (!offer) throw new RuleError("no relic offer pending");
  const key = offer.options[index];
  if (key === undefined) throw new RuleError(`no relic option ${index}`);
  const def = env.content.relics.get(key);
  if (!def) throw new RuleError(`unknown relic: ${key}`);

  spend(player, def.cost);
  player.relics.push(key);
  delete player.relicOffer;
  runTrigger(def.effects, "ON_ACQUIRE", "PLAYER", null, player, env, { kind: "relic", key });
  return key;
}

/** Timeout fallback: take the free option (offers include one when content allows). */
export function autoChooseRelic(player: PlayerState, env: GameEnv): string | undefined {
  const offer = player.relicOffer;
  if (!offer) return undefined;
  const free = offer.options.findIndex((k) => env.content.relics.get(k)?.cost === 0);
  if (free < 0) {
    delete player.relicOffer;
    return undefined;
  }
  return chooseRelic(player, free, env);
}

// ----------------------------------------------------------------- combat

/** Everything simulateCombat needs for this player's side, snapshotted from their board. */
export function prepareCombat(player: PlayerState, env: GameEnv): { units: CombatUnitInput[]; extras: CombatSideExtras } {
  const units = player.board.map((u, i) => env.content.toCombat(u, `board:${i}`));

  const playerEffects: Effect[] = [];
  for (const { effects } of playerEffectSources(player, env)) {
    playerEffects.push(...effects.filter((e) => e.scope === "PLAYER" && e.trigger === "START_OF_COMBAT"));
  }

  const perSeries = new Map<string, number>();
  for (const u of player.board) {
    const s = env.content.card(u.key).series;
    if (s !== undefined) perSeries.set(s, (perSeries.get(s) ?? 0) + 1);
  }
  for (const [key, count] of perSeries) {
    for (const bond of env.content.series.get(key)?.bonds ?? []) {
      if (count >= bond.count) playerEffects.push(...bond.effects);
    }
  }

  const extras: CombatSideExtras = { playerEffects, rules: { ...env.cfg.combatDefaults, ...combatRulesOf(player) } };
  if (player.giant) extras.giant = env.content.toCombat(player.giant);
  return { units, extras };
}

export function combatOptions(env: GameEnv): Pick<CombatOptions, "content" | "boardSize" | "maxAttacksPerCombat"> {
  return { content: env.content, boardSize: env.cfg.boardSize, maxAttacksPerCombat: env.cfg.maxAttacksPerCombat };
}

/**
 * Write a finished fight back to the player: permanent buffs onto the units that earned them, then
 * Roll Call gauge points. The board must be unchanged since prepareCombat.
 */
export function applyCombatOutcome(player: PlayerState, result: CombatResult, side: Side, env: GameEnv): void {
  for (const [sourceId, gain] of Object.entries(result.permanent[side])) {
    const index = Number(sourceId.replace("board:", ""));
    const unit: Unit | undefined = player.board[index];
    if (!unit) continue;
    unit.bonusAtk = (unit.bonusAtk ?? 0) + gain.atk;
    unit.bonusHp = (unit.bonusHp ?? 0) + gain.hp;
    recordBuff(unit, { kind: "combat", key: null }, gain.atk, gain.hp);
  }
  if (result.rollCall[side]) {
    fireGaugeTrigger(player, env, "ON_ROLL_CALL");
    if (result.winner === side) fireGaugeTrigger(player, env, "ON_ROLL_CALL_WIN");
  }
}

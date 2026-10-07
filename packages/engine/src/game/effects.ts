import type { Action, Effect, Selector, Target } from "@herotime/shared";
import { checkCondition, type UnitView } from "../conditions.js";
import { recordBuff, type BuffRecord, type Unit } from "../content.js";
import { modifyRule, withRules } from "../rules.js";
import { copiesOf, type PlayerState, returnToPool } from "../shop/economy.js";
import type { GameEnv } from "./env.js";

export function unitView(env: GameEnv, unit: Unit): UnitView {
  const def = env.content.card(unit.key);
  const view: UnitView = { factions: def.factions, colors: def.colors };
  if (def.series !== undefined) view.series = def.series;
  return view;
}

export const needsTargets = (a: Action): boolean =>
  a.type === "BUFF" || a.type === "GIVE_KEYWORD" || a.type === "TRANSFORM" || a.type === "DESTROY";

/** Whether a unit passes a target's faction / series filter. */
export function matchesTarget(env: GameEnv, u: Unit, t: Target): boolean {
  const v = unitView(env, u);
  return (t.faction === undefined || (v.factions?.includes(t.faction) ?? false)) && (t.series === undefined || v.series === t.series);
}

function select(
  selector: Selector,
  t: Target,
  source: Unit | null,
  player: PlayerState,
  env: GameEnv,
  chosen?: Unit,
): Unit[] {
  const board = player.board;
  const mine = board.filter((u) => matchesTarget(env, u, t));
  switch (selector) {
    case "SELF":
      return source && board.includes(source) ? [source] : [];
    case "ADJACENT": {
      const i = source ? board.indexOf(source) : -1;
      if (i < 0) return [];
      return [board[i - 1], board[i + 1]].filter((u): u is Unit => u !== undefined);
    }
    case "LEFTMOST_FRIENDLY":
      return mine.slice(0, 1);
    case "RIGHTMOST_FRIENDLY":
      return mine.slice(-1);
    case "RANDOM_FRIENDLY": {
      const pool = mine.filter((u) => u !== source);
      return pool.length > 0 ? [env.rng.pick(pool)] : [];
    }
    case "ALL_FRIENDLY":
      return mine;
    case "CHOSEN_FRIENDLY":
      return chosen && mine.includes(chosen) ? [chosen] : mine.slice(0, 1);
    case "LEFTMOST_ENEMY":
    case "RANDOM_ENEMY":
    case "ALL_ENEMY":
      throw new Error(`selector ${selector} is only valid during combat`);
  }
}

/**
 * Cards created by effects must come out of the shared pool, or selling them would inflate it.
 * Unpooled cards (tokens, gear, giants) are free. False = the pool has run dry.
 */
function reserve(env: GameEnv, key: string, copies = 1): boolean {
  return !env.pool.has(key) || env.pool.take(key, copies);
}

/**
 * Turn an owned unit into another card, moving its pool copies from the old key to the new one.
 * Refuses (returns false) when the pool cannot cover the new card; the unit is left untouched.
 */
export function swapKey(unit: Unit, into: string, env: GameEnv): boolean {
  env.content.card(into); // fail loudly on a bad key
  const copies = copiesOf(unit);
  if (unit.key === into) return true;
  if (!reserve(env, into, copies)) return false;
  if (env.pool.has(unit.key)) env.pool.give(unit.key, copies);
  unit.key = into;
  unit.turns = 0;
  return true;
}

/** Remove a unit from the board and give its pooled copies back (tokens just vanish). */
function removeFromBoard(player: PlayerState, unit: Unit, env: GameEnv): void {
  const i = player.board.indexOf(unit);
  if (i < 0) return;
  player.board.splice(i, 1);
  returnToPool(unit, env.pool);
}

function offerGiants(player: PlayerState, env: GameEnv): void {
  // Only giants of series that can actually appear in this match.
  const giants = [...env.content.cards.values()]
    .filter((c) => c.kind === "GIANT" && (c.series === undefined || !env.activeSeries || env.activeSeries.has(c.series)))
    .sort((a, b) => a.key.localeCompare(b.key));
  if (giants.length === 0) return;

  const perSeries = new Map<string, number>();
  for (const u of player.board) {
    const s = env.content.card(u.key).series;
    if (s !== undefined) perSeries.set(s, (perSeries.get(s) ?? 0) + 1);
  }
  const strength = (series: string | undefined): number => (series === undefined ? 0 : (perSeries.get(series) ?? 0));

  // The giant whose series has the most units on the board is guaranteed to be offered.
  const ranked = [...giants].sort((a, b) => strength(b.series) - strength(a.series));
  const picks = strength(ranked[0]?.series) > 0 && ranked[0] ? [ranked[0]] : [];
  const rest = env.rng.shuffle(giants.filter((g) => !picks.includes(g)));
  const options = [...picks, ...rest].slice(0, 3).map((g) => g.key);
  player.discovers.push({ options, destination: "GIANT" });
}

/** Up to 3 distinct pool units of at most the player's tavern rank (of one faction when given), as a Discover. */
function discoverUnits(player: PlayerState, env: GameEnv, faction: string | undefined): void {
  const accept = (key: string): boolean => faction === undefined || env.content.card(key).factions.includes(faction);
  const options: string[] = [];
  for (let attempts = 0; options.length < 3 && attempts < 20; attempts++) {
    const key = env.pool.draw(env.rng, player.rank, 1, accept);
    if (key === undefined) break;
    if (options.includes(key)) env.pool.give(key);
    else options.push(key);
  }
  if (options.length > 0) player.discovers.push({ options, destination: "HAND" });
}

/** What caused an effect, so a buff can be credited to it on the card. */
export type Origin = Pick<BuffRecord, "kind" | "key">;

function runAction(action: Action, mult: number, source: Unit | null, targets: Unit[], player: PlayerState, env: GameEnv, origin: Origin): void {
  const c = withRules(player, env.cfg);
  switch (action.type) {
    case "BUFF": {
      for (const t of targets) {
        t.bonusAtk = (t.bonusAtk ?? 0) + action.atk * mult;
        t.bonusHp = (t.bonusHp ?? 0) + action.hp * mult;
        recordBuff(t, origin, action.atk * mult, action.hp * mult);
      }
      return;
    }
    case "GIVE_KEYWORD": {
      for (const t of targets) {
        const have = t.keywords ?? [];
        if (!have.includes(action.keyword)) {
          t.keywords = [...have, action.keyword];
          recordBuff(t, origin, 0, 0, action.keyword);
        }
      }
      return;
    }
    case "TRANSFORM": {
      for (const t of targets) swapKey(t, action.into, env);
      return;
    }
    case "DESTROY": {
      for (const t of targets) removeFromBoard(player, t, env);
      return;
    }
    case "SUMMON": {
      env.content.card(action.cardKey);
      const count = action.count * mult;
      for (let n = 0; n < count && player.board.length < c.boardSize; n++) {
        if (!reserve(env, action.cardKey)) break;
        const at = source && player.board.includes(source) ? player.board.indexOf(source) + 1 : player.board.length;
        player.board.splice(at, 0, { key: action.cardKey, golden: false });
      }
      return;
    }
    case "GAIN_ENERGY": {
      player.energy = Math.max(0, Math.min(player.energy + action.amount * mult, c.maxEnergy));
      return;
    }
    case "GAUGE_ADD": {
      addGauge(player, env, action.gauge, action.amount * mult);
      return;
    }
    case "MODIFY_RULE": {
      modifyRule(player, action.rule, action.op, action.value, env.cfg);
      return;
    }
    case "ADD_TO_HAND": {
      env.content.card(action.cardKey);
      if (player.hand.length < c.handSize && reserve(env, action.cardKey)) {
        player.hand.push({ key: action.cardKey, golden: false });
      }
      return;
    }
    case "DISCOVER_GIANT": {
      offerGiants(player, env);
      return;
    }
    case "DISCOVER_UNIT": {
      for (let n = 0; n < mult; n++) discoverUnits(player, env, action.faction);
      return;
    }
    case "DAMAGE":
      throw new Error("action DAMAGE is only valid during combat");
  }
}

/** Run one effect in the recruit phase. `source` is the owning unit (null for player-scope effects). */
export function runEffect(effect: Effect, source: Unit | null, player: PlayerState, env: GameEnv, origin?: Origin, chosen?: Unit): void {
  const board = player.board.map((u) => unitView(env, u));
  if (!checkCondition(effect.condition, board, player.energy)) return;
  const mult = source?.golden ? (effect.goldenMultiplier ?? 2) : 1;
  const target: Target = effect.target ?? { selector: "SELF" };
  const targets = effect.actions.some(needsTargets) ? select(target.selector, target, source, player, env, chosen) : [];
  const from: Origin = origin ?? (source ? { kind: "card", key: source.key } : { kind: "card", key: null });
  for (const action of effect.actions) runAction(action, mult, source, targets, player, env, from);
}

/** Run every effect in `effects` that matches `trigger` and `scope`. */
export function runTrigger(
  effects: readonly Effect[],
  trigger: Effect["trigger"],
  scope: Effect["scope"],
  source: Unit | null,
  player: PlayerState,
  env: GameEnv,
  origin?: Origin,
  chosen?: Unit,
): void {
  for (const e of effects) {
    if (e.trigger === trigger && e.scope === scope) runEffect(e, source, player, env, origin, chosen);
  }
}

// ---------------------------------------------------------------- gauges

/** Add to a gauge (capped at its max) and pay out every threshold it crosses. */
export function addGauge(player: PlayerState, env: GameEnv, key: string, amount: number): void {
  const def = env.content.gauges.get(key);
  if (!def) throw new Error(`unknown gauge: ${key}`);
  const before = player.gauges[key] ?? 0;
  let value = Math.max(0, Math.min(before + amount, def.max));
  player.gauges[key] = value;

  for (const th of [...def.thresholds].sort((a, b) => a.at - b.at)) {
    if (th.once) {
      if (before < th.at && value >= th.at) {
        for (const a of th.reward) runAction(a, 1, null, [], player, env, { kind: "card", key: null });
      }
    } else {
      // Repeating threshold: spends `at` points each time it pays out.
      while (value >= th.at) {
        for (const a of th.reward) runAction(a, 1, null, [], player, env, { kind: "card", key: null });
        value -= th.at;
        player.gauges[key] = value;
      }
    }
  }
}

/** Feed every gauge that lists `trigger` as a source. */
export function fireGaugeTrigger(
  player: PlayerState,
  env: GameEnv,
  trigger: "ON_ROLL_CALL" | "ON_ROLL_CALL_WIN" | "HENSHIN",
): void {
  for (const def of env.content.gauges.values()) {
    for (const source of def.sources) {
      if (source.trigger === trigger) addGauge(player, env, def.key, source.amount);
    }
  }
}

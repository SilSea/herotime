import type { Action, Effect, Selector, Target } from "@herotime/shared";
import { checkCondition, isOneOf, type UnitView } from "../conditions.js";
import { recordBuff, type BuffRecord, type Unit } from "../content.js";
import { capStat } from "../config.js";
import { modifyRule, withRules } from "../rules.js";
import { copiesOf, noteDestroyed, noteMoment, type PlayerState, returnToPool } from "../shop/economy.js";
import { resolveTriples } from "../shop/triple.js";
import type { FightReward } from "../types.js";
import type { GameEnv } from "./env.js";

export function unitView(env: GameEnv, unit: Unit): UnitView {
  const def = env.content.card(unit.key);
  const view: UnitView = { factions: def.factions, colors: def.colors, names: env.content.lineage(unit.key) };
  if (def.series !== undefined) view.series = def.series;
  return view;
}

export const needsTargets = (a: Action): boolean =>
  a.type === "BUFF" || a.type === "GIVE_KEYWORD" || a.type === "TRANSFORM" || a.type === "DESTROY" || a.type === "ULTIMATE_FORM" || a.type === "DEVOUR_SHOP" || a.type === "CONSUME_ALLIES" || a.type === "COPY";

/** Whether a unit passes a target's faction / series / card filter. */
export function matchesTarget(env: GameEnv, u: Unit, t: Target): boolean {
  const v = unitView(env, u);
  return (
    (t.faction === undefined || (v.factions?.includes(t.faction) ?? false)) &&
    (t.series === undefined || v.series === t.series) &&
    (t.cards === undefined || isOneOf(v.names, t.cards))
  );
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
    case "GIANT_SLOT":
      return player.giant ? [player.giant] : [];
    case "SUMMONED": // ALLY_SUMMONED passes the newcomer in as `chosen`
      return chosen && board.includes(chosen) ? [chosen] : [];
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
/** How deep "when you summon a unit" reactions may nest in one action (a copy that copies the copy...). */
const MAX_SUMMON_DEPTH = 8;
let summonDepth = 0;

/** Units already on the board react to a newcomer (their buffs stick: this is the recruit phase). */
function announceSummon(player: PlayerState, env: GameEnv, newcomer: Unit): void {
  if (summonDepth >= MAX_SUMMON_DEPTH) return;
  summonDepth++;
  try {
    for (const mate of [...player.board]) {
      if (mate === newcomer || !player.board.includes(mate)) continue;
      runTrigger(env.content.card(mate.key).effects, "ALLY_SUMMONED", "UNIT", mate, player, env, undefined, newcomer);
    }
  } finally {
    summonDepth--;
  }
}

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
  noteDestroyed(player, unit.key);
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

/** A tavern gear (not pooled) of at most the player's rank, of one faction when given. */
function randomGear(player: PlayerState, env: GameEnv, faction: string | undefined): string | undefined {
  const options = env.gear.filter((g) => g.rank <= player.rank && (faction === undefined || env.content.card(g.key).factions.includes(faction)));
  return options.length > 0 ? env.rng.pick(options).key : undefined;
}

/** A unit drawn from the pool (so it counts against the copies left), of at most the player's rank. */
function randomUnit(player: PlayerState, env: GameEnv, faction: string | undefined): string | undefined {
  return env.pool.draw(env.rng, player.rank, 1, (key) => faction === undefined || env.content.card(key).factions.includes(faction));
}

/** What caused an effect, so a buff can be credited to it on the card. */
export type Origin = Pick<BuffRecord, "kind" | "key">;

function runAction(action: Action, mult: number, source: Unit | null, targets: Unit[], player: PlayerState, env: GameEnv, origin: Origin): void {
  const c = withRules(player, env.cfg);
  switch (action.type) {
    case "BUFF": {
      // BUFF_GEAR: a Gear that gives stats gives more.
      const extra = origin.kind === "gear" ? { ...(player.gearBonus ?? { atk: 0, hp: 0 }) } : { atk: 0, hp: 0 };
      // fromSelf: the unit's own stats as they are now (taken once, before any target, itself included, grows).
      if (action.fromSelf && source) {
        const own = env.content.stats(source);
        extra.atk += own.atk;
        extra.hp += own.hp;
      }
      for (const t of targets) {
        if (action.fromSelf && t === source) continue; // it passes its stats on to the others
        t.bonusAtk = capStat((t.bonusAtk ?? 0) + action.atk * mult + extra.atk);
        t.bonusHp = capStat((t.bonusHp ?? 0) + action.hp * mult + extra.hp);
        recordBuff(t, origin, action.atk * mult + extra.atk, action.hp * mult + extra.hp);
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
      for (const t of targets) if (swapKey(t, action.into, env)) noteMoment(player, "transforms", action.into);
      return;
    }
    case "DESTROY": {
      for (const t of targets) removeFromBoard(player, t, env);
      return;
    }
    case "COPY": {
      for (const t of targets) {
        if (env.content.card(t.key).kind === "GIANT") continue; // a Giant Robo has its own slot
        for (let n = 0; n < mult; n++) {
          const copy = copyOf(t, action.withBuffs);
          if (action.to === "HAND") {
            if (player.hand.length < c.handSize) player.hand.push(copy);
            continue;
          }
          if (player.board.length >= c.boardSize) break;
          const at = player.board.includes(t) ? player.board.indexOf(t) + 1 : player.board.length;
          player.board.splice(at, 0, copy);
          announceSummon(player, env, copy);
        }
      }
      // Copies count for triples straight away.
      resolveTriples(player, env.pool, env.rng, env.cfg);
      return;
    }
    case "CONSUME_ALLIES": {
      const eaten = player.board.filter((u) => u !== source);
      let atk = 0;
      let hp = 0;
      for (const u of eaten) {
        const st = env.content.stats(u);
        atk += st.atk;
        hp += st.hp;
        removeFromBoard(player, u, env);
      }
      for (const t of targets) {
        if (!player.board.includes(t) && t !== player.giant) continue; // it was eaten too
        t.bonusAtk = capStat((t.bonusAtk ?? 0) + atk);
        t.bonusHp = capStat((t.bonusHp ?? 0) + hp);
        recordBuff(t, origin, atk, hp);
      }
      return;
    }
    case "SUMMON": {
      env.content.card(action.cardKey);
      const count = action.count * mult;
      for (let n = 0; n < count && player.board.length < c.boardSize; n++) {
        if (!reserve(env, action.cardKey)) break;
        const at = source && player.board.includes(source) ? player.board.indexOf(source) + 1 : player.board.length;
        const summoned: Unit = { key: action.cardKey, golden: false };
        player.board.splice(at, 0, summoned);
        // Units already on the board react to the newcomer (their buffs stick: this is the recruit phase).
        announceSummon(player, env, summoned);
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
    case "RANDOM_CARD": {
      for (let n = 0; n < mult && player.hand.length < c.handSize; n++) {
        const key = action.cardKind === "GEAR" ? randomGear(player, env, action.faction) : randomUnit(player, env, action.faction);
        if (key) player.hand.push({ key, golden: false });
      }
      return;
    }
    case "ULTIMATE_FORM": {
      for (const t of targets) {
        const into = env.content.card(t.key).ultimateInto;
        if (into && swapKey(t, into, env)) noteMoment(player, "transforms", into);
      }
      return;
    }
    case "BUFF_GEAR": {
      const now = player.gearBonus ?? { atk: 0, hp: 0 };
      player.gearBonus = { atk: now.atk + action.atk * mult, hp: now.hp + action.hp * mult };
      return;
    }
    case "BUFF_SHOP": {
      const now = player.shopBonus ?? { atk: 0, hp: 0 };
      player.shopBonus = { atk: now.atk + action.atk * mult, hp: now.hp + action.hp * mult };
      return;
    }
    case "DEVOUR_SHOP": {
      for (let n = 0; n < mult; n++) {
        const edible = player.shop.flatMap((k, i) => {
          const d = env.content.card(k);
          return action.faction === undefined || d.factions.includes(action.faction) ? [i] : [];
        });
        if (edible.length === 0) break;
        const power = (i: number): number => {
          const d = env.content.card(player.shop[i] as string);
          return d.atk + d.hp;
        };
        // Strongest / weakest by ATK+HP; ties go to the leftmost.
        const i =
          action.choose === "STRONGEST" ? edible.reduce((best, x) => (power(x) > power(best) ? x : best))
          : action.choose === "WEAKEST" ? edible.reduce((best, x) => (power(x) < power(best) ? x : best))
          : env.rng.pick(edible);
        const key = player.shop.splice(i, 1)[0] as string;
        const eaten = env.content.card(key);
        const atk = eaten.atk + (player.shopBonus?.atk ?? 0);
        const hp = eaten.hp + (player.shopBonus?.hp ?? 0);
        if (env.pool.has(key)) env.pool.give(key);
        for (const t of targets) {
          t.bonusAtk = capStat((t.bonusAtk ?? 0) + atk);
          t.bonusHp = capStat((t.bonusHp ?? 0) + hp);
          recordBuff(t, origin, atk, hp);
        }
      }
      return;
    }
    case "DISCARD": {
      for (let n = 0; n < action.count * mult; n++) {
        const fits = player.hand.filter((u) => {
          const kind = env.content.card(u.key).kind;
          return action.cardKind === "ANY" || (action.cardKind === "GEAR" ? kind === "GEAR" : kind !== "GEAR");
        });
        if (fits.length === 0) break;
        const card = action.pick === "LEFTMOST" ? fits[0] : action.pick === "RIGHTMOST" ? fits[fits.length - 1] : env.rng.pick(fits);
        if (!card) break;
        player.hand.splice(player.hand.indexOf(card), 1);
        returnToPool(card, env.pool);
        noteMoment(player, "discards");
        // The discarded card has its say: "When discarded: ..." (unit cards own it; gear holds player effects).
        const def = env.content.card(card.key);
        runTrigger(def.effects, "ON_DISCARD", "UNIT", card, player, env);
        runTrigger(def.effects, "ON_DISCARD", "PLAYER", null, player, env, { kind: def.kind === "GEAR" ? "gear" : "card", key: card.key });
      }
      return;
    }
    case "SUMMON_FROM_HAND": {
      for (let n = 0; n < action.count * mult && player.board.length < c.boardSize; n++) {
        const options = player.hand.filter((u) => env.content.card(u.key).kind === "UNIT");
        if (options.length === 0) break;
        const unit = env.rng.pick(options);
        player.hand.splice(player.hand.indexOf(unit), 1);
        const at = source && player.board.includes(source) ? player.board.indexOf(source) + 1 : player.board.length;
        player.board.splice(at, 0, unit);
        announceSummon(player, env, unit);
      }
      return;
    }
    case "SUPER_GATTAI": {
      const now = player.superGattai ?? { atk: 0, hp: 0 };
      player.superGattai = { atk: now.atk + action.atk * mult, hp: now.hp + action.hp * mult };
      return;
    }
    case "DAMAGE":
      throw new Error("action DAMAGE is only valid during combat");
  }
}

/** Run one effect in the recruit phase. `source` is the owning unit (null for player-scope effects). */
/** Give a reward a fight effect earned (Energy, a card, Gauge, a copy...). */
export function runReward(r: FightReward, player: PlayerState, env: GameEnv): void {
  if (r.copy) {
    if (player.hand.length < withRules(player, env.cfg).handSize) player.hand.push({ ...r.copy });
    resolveTriples(player, env.pool, env.rng, env.cfg);
    return;
  }
  runAction(r.action, r.mult, null, [], player, env, { kind: "card", key: r.from });
}

/** A new card like `u` (COPY): the base card, or Golden with its bonuses and keywords. Never from the pool. */
export function copyOf(u: Unit, withBuffs: boolean): Unit {
  const copy: Unit = { key: u.key, golden: withBuffs && u.golden };
  if (withBuffs) {
    if (u.bonusAtk) copy.bonusAtk = u.bonusAtk;
    if (u.bonusHp) copy.bonusHp = u.bonusHp;
    if (u.keywords?.length) copy.keywords = [...u.keywords];
    if (u.buffs?.length) copy.buffs = u.buffs.map((b) => ({ ...b, ...(b.keywords ? { keywords: [...b.keywords] } : {}) }));
  }
  copy.unpooled = copy.golden ? 3 : 1;
  return copy;
}

export function runEffect(effect: Effect, source: Unit | null, player: PlayerState, env: GameEnv, origin?: Origin, chosen?: Unit): void {
  for (let n = 0; n < (effect.repeat ?? 1); n++) runEffectOnce(effect, source, player, env, origin, chosen);
}

function runEffectOnce(effect: Effect, source: Unit | null, player: PlayerState, env: GameEnv, origin?: Origin, chosen?: Unit): void {
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
  effects.forEach((e, i) => {
    if (e.trigger !== trigger || e.scope !== scope) return;
    if (e.limit && !useUp(e, `${trigger}#${i}`, source, player, env, origin)) return;
    runEffect(e, source, player, env, origin, chosen);
  });
}

/**
 * A limited effect takes one use, or says no when it has none left this turn / game. The count lives on the
 * unit (its own effects) or on the player (relic, hero, gear). A firing whose condition fails costs nothing.
 */
function useUp(e: Effect, id: string, source: Unit | null, player: PlayerState, env: GameEnv, origin?: Origin): boolean {
  const limit = e.limit;
  if (!limit) return true;
  if (!checkCondition(e.condition, player.board.map((u) => unitView(env, u)), player.energy)) return true; // it will not do anything anyway
  const holder: { uses?: Record<string, number>; usesTurn?: Record<string, number> } = source ?? player;
  const key = source ? id : `${origin?.kind ?? "card"}:${origin?.key ?? ""}:${id}`;
  const counts = limit.per === "TURN" ? (holder.usesTurn ??= {}) : (holder.uses ??= {});
  const used = counts[key] ?? 0;
  if (used >= limit.times) return false;
  counts[key] = used + 1;
  return true;
}

/** A new turn: "per turn" limits start over. */
export function resetTurnUses(player: PlayerState): void {
  delete player.usesTurn;
  for (const u of [...player.board, ...player.hand]) delete u.usesTurn;
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

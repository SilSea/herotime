import type { Action, Effect, SentaiColor, Selector, Target } from "@herotime/shared";
import { checkCondition, sentaiColorCount } from "../conditions.js";
import {
  DEFAULT_COMBAT_RULES,
  DEFAULT_CONFIG,
  SENTAI_FACTION,
  type CombatRules,
  type GameConfig,
} from "../config.js";
import type { Content } from "../content.js";
import { Rng } from "../rng/rng.js";
import type {
  CombatEvent,
  CombatResult,
  CombatSideExtras,
  CombatSurvivor,
  CombatUnitInput,
  Keyword,
  Side,
} from "../types.js";

export interface CombatOptions {
  maxAttacksPerCombat?: number;
  /** Max units per side (Giants ignore it). */
  boardSize?: number;
  /** Needed whenever an effect SUMMONs or TRANSFORMs. */
  content?: Content;
  a?: CombatSideExtras;
  b?: CombatSideExtras;
}

interface Fighter {
  uid: string;
  side: Side;
  cardKey: string;
  rank: number;
  atk: number;
  hp: number;
  /** Highest HP it can have; Kyodaika scales this, not the damaged value. */
  maxHp: number;
  keywords: Set<Keyword>;
  barrier: boolean;
  revived: boolean;
  kyodaikaUsed: boolean;
  kicked: boolean;
  /** Giants and Kyodaika'd units: FINAL_BLOW hits them twice as hard. */
  huge: boolean;
  effects: readonly Effect[];
  factions: readonly string[];
  colors: readonly SentaiColor[];
  series: string | undefined;
  golden: boolean;
  sourceId: string | undefined;
}

interface SideState {
  id: Side;
  list: Fighter[];
  /** Index of the unit that attacks next; kept consistent across inserts/removals. */
  next: number;
  deaths: number;
  rules: CombatRules;
  extras: CombatSideExtras;
  giantEntered: boolean;
  giantTriggered: boolean;
  rollCall: boolean;
  /** Sentai totals taken right after Roll Call, used to scale the Giant. */
  sentaiAtk: number;
  sentaiHp: number;
  permanent: Map<string, { atk: number; hp: number }>;
}

const alive = (f: Fighter): boolean => f.hp > 0;
const other = (s: Side): Side => (s === "A" ? "B" : "A");

function toFighter(input: CombatUnitInput, uid: string, side: Side): Fighter {
  const keywords = new Set<Keyword>(input.keywords ?? []);
  return {
    uid,
    side,
    cardKey: input.cardKey,
    rank: input.rank,
    atk: input.atk,
    hp: input.hp,
    maxHp: input.hp,
    keywords,
    barrier: keywords.has("BARRIER"),
    revived: false,
    kyodaikaUsed: false,
    kicked: false,
    huge: false,
    effects: input.effects ?? [],
    factions: input.factions ?? [],
    colors: input.colors ?? [],
    series: input.series,
    golden: input.golden ?? false,
    sourceId: input.sourceId,
  };
}

function survivor(f: Fighter): CombatSurvivor {
  const s: CombatSurvivor = { uid: f.uid, cardKey: f.cardKey, rank: f.rank, atk: f.atk, hp: f.hp };
  if (f.sourceId !== undefined) s.sourceId = f.sourceId;
  return s;
}

/** Max death/giant-entry steps in one settle() before the fight is abandoned as a draw. */
const SETTLE_LIMIT = 2_000;

const needsTargets = (a: Action): boolean =>
  a.type === "BUFF" ||
  a.type === "DAMAGE" ||
  a.type === "GIVE_KEYWORD" ||
  a.type === "TRANSFORM" ||
  a.type === "DESTROY";

/**
 * Deterministic auto-battle. Same (boards, seed, content) always yields the same
 * result, so the server can store just the seed and re-derive any replay.
 */
export function simulateCombat(
  boardA: readonly CombatUnitInput[],
  boardB: readonly CombatUnitInput[],
  seed: number,
  options: CombatOptions = {},
): CombatResult {
  const rng = new Rng(seed);
  const maxAttacks = options.maxAttacksPerCombat ?? DEFAULT_CONFIG.maxAttacksPerCombat;
  const boardLimit = options.boardSize ?? DEFAULT_CONFIG.boardSize;
  const events: CombatEvent[] = [];
  let attacks = 0;
  let spawned = 0;

  const mkSide = (id: Side, units: readonly CombatUnitInput[], extras: CombatSideExtras = {}): SideState => ({
    id,
    list: units.map((u, i) => toFighter(u, `${id}${i}`, id)),
    next: 0,
    deaths: 0,
    rules: { ...DEFAULT_COMBAT_RULES, ...extras.rules },
    extras,
    giantEntered: false,
    giantTriggered: false,
    rollCall: false,
    sentaiAtk: 0,
    sentaiHp: 0,
    permanent: new Map(),
  });
  const sides: Record<Side, SideState> = {
    A: mkSide("A", boardA, options.a),
    B: mkSide("B", boardB, options.b),
  };

  // ---- list mutation that keeps each side's attack pointer valid ----
  const removeAt = (s: SideState, i: number): void => {
    s.list.splice(i, 1);
    if (i < s.next) s.next--;
  };
  const insertAt = (s: SideState, i: number, f: Fighter): void => {
    s.list.splice(i, 0, f);
    if (i <= s.next) s.next++;
  };

  const friendly = (s: SideState): Fighter[] => s.list.filter(alive);

  // ---- targets ----
  const matches = (f: Fighter, t: Target): boolean =>
    (t.faction === undefined || f.factions.includes(t.faction)) && (t.series === undefined || f.series === t.series);

  const select = (selector: Selector, t: Target, source: Fighter | null, s: SideState): Fighter[] => {
    const mine = friendly(s).filter((f) => matches(f, t));
    const foes = friendly(sides[other(s.id)]);
    switch (selector) {
      case "SELF":
        return source && alive(source) ? [source] : [];
      case "ADJACENT": {
        if (!source) return [];
        const i = s.list.indexOf(source);
        if (i < 0) return [];
        return [s.list[i - 1], s.list[i + 1]].filter((f): f is Fighter => f !== undefined && alive(f));
      }
      case "LEFTMOST_FRIENDLY":
        return mine.slice(0, 1);
      case "RIGHTMOST_FRIENDLY":
        return mine.slice(-1);
      case "RANDOM_FRIENDLY": {
        const pool = mine.filter((f) => f !== source);
        return pool.length > 0 ? [rng.pick(pool)] : [];
      }
      case "ALL_FRIENDLY":
        return mine;
      case "LEFTMOST_ENEMY":
        return foes.slice(0, 1);
      case "RANDOM_ENEMY":
        return foes.length > 0 ? [rng.pick(foes)] : [];
      case "ALL_ENEMY":
        return foes;
    }
  };

  // ---- damage ----
  const dealDamage = (f: Fighter, amount: number, lethal: boolean): number => {
    if (amount <= 0) return 0;
    if (f.barrier) {
      f.barrier = false;
      events.push({ type: "BARRIER_POP", unit: f.uid });
      return 0;
    }
    f.hp = lethal ? 0 : f.hp - amount;
    return amount;
  };

  // ---- fighter creation ----
  const fighterFromCard = (key: string, uid: string, side: Side): Fighter => {
    if (!options.content) throw new Error(`combat needs content to resolve card "${key}"`);
    const def = options.content.card(key);
    const input: CombatUnitInput = {
      cardKey: def.key,
      rank: def.rank,
      atk: def.atk,
      hp: def.hp,
      keywords: def.keywords,
      effects: def.effects,
      factions: def.factions,
      colors: def.colors,
    };
    if (def.series !== undefined) input.series = def.series;
    return toFighter(input, uid, side);
  };

  // ---- effects ----
  const runAction = (
    action: Action,
    mult: number,
    s: SideState,
    targets: Fighter[],
    at: () => number,
  ): void => {
    switch (action.type) {
      case "BUFF": {
        const atk = action.atk * mult;
        const hp = action.hp * mult;
        for (const t of targets) {
          t.atk += atk;
          t.hp += hp;
          t.maxHp += hp;
          events.push({ type: "BUFF", unit: t.uid, atk, hp });
          if (action.permanent && t.sourceId !== undefined) {
            const book = sides[t.side].permanent;
            const prev = book.get(t.sourceId) ?? { atk: 0, hp: 0 };
            book.set(t.sourceId, { atk: prev.atk + atk, hp: prev.hp + hp });
          }
        }
        return;
      }
      case "SUMMON": {
        const count = action.count * mult;
        for (let n = 0; n < count && friendly(s).length < boardLimit; n++) {
          const uid = `${s.id}s${spawned++}`;
          const f = fighterFromCard(action.cardKey, uid, s.id);
          const index = Math.min(at(), s.list.length);
          insertAt(s, index, f);
          events.push({ type: "SUMMON", unit: uid, cardKey: action.cardKey, side: s.id, index, atk: f.atk, hp: f.hp, keywords: [...f.keywords] });
        }
        return;
      }
      case "DAMAGE": {
        for (const t of targets) {
          const dealt = dealDamage(t, action.amount * mult, false);
          events.push({ type: "EFFECT_DAMAGE", unit: t.uid, amount: dealt, hp: t.hp });
        }
        return;
      }
      case "GIVE_KEYWORD": {
        for (const t of targets) {
          t.keywords.add(action.keyword);
          if (action.keyword === "BARRIER") t.barrier = true;
          events.push({ type: "KEYWORD", unit: t.uid, keyword: action.keyword });
        }
        return;
      }
      case "TRANSFORM": {
        for (const t of targets) {
          const into = fighterFromCard(action.into, t.uid, t.side);
          const m = t.golden ? 2 : 1;
          t.cardKey = into.cardKey;
          t.rank = into.rank;
          t.atk = into.atk * m;
          t.hp = into.hp * m;
          t.maxHp = t.hp;
          t.keywords = into.keywords;
          t.barrier = into.barrier;
          t.effects = into.effects;
          t.factions = into.factions;
          t.colors = into.colors;
          t.series = into.series;
          events.push({ type: "TRANSFORM", unit: t.uid, into: action.into, atk: t.atk, hp: t.hp, keywords: [...t.keywords] });
        }
        return;
      }
      case "DESTROY": {
        for (const t of targets) {
          t.hp = 0;
          events.push({ type: "DESTROY", unit: t.uid });
        }
        return;
      }
      case "GAIN_ENERGY":
      case "GAUGE_ADD":
      case "MODIFY_RULE":
      case "ADD_TO_HAND":
      case "DISCOVER_GIANT":
        throw new Error(`action ${action.type} is not valid during combat`);
    }
  };

  const runEffect = (effect: Effect, source: Fighter | null, s: SideState, at: () => number): void => {
    if (!checkCondition(effect.condition, friendly(s))) return;
    const mult = source?.golden ? (effect.goldenMultiplier ?? 2) : 1;
    const target: Target = effect.target ?? { selector: "SELF" };
    // Select once so a single random pick feeds every action in the effect.
    const targets = effect.actions.some(needsTargets) ? select(target.selector, target, source, s) : [];
    for (const action of effect.actions) runAction(action, mult, s, targets, at);
  };

  const fire = (trigger: Effect["trigger"], f: Fighter, s: SideState, at: () => number, deaths?: number): void => {
    for (const e of f.effects) {
      if (e.scope !== "UNIT" || e.trigger !== trigger) continue;
      if (deaths !== undefined && deaths % (e.every ?? 1) !== 0) continue;
      runEffect(e, f, s, at);
    }
  };

  /** Summons from a living unit land right of it, in order. */
  const rightOf = (s: SideState, f: Fighter): (() => number) => {
    let k = 0;
    return () => s.list.indexOf(f) + 1 + k++;
  };

  // ---- Giant Robo ----
  const enterGiants = (order: Side[]): boolean => {
    let entered = false;
    for (const id of order) {
      const s = sides[id];
      const giant = s.extras.giant;
      if (!giant || s.giantEntered) continue;
      if (!s.giantTriggered && friendly(s).length > s.rules.giantEntryThreshold) continue;

      const f = toFighter(giant, `${id}g`, id);
      f.atk += Math.floor(s.rules.giantSentaiScale * s.sentaiAtk);
      f.hp += Math.floor(s.rules.giantSentaiScale * s.sentaiHp);
      f.maxHp = f.hp;
      f.huge = true;
      s.list.push(f);
      s.giantEntered = true;
      events.push({ type: "GIANT_ENTER", unit: f.uid, side: id, cardKey: f.cardKey, atk: f.atk, hp: f.hp, keywords: [...f.keywords] });
      entered = true;
    }
    return entered;
  };

  // ---- deaths ----
  const findDead = (order: Side[]): Fighter | undefined => {
    for (const id of order) {
      const f = sides[id].list.find((x) => x.hp <= 0);
      if (f) return f;
    }
    return undefined;
  };

  const handleDeath = (f: Fighter): void => {
    const s = sides[f.side];
    const idx = s.list.indexOf(f);
    const kyodaika = f.keywords.has("KYODAIKA") && !f.kyodaikaUsed;
    const revive = !kyodaika && f.keywords.has("REVIVE") && !f.revived;
    events.push({ type: "DEATH", unit: f.uid, returns: kyodaika || revive });

    // A returning unit stays in the list as a ghost so Last Stand summons land on its right.
    if (!kyodaika && !revive) removeAt(s, idx);
    let slot = kyodaika || revive ? idx + 1 : idx;
    fire("LAST_STAND", f, s, () => slot++);

    s.deaths++;
    for (const mate of friendly(s)) fire("AVENGE", mate, s, rightOf(s, mate), s.deaths);

    if (kyodaika) {
      const m = s.rules.kyodaikaMultiplier;
      f.kyodaikaUsed = true;
      f.atk = f.atk * m;
      f.maxHp = f.maxHp * m;
      f.hp = f.maxHp;
      f.keywords = new Set();
      f.barrier = false;
      f.huge = true;
      events.push({ type: "KYODAIKA", unit: f.uid, atk: f.atk, hp: f.hp });
      sides[other(s.id)].giantTriggered = true;
    } else if (revive) {
      f.revived = true;
      f.hp = 1;
      events.push({ type: "REVIVE", unit: f.uid, hp: f.hp });
    }
  };

  /**
   * Resolve deaths, Last Stands and Giant entries until the board is stable. Content that chains
   * forever (a unit whose Last Stand summons something that dies at once, ...) must not take the
   * match down, so after too many steps the fight is abandoned and ends as a draw.
   */
  let aborted = false;
  const settle = (order: Side[]): void => {
    if (aborted) return;
    for (let guard = 0; guard < SETTLE_LIMIT; guard++) {
      const dead = findDead(order);
      if (dead) {
        handleDeath(dead);
        continue;
      }
      if (enterGiants(order)) continue;
      return;
    }
    aborted = true;
  };

  // ---- pre-fight: Gattai, Roll Call, Start of Combat ----
  const mergeGattai = (s: SideState): void => {
    const out: Fighter[] = [];
    let i = 0;
    while (i < s.list.length) {
      const first = s.list[i] as Fighter;
      if (!first.keywords.has("GATTAI")) {
        out.push(first);
        i++;
        continue;
      }
      let j = i;
      while (j < s.list.length && (s.list[j] as Fighter).keywords.has("GATTAI")) j++;
      const run = s.list.slice(i, j);
      if (run.length >= s.rules.gattaiSize) {
        const merged: Fighter = {
          ...first,
          uid: `${s.id}m${spawned++}`,
          rank: Math.max(...run.map((r) => r.rank)),
          atk: run.reduce((n, r) => n + r.atk, 0),
          hp: run.reduce((n, r) => n + r.hp, 0),
          maxHp: run.reduce((n, r) => n + r.maxHp, 0),
          keywords: new Set(run.flatMap((r) => [...r.keywords]).filter((k) => k !== "GATTAI")),
          barrier: run.some((r) => r.barrier),
          effects: run.flatMap((r) => [...r.effects]),
          factions: [...new Set(run.flatMap((r) => [...r.factions]))],
          colors: run.flatMap((r) => [...r.colors]),
          golden: run.some((r) => r.golden),
          sourceId: undefined,
        };
        events.push({ type: "GATTAI", units: run.map((r) => r.uid), into: merged.uid, cardKey: merged.cardKey, atk: merged.atk, hp: merged.hp, keywords: [...merged.keywords] });
        out.push(merged);
      } else {
        out.push(...run);
      }
      i = j;
    }
    s.list = out;
  };

  const rollCall = (s: SideState): void => {
    const need = Math.max(1, s.rules.rollCallColors);
    if (sentaiColorCount(friendly(s)) >= need) {
      s.rollCall = true;
      events.push({ type: "ROLL_CALL", side: s.id });
      const buff = s.rules.rollCallBuff;
      for (const f of friendly(s)) {
        if (!f.factions.includes(SENTAI_FACTION)) continue;
        f.atk += buff;
        f.hp += buff;
        f.maxHp += buff;
        events.push({ type: "BUFF", unit: f.uid, atk: buff, hp: buff });
      }
    }
    for (const f of friendly(s)) {
      if (!f.factions.includes(SENTAI_FACTION)) continue;
      s.sentaiAtk += f.atk;
      s.sentaiHp += f.hp;
    }
  };

  // The side with more units goes first (decided before anything changes the boards).
  let turn: Side =
    boardA.length > boardB.length ? "A" : boardB.length > boardA.length ? "B" : rng.int(2) === 0 ? "A" : "B";
  const firstOrder: Side[] = [turn, other(turn)];

  for (const id of firstOrder) mergeGattai(sides[id]);
  for (const id of firstOrder) rollCall(sides[id]);
  for (const id of firstOrder) {
    const s = sides[id];
    for (const f of [...s.list]) {
      if (alive(f) && s.list.includes(f)) fire("START_OF_COMBAT", f, s, rightOf(s, f));
    }
    for (const e of s.extras.playerEffects ?? []) {
      if (e.scope === "PLAYER" && e.trigger === "START_OF_COMBAT") runEffect(e, null, s, () => s.list.length);
    }
  }
  settle(firstOrder);

  // ---- main loop ----
  const finish = (winner: CombatResult["winner"]): CombatResult => {
    const perm = (s: SideState): Record<string, { atk: number; hp: number }> => Object.fromEntries(s.permanent);
    return {
      winner,
      // An abandoned fight can leave dead units in the lists; they are not survivors.
      survivorsA: sides.A.list.filter(alive).map(survivor),
      survivorsB: sides.B.list.filter(alive).map(survivor),
      events,
      attacks,
      rollCall: { A: sides.A.rollCall, B: sides.B.rollCall },
      permanent: { A: perm(sides.A), B: perm(sides.B) },
    };
  };

  for (let iterations = 0; sides.A.list.length > 0 && sides.B.list.length > 0; iterations++) {
    if (aborted || attacks >= maxAttacks || iterations > maxAttacks * 4) return finish("DRAW");

    const s = sides[turn];
    const foe = sides[other(turn)];
    const order: Side[] = [turn, other(turn)];
    s.next %= s.list.length;
    const attacker = s.list[s.next] as Fighter;
    const swings = attacker.keywords.has("RAPID") ? 2 : 1;

    for (let swing = 0; swing < swings; swing++) {
      if (!alive(attacker) || !s.list.includes(attacker)) break;

      fire("ON_ATTACK", attacker, s, rightOf(s, attacker));
      settle(order);
      const enemies = friendly(foe);
      if (!alive(attacker) || !s.list.includes(attacker) || enemies.length === 0) break;

      const guards = enemies.filter((e) => e.keywords.has("GUARD"));
      const target = rng.pick(guards.length > 0 ? guards : enemies);

      const kick = (attacker.keywords.has("RIDER_KICK") || attacker.keywords.has("FINAL_BLOW")) && !attacker.kicked;
      attacker.kicked = true;
      let out = attacker.atk * (kick ? 2 : 1);
      if (attacker.keywords.has("FINAL_BLOW") && target.huge) out *= 2;
      const back = target.atk;

      attacks++;
      const hitTarget = dealDamage(target, out, attacker.keywords.has("LETHAL")) > 0;
      const hitAttacker = dealDamage(attacker, back, target.keywords.has("LETHAL")) > 0;
      events.push({
        type: "ATTACK",
        attacker: attacker.uid,
        target: target.uid,
        damageToTarget: out,
        damageToAttacker: back,
        targetHp: target.hp,
        attackerHp: attacker.hp,
      });
      settle(order);

      const wounded = [hitTarget ? target : undefined, hitAttacker ? attacker : undefined].filter(
        (f): f is Fighter => f !== undefined && alive(f) && sides[f.side].list.includes(f),
      );
      for (const f of wounded) fire("AFTER_DAMAGED", f, sides[f.side], rightOf(sides[f.side], f));
      settle(order);
    }

    if (s.list.includes(attacker)) s.next = s.list.indexOf(attacker) + 1;
    turn = other(turn);
  }

  if (aborted) return finish("DRAW");
  return finish(friendly(sides.A).length > 0 ? "A" : friendly(sides.B).length > 0 ? "B" : "DRAW");
}

/** Damage the winner deals to the loser's hero: base rank + survivor ranks, capped early game. */
export function heroDamage(
  baseRank: number,
  survivorRanks: readonly number[],
  turn: number,
  config: Pick<GameConfig, "damageCap" | "damageCapUntilTurn"> = DEFAULT_CONFIG,
): number {
  const raw = baseRank + survivorRanks.reduce((sum, r) => sum + r, 0);
  return turn <= config.damageCapUntilTurn ? Math.min(raw, config.damageCap) : raw;
}

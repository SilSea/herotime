import { heroDamage, simulateCombat } from "../combat/combat.js";
import { configFromRules, DEFAULT_CONFIG, type GameConfig } from "../config.js";
import type { Content } from "../content.js";
import { makeEnv, type GameEnv } from "../game/env.js";
import {
  applyCombatOutcome,
  assignHero,
  autoChooseRelic,
  beginTurn,
  buyGear,
  combineGattai,
  gattaiGroupAt,
  buyUnit,
  chooseRelic,
  combatOptions,
  endTurn,
  offerRelics,
  pickDiscover,
  playUnit,
  prepareCombat,
  sellUnit,
  useGear,
  useHeroPower,
} from "../game/session.js";
import { Rng } from "../rng/rng.js";
import { withRules } from "../rules.js";
import {
  newPlayer,
  refresh,
  reorder,
  RuleError,
  toggleFreeze,
  upgrade,
  upgradeCost,
} from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import type { CombatResult, CombatSideExtras, CombatUnitInput, Side } from "../types.js";
import { runBot } from "./bot.js";
import { DEFAULT_MATCH_CONFIG, recruitDuration, type MatchConfig } from "./config.js";
import { pairPlayers } from "./pairing.js";
import type {
  BoardSummary,
  SeenUnit,
  CombatRecord,
  Entrant,
  GhostBoard,
  Intent,
  MatchEvent,
  MatchPlayer,
  MatchView,
  Phase,
} from "./types.js";

export interface CreateMatchOptions {
  content: Content;
  seed: number;
  entrants: readonly Entrant[];
  /** Absolute start time in ms. Every other method also takes `now`, so the clock stays outside the engine. */
  now: number;
  config?: Partial<MatchConfig>;
  gameConfig?: GameConfig;
}

function summarise(units: readonly CombatUnitInput[], turn: number): BoardSummary {
  const factions: Record<string, number> = {};
  let neutral = 0;
  for (const u of units) {
    if (!u.factions || u.factions.length === 0) neutral++;
    for (const f of u.factions ?? []) factions[f] = (factions[f] ?? 0) + 1;
  }
  return { turn, units: units.length, factions, neutral };
}

interface Prepared {
  units: CombatUnitInput[];
  extras: CombatSideExtras;
  rank: number;
}

/**
 * One 2-8 player match as a pure state machine: hero select, recruit/battle turns, pairing with
 * Ghosts, hero damage and armor, eliminations and placements. It never reads a clock or does IO;
 * callers pass `now` to `tick` and `dispatch`, which makes whole matches testable with a fake clock.
 */
export class Match {
  readonly config: MatchConfig;
  readonly env: GameEnv;
  readonly players: MatchPlayer[];
  phase: Phase = "HERO_SELECT";
  turn = 0;
  deadline: number | null;

  private readonly combatRng: Rng;
  private readonly events: MatchEvent[] = [];
  /** Boards of eliminated players, oldest first. */
  private readonly ghosts: GhostBoard[] = [];
  private lastGhostFor: string | undefined;

  private constructor(opts: CreateMatchOptions) {
    this.config = { ...DEFAULT_MATCH_CONFIG, ...opts.config };

    const ids = new Set(opts.entrants.map((e) => e.id));
    if (opts.entrants.length < 2 || opts.entrants.length > 8) throw new Error("a match needs 2-8 players");
    if (ids.size !== opts.entrants.length) throw new Error("duplicate player id");

    const rng = new Rng(opts.seed);
    const factions = this.pickFactions(opts.content, rng);
    // Neutral cards are always in; a faction card is in if any of its factions is.
    const poolDefs = [...opts.content.cards.values()].filter(
      (c) =>
        c.kind === "UNIT" &&
        !c.token &&
        (factions === undefined || c.factions.length === 0 || c.factions.some((f) => factions.has(f))),
    );
    const poolCards = poolDefs.map((c) => ({ key: c.key, rank: c.rank }));
    // Tavern gear follows the same faction rule as units, but is never pooled.
    const gear = [...opts.content.cards.values()]
      .filter((c) => c.kind === "GEAR" && !c.token && (factions === undefined || c.factions.length === 0 || c.factions.some((f) => factions.has(f))))
      .map((c) => ({ key: c.key, rank: c.rank }));
    this.env = makeEnv({
      content: opts.content,
      pool: new Pool(poolCards),
      rng,
      cfg: opts.gameConfig ?? configFromRules(opts.content.rules),
      gear,
    });
    if (factions) {
      this.env.activeFactions = factions;
      this.env.activeSeries = new Set(poolDefs.flatMap((c) => (c.series === undefined ? [] : [c.series])));
    }
    this.combatRng = new Rng((opts.seed ^ 0x9e3779b9) >>> 0);

    const heroKeys = [...opts.content.heroes.keys()];
    this.players = opts.entrants.map((e) => ({
      id: e.id,
      name: e.name,
      isBot: e.isBot,
      state: newPlayer(),
      hp: this.config.startHp,
      armor: 0,
      alive: true,
      heroOptions: rng.shuffle(heroKeys).slice(0, this.config.heroChoices),
      ready: false,
      opponents: [],
    }));

    this.deadline = opts.now + this.config.heroSelectMs;
    this.emitPhase();
    for (const p of this.players) if (p.isBot) this.chooseHero(p, 0);
    this.maybeStartRecruit(opts.now);
  }

  /** The factions this match plays with, or undefined when the content declares none. */
  private pickFactions(content: Content, rng: Rng): Set<string> | undefined {
    if (content.factions.size === 0) return undefined;
    const all = [...content.factions.keys()];
    const fixed = this.config.fixedFactions;
    if (fixed) {
      for (const f of fixed) if (!content.factions.has(f)) throw new Error(`unknown faction in fixedFactions: ${f}`);
      return new Set(fixed);
    }
    const n = this.config.factionsPerMatch;
    return new Set(n <= 0 || n >= all.length ? all : rng.shuffle(all).slice(0, n));
  }

  static create(opts: CreateMatchOptions): Match {
    return new Match(opts);
  }

  // ------------------------------------------------------------------ queries

  drainEvents(): MatchEvent[] {
    return this.events.splice(0);
  }

  player(id: string): MatchPlayer {
    const p = this.players.find((x) => x.id === id);
    if (!p) throw new RuleError(`unknown player: ${id}`);
    return p;
  }

  get aliveCount(): number {
    return this.players.filter((p) => p.alive).length;
  }

  /** What `playerId` may see. Never contains another player's shop, hand or board. */
  view(playerId: string): MatchView {
    const p = this.player(playerId);
    const { content } = this.env;
    const statsOf = (units: typeof p.state.hand): { atk: number; hp: number }[] =>
      units.map((u) => (content.card(u.key).kind === "UNIT" ? content.stats(u) : { atk: 0, hp: 0 }));

    const view: MatchView = {
      phase: this.phase,
      turn: this.turn,
      deadline: this.deadline,
      factions: [...(this.env.activeFactions ?? [])].sort(),
      me: {
        id: p.id,
        state: p.state,
        hp: p.hp,
        armor: p.armor,
        alive: p.alive,
        heroOptions: p.heroOptions,
        ready: p.ready,
        upgradeCost: upgradeCost(p.state, withRules(p.state, this.env.cfg)) ?? null,
        limits: this.limitsOf(p),
        heroPower: this.heroPowerOf(p),
        handStats: statsOf(p.state.hand),
        boardStats: statsOf(p.state.board),
        // Board slots holding a Gattai core that can be combined for good right now.
        combinable: this.phase === "RECRUIT" ? p.state.board.flatMap((_u, i) => (gattaiGroupAt(p.state, i, this.env) ? [i] : [])) : [],
      },
      players: this.players.map((o) => {
        const pub: MatchView["players"][number] = {
          id: o.id,
          name: o.name,
          isBot: o.isBot,
          hp: o.hp,
          armor: o.armor,
          alive: o.alive,
          rank: o.state.rank,
          relics: o.state.relics,
          ready: o.ready,
        };
        if (o.lastBoard) pub.lastBoard = o.lastBoard;
        // Whole boards only for spectators: someone still playing must not scout the others' cards.
        if (o.lastFightBoard && (!p.alive || this.phase === "ENDED")) pub.lastFightBoard = o.lastFightBoard;
        if (o.placement !== undefined) pub.placement = o.placement;
        if (o.state.hero !== undefined) pub.hero = o.state.hero;
        return pub;
      }),
    };
    if (p.placement !== undefined) view.me.placement = p.placement;
    if (p.lastCombat) view.lastCombat = p.lastCombat;
    return view;
  }

  private limitsOf(p: MatchPlayer): MatchView["me"]["limits"] {
    const c = withRules(p.state, this.env.cfg);
    return {
      buyCost: c.buyCost,
      refreshCost: p.state.freeRefreshes > 0 ? 0 : c.refreshCost,
      sellValue: c.sellValue,
      maxEnergy: c.maxEnergy,
      boardSize: c.boardSize,
      handSize: c.handSize,
    };
  }

  private heroPowerOf(p: MatchPlayer): MatchView["me"]["heroPower"] {
    const power = p.state.hero ? this.env.content.heroes.get(p.state.hero)?.power : undefined;
    if (!power) return null;
    const spent = power.mode === "ACTIVE" ? p.state.heroPowerUsed : power.mode === "ONCE" ? p.state.heroPowerSpent : true;
    return {
      mode: power.mode,
      cost: power.cost,
      usable: this.phase === "RECRUIT" && p.alive && !spent && p.state.energy >= power.cost,
    };
  }

  // -------------------------------------------------------------------- input

  /** Apply one player intent. Throws RuleError (and changes nothing) if it is not allowed right now. */
  dispatch(playerId: string, intent: Intent, now: number): void {
    this.tick(now);
    const p = this.player(playerId);
    if (this.phase === "ENDED") throw new RuleError("the match is over");
    if (!p.alive) throw new RuleError("you have been eliminated");

    if (intent.type === "SURRENDER") {
      this.surrender(p, now);
      return;
    }
    if (intent.type === "CHOOSE_HERO") {
      if (this.phase !== "HERO_SELECT") throw new RuleError("hero select is over");
      this.chooseHero(p, intent.index);
      this.maybeStartRecruit(now);
      return;
    }
    if (this.phase !== "RECRUIT") throw new RuleError("you can only do that while recruiting");

    const { env } = this;
    const s = p.state;
    switch (intent.type) {
      case "BUY":
        buyUnit(s, intent.index, env);
        break;
      case "BUY_GEAR":
        buyGear(s, env);
        break;
      case "COMBINE":
        combineGattai(s, intent.index, env);
        break;
      case "SELL":
        sellUnit(s, intent.from, intent.index, env);
        break;
      case "PLAY":
        playUnit(s, intent.handIndex, intent.position, env);
        break;
      case "REORDER":
        reorder(s, intent.from, intent.to);
        break;
      case "REFRESH":
        refresh(s, env.pool, env.rng, env.cfg, env.gear);
        break;
      case "FREEZE":
        toggleFreeze(s);
        break;
      case "UPGRADE":
        upgrade(s, env.cfg);
        break;
      case "USE_GEAR":
        useGear(s, intent.handIndex, env, intent.target);
        break;
      case "HERO_POWER":
        useHeroPower(s, env);
        break;
      case "PICK_DISCOVER":
        pickDiscover(s, intent.index, env);
        break;
      case "CHOOSE_RELIC":
        chooseRelic(s, intent.index, env);
        break;
      case "READY": {
        if (!this.config.readyEndsRecruit) throw new RuleError("there is no Ready: every recruit turn runs its full time");
        p.ready = true;
        const humans = this.players.filter((x) => x.alive && !x.isBot);
        if (humans.length > 0 && humans.every((x) => x.ready)) this.finishRecruit(now);
        break;
      }
    }
  }

  /** A player gives up: out at once, placed just above everyone already out, whatever the phase. */
  private surrender(p: MatchPlayer, now: number): void {
    p.alive = false;
    p.ready = false;
    p.hp = 0;
    p.placement = this.aliveCount + 1; // aliveCount no longer counts p
    this.events.push({ type: "ELIMINATED", playerId: p.id, placement: p.placement });
    const humansLeft = this.players.some((x) => x.alive && !x.isBot);
    if (this.aliveCount <= 1 || !humansLeft) {
      this.end();
      return;
    }
    if (this.phase === "HERO_SELECT") this.maybeStartRecruit(now);
    else if (this.phase === "RECRUIT" && this.players.filter((x) => x.alive && !x.isBot).every((x) => x.ready)) this.finishRecruit(now);
  }

  /** Advance every phase whose deadline has passed (catching up if the caller was late). */
  tick(now: number): void {
    for (let guard = 0; guard < 500 && this.deadline !== null && now >= this.deadline; guard++) {
      const at = this.deadline;
      switch (this.phase) {
        case "HERO_SELECT":
          for (const p of this.players) if (p.state.hero === undefined) this.chooseHero(p, 0);
          this.startRecruit(1, at);
          break;
        case "RECRUIT":
          this.finishRecruit(at);
          break;
        case "BATTLE":
          if (this.aliveCount <= 1 || this.turn >= this.config.maxTurns) this.end();
          else this.startRecruit(this.turn + 1, at);
          break;
        case "ENDED":
          return;
      }
    }
  }

  // ------------------------------------------------------------------ phases

  private emitPhase(): void {
    this.events.push({ type: "PHASE", phase: this.phase, turn: this.turn, deadline: this.deadline });
  }

  private chooseHero(p: MatchPlayer, index: number): void {
    if (p.state.hero !== undefined) throw new RuleError("hero already chosen");
    const key = p.heroOptions[index];
    if (key === undefined) throw new RuleError(`no hero option ${index}`);
    assignHero(p.state, key, this.env);
    p.armor = this.env.content.heroes.get(key)?.armor ?? 0;
  }

  private maybeStartRecruit(now: number): void {
    if (this.phase === "HERO_SELECT" && this.players.every((p) => !p.alive || p.state.hero !== undefined)) {
      this.startRecruit(1, now);
    }
  }

  private startRecruit(turn: number, at: number): void {
    this.phase = "RECRUIT";
    this.turn = turn;
    this.deadline = at + recruitDuration(turn, this.config);
    for (const p of this.players) {
      if (!p.alive) continue;
      p.ready = false;
      beginTurn(p.state, turn, this.env);
      for (const tier of ["LESSER", "GREATER"] as const) {
        if (turn === this.config.relicTurns[tier]) {
          try {
            offerRelics(p.state, tier, this.env);
          } catch (e) {
            if (!(e instanceof RuleError)) throw e;
          }
        }
      }
      if (p.isBot) runBot(p.state, turn, this.env);
    }
    this.emitPhase();
  }

  private finishRecruit(at: number): void {
    for (const p of this.players) {
      if (!p.alive) continue;
      autoChooseRelic(p.state, this.env);
      delete p.state.relicOffer;
      endTurn(p.state, this.env);
    }
    this.startBattle(at);
  }

  private startBattle(at: number): void {
    this.phase = "BATTLE";
    this.deadline = at + this.config.battleMs;

    const alive = this.players.filter((p) => p.alive);
    const prepared = new Map<string, Prepared>();
    for (const p of alive) {
      const { units, extras } = prepareCombat(p.state, this.env);
      prepared.set(p.id, { units, extras, rank: p.state.rank });
      p.lastBoard = summarise(units, this.turn);
      p.lastFightBoard = units.map((u) => ({ cardKey: u.cardKey, atk: u.atk, hp: u.hp, golden: u.golden ?? false, keywords: [...(u.keywords ?? [])] }));
    }

    const history = new Map(alive.map((p) => [p.id, p.opponents] as const));
    const pairing = pairPlayers(alive.map((p) => p.id), history, this.combatRng, this.config.noRepeatRounds, this.lastGhostFor);
    this.lastGhostFor = pairing.ghostFor;

    interface Fight {
      idA: string;
      /** null = a Ghost. */
      idB: string | null;
      prepA: Prepared;
      prepB: Prepared;
    }
    const fights: Fight[] = pairing.pairs.map(([a, b]) => ({
      idA: a,
      idB: b,
      prepA: prepared.get(a) as Prepared,
      prepB: prepared.get(b) as Prepared,
    }));
    if (pairing.ghostFor !== undefined) {
      const ghost = this.pickGhost(pairing.ghostFor, prepared);
      fights.push({
        idA: pairing.ghostFor,
        idB: null,
        prepA: prepared.get(pairing.ghostFor) as Prepared,
        prepB: { units: ghost.units, extras: ghost.extras, rank: ghost.rank },
      });
    }

    // Simulate every fight before applying any, so no board changes while others are still being read.
    const simulated = fights.map((f) => {
      const seed = this.combatRng.int(1_000_000);
      const result = simulateCombat(f.prepA.units, f.prepB.units, seed, {
        ...combatOptions(this.env),
        a: f.prepA.extras,
        b: f.prepB.extras,
      });
      return { ...f, seed, result };
    });

    for (const f of simulated) {
      const pa = this.player(f.idA);
      const pb = f.idB === null ? undefined : this.player(f.idB);
      applyCombatOutcome(pa.state, f.result, "A", this.env);
      if (pb) applyCombatOutcome(pb.state, f.result, "B", this.env);

      // The winner hits the loser's hero. A Ghost has no hero to hit.
      let takenA = 0;
      let takenB = 0;
      let dealtA = 0;
      let dealtB = 0;
      if (f.result.winner === "A") {
        if (pb) {
          dealtA = heroDamage(f.prepA.rank, f.result.survivorsA.map((u) => u.rank), this.turn, this.env.cfg);
          takenB = this.damage(pb, dealtA);
        } // beating a Ghost hurts no one
      } else if (f.result.winner === "B") {
        dealtB = heroDamage(f.prepB.rank, f.result.survivorsB.map((u) => u.rank), this.turn, this.env.cfg);
        takenA = this.damage(pa, dealtB);
      }

      pa.lastCombat = this.record(pb, "A", f, takenA, dealtA);
      if (pb) pb.lastCombat = this.record(pa, "B", f, takenB, dealtB);
      if (pb) {
        pa.opponents.push(pb.id);
        pb.opponents.push(pa.id);
      }
    }

    this.eliminate(alive, prepared);
    this.emitPhase();
  }

  /** Armor soaks damage first. Returns the HP actually lost. */
  private damage(p: MatchPlayer, amount: number): number {
    const absorbed = Math.min(p.armor, amount);
    p.armor -= absorbed;
    const lost = amount - absorbed;
    p.hp -= lost;
    return lost;
  }

  private record(
    opponent: MatchPlayer | undefined,
    meSide: Side,
    f: { prepA: Prepared; prepB: Prepared; seed: number; result: CombatResult },
    damageTaken: number,
    damageDealt: number,
  ): CombatRecord {
    return {
      turn: this.turn,
      opponentId: opponent?.id ?? null,
      opponentName: opponent?.name ?? "Ghost",
      ghost: opponent === undefined,
      meSide,
      seed: f.seed,
      boardA: f.prepA.units,
      boardB: f.prepB.units,
      extrasA: f.prepA.extras,
      extrasB: f.prepB.extras,
      result: f.result,
      damageTaken,
      damageDealt,
    };
  }

  /** A Ghost is a recently eliminated player's last board, or a copy of someone else's if nobody has fallen yet. */
  private pickGhost(forId: string, prepared: Map<string, Prepared>): GhostBoard {
    const fallen = this.ghosts.slice(-3);
    if (fallen.length > 0) return this.combatRng.pick(fallen);
    const others = [...prepared.keys()].filter((id) => id !== forId);
    const donor = others.length > 0 ? this.combatRng.pick(others) : forId;
    const board = prepared.get(donor) as Prepared;
    return { ownerId: donor, units: board.units, extras: board.extras, rank: board.rank };
  }

  /** Players at 0 HP or below go out; the worst (lowest HP) get the worst placements. */
  private eliminate(alive: MatchPlayer[], prepared: Map<string, Prepared>): void {
    const dead = alive.filter((p) => p.hp <= 0).sort((x, y) => x.hp - y.hp);
    let place = alive.length;
    for (const p of dead) {
      const board = prepared.get(p.id) as Prepared;
      p.alive = false;
      p.placement = place--;
      this.ghosts.push({ ownerId: p.id, units: board.units, extras: board.extras, rank: board.rank });
      this.events.push({ type: "ELIMINATED", playerId: p.id, placement: p.placement });
    }
  }

  private end(): void {
    // Survivors (one, or several if the turn limit hit) take the top placements, best HP first.
    const survivors = this.players
      .filter((p) => p.alive)
      .sort((x, y) => y.hp - x.hp || y.armor - x.armor);
    survivors.forEach((p, i) => {
      p.placement = i + 1;
    });
    this.phase = "ENDED";
    this.deadline = null;
    this.emitPhase();
    this.events.push({
      type: "ENDED",
      placements: this.players
        .map((p) => ({ playerId: p.id, placement: p.placement as number }))
        .sort((x, y) => x.placement - y.placement),
    });
  }
}

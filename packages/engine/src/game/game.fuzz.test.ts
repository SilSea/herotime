import { describe, expect, it } from "vitest";
import { simulateCombat, heroDamage } from "../combat/combat.js";
import { DEFAULT_CONFIG } from "../config.js";
import { Rng } from "../rng/rng.js";
import { newPlayer, refresh, reorder, RuleError, toggleFreeze, upgrade, type PlayerState } from "../shop/economy.js";
import { buildEnv } from "../testing-world.js";
import type { GameEnv } from "./env.js";
import {
  applyCombatOutcome,
  assignHero,
  autoChooseRelic,
  beginTurn,
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
} from "./session.js";

const PLAYERS = 4;
const TURNS = 12;
const HEROES = ["time_traveler", "red_leader", "prof_belt", "blank"];

interface Game {
  env: GameEnv;
  players: PlayerState[];
  hp: number[];
  initial: Map<string, number>;
  problems: string[];
}

const pooledKeys = (env: GameEnv): string[] => [...env.content.cards.keys()].filter((k) => env.pool.has(k));

/** Every card copy must be in exactly one place: pool, a shop, a hand/board (Final Form = 3), or a pending Discover. */
function checkInvariants(g: Game, label: string): void {
  const { env, players, initial, problems } = g;
  const bad = (msg: string): void => void problems.push(`${label}: ${msg}`);

  for (const key of pooledKeys(env)) {
    let total = env.pool.count(key);
    for (const p of players) {
      total += p.shop.filter((k) => k === key).length;
      for (const u of [...p.hand, ...p.board]) if (u.key === key) total += u.golden ? 3 : 1;
      for (const d of p.discovers) if (d.destination === "HAND") total += d.options.filter((k) => k === key).length;
    }
    if (total !== initial.get(key)) bad(`pool leak for ${key}: ${total} copies exist, expected ${initial.get(key)}`);
  }

  players.forEach((p, i) => {
    const who = `p${i}`;
    if (!Number.isInteger(p.energy) || p.energy < 0 || p.energy > DEFAULT_CONFIG.maxEnergy) bad(`${who} energy ${p.energy}`);
    if (p.board.length > DEFAULT_CONFIG.boardSize) bad(`${who} board ${p.board.length}`);
    if (p.hand.length > DEFAULT_CONFIG.handSize) bad(`${who} hand ${p.hand.length}`);
    if (p.rank < 1 || p.rank > DEFAULT_CONFIG.maxRank) bad(`${who} rank ${p.rank}`);
    for (const u of [...p.hand, ...p.board]) {
      if (!env.content.cards.has(u.key)) bad(`${who} owns unknown card ${u.key}`);
      else {
        const s = env.content.stats(u);
        if (!(s.atk >= 0 && s.hp > 0)) bad(`${who} ${u.key} has stats ${s.atk}/${s.hp}`);
      }
    }
    for (const [k, v] of Object.entries(p.gauges)) {
      const max = env.content.gauges.get(k)?.max ?? 0;
      if (v < 0 || v > max) bad(`${who} gauge ${k}=${v} outside 0..${max}`);
    }
    if (p.relics.length > 2) bad(`${who} holds ${p.relics.length} relics`);
    if (new Set(p.relics).size !== p.relics.length) bad(`${who} holds a duplicate relic`);
  });
}

/** One random legal-or-illegal intent. Illegal ones must fail with RuleError and change nothing. */
function randomIntent(g: Game, p: PlayerState, rng: Rng): void {
  const { env } = g;
  const pick = (n: number): number => rng.int(Math.max(1, n));
  const snapshot = JSON.stringify(p);
  try {
    switch (rng.int(14)) {
      case 0:
      case 1:
        buyUnit(p, pick(p.shop.length), env);
        break;
      case 2:
      case 3:
        playUnit(p, pick(p.hand.length), pick(p.board.length + 1), env);
        break;
      case 4:
        sellUnit(p, rng.int(2) === 0 ? "board" : "hand", pick(7), env);
        break;
      case 5:
        refresh(p, env.pool, env.rng, env.cfg);
        break;
      case 6:
        toggleFreeze(p);
        break;
      case 7:
        upgrade(p, env.cfg);
        break;
      case 8:
        reorder(p, pick(p.board.length), pick(p.board.length));
        break;
      case 9:
        useGear(p, pick(p.hand.length), env);
        break;
      case 10:
        useHeroPower(p, env);
        break;
      case 11:
        pickDiscover(p, pick(3), env);
        break;
      case 12:
        if (p.relicOffer) chooseRelic(p, pick(4), env);
        break;
      default: {
        // a gift out of the pool so triples and higher ranks actually come up
        const key = env.pool.draw(env.rng, p.rank + 1);
        if (key !== undefined && p.hand.length < DEFAULT_CONFIG.handSize) p.hand.push({ key, golden: false });
        else if (key !== undefined) env.pool.give(key);
      }
    }
  } catch (e) {
    if (!(e instanceof RuleError)) throw e;
    // a rejected intent must not have changed anything
    if (JSON.stringify(p) !== snapshot) g.problems.push(`rejected intent changed state: ${(e as Error).message}`);
  }
}

function playGame(seed: number): { game: Game; digest: string } {
  const env = buildEnv(undefined, seed);
  const initial = new Map<string, number>();
  for (const key of pooledKeys(env)) initial.set(key, env.pool.count(key));

  const game: Game = {
    env,
    players: Array.from({ length: PLAYERS }, () => newPlayer()),
    hp: Array.from({ length: PLAYERS }, () => 30),
    initial,
    problems: [],
  };
  const monkey = new Rng(seed * 7919 + 13); // separate stream: the monkey must not perturb the engine's RNG
  game.players.forEach((p, i) => assignHero(p, HEROES[i % HEROES.length] as string, env));

  for (let turn = 1; turn <= TURNS; turn++) {
    for (const p of game.players) {
      beginTurn(p, turn, env);
      if (turn === 5) offerRelics(p, "LESSER", env);
      if (turn === 9) offerRelics(p, "GREATER", env);
    }
    for (const p of game.players) {
      for (let a = 0, n = 4 + monkey.int(10); a < n; a++) randomIntent(game, p, monkey);
      autoChooseRelic(p, env); // anything still on offer times out
      endTurn(p, env);
    }
    checkInvariants(game, `seed ${seed} turn ${turn} (recruit)`);

    // fights: pair players off at random
    const order = monkey.shuffle([...game.players.keys()]);
    for (let k = 0; k + 1 < order.length; k += 2) {
      const [ia, ib] = [order[k] as number, order[k + 1] as number];
      const [pa, pb] = [game.players[ia] as PlayerState, game.players[ib] as PlayerState];
      const [a, b] = [prepareCombat(pa, env), prepareCombat(pb, env)];
      const r = simulateCombat(a.units, b.units, env.rng.int(1_000_000), { ...combatOptions(env), a: a.extras, b: b.extras });
      applyCombatOutcome(pa, r, "A", env);
      applyCombatOutcome(pb, r, "B", env);
      if (r.winner !== "DRAW") {
        const [loser, winnerPlayer, survivors, wr] = r.winner === "A" ? [ib, pa, r.survivorsA, pa.rank] : [ia, pb, r.survivorsB, pb.rank];
        void winnerPlayer;
        game.hp[loser] = (game.hp[loser] as number) - heroDamage(wr, survivors.map((s) => s.rank), turn);
      }
    }
    checkInvariants(game, `seed ${seed} turn ${turn} (after combat)`);
  }

  const digest = JSON.stringify({
    players: game.players,
    hp: game.hp,
    pool: pooledKeys(env).map((k) => [k, env.pool.count(k)]),
  });
  return { game, digest };
}

describe("full-game fuzz (random intents, 4 players, 12 turns)", () => {
  it("never leaks or invents a card, and rejected intents change nothing", () => {
    const problems: string[] = [];
    let triples = 0;
    let henshins = 0;
    let gear = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const { game } = playGame(seed);
      problems.push(...game.problems);
      for (const p of game.players) {
        triples += [...p.hand, ...p.board].filter((u) => u.golden).length;
        henshins += p.board.filter((u) => u.key === "rider_form").length;
        gear += p.giant ? 1 : 0;
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
    // the monkey must actually reach the interesting systems, or the invariants prove little
    expect(triples).toBeGreaterThan(0);
    expect(henshins).toBeGreaterThan(0);
    void gear;
  }, 180_000);

  it("the same seed always plays out identically", () => {
    for (const seed of [3, 11, 29]) {
      expect(playGame(seed).digest).toBe(playGame(seed).digest);
    }
  }, 120_000);
});

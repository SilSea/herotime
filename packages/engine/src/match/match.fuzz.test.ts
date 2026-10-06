import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { RuleError } from "../shop/economy.js";
import { buildWorld } from "../testing-world.js";
import { Match } from "./match.js";
import type { Entrant, Intent } from "./types.js";

const world = buildWorld();
const T0 = 5_000_000;

function randomIntent(rng: Rng): Intent {
  const i = (n: number): number => rng.int(n);
  switch (rng.int(13)) {
    case 0: return { type: "CHOOSE_HERO", index: i(3) };
    case 1: case 2: return { type: "BUY", index: i(5) };
    case 3: case 4: return { type: "PLAY", handIndex: i(6), position: i(8) };
    case 5: return { type: "SELL", from: rng.int(2) === 0 ? "board" : "hand", index: i(8) };
    case 6: return { type: "REFRESH" };
    case 7: return { type: "FREEZE" };
    case 8: return { type: "UPGRADE" };
    case 9: return { type: "REORDER", from: i(7), to: i(7) };
    case 10: return { type: "USE_GEAR", handIndex: i(6) };
    case 11: return { type: "PICK_DISCOVER", index: i(3) };
    default: return rng.int(4) === 0 ? { type: "READY" } : { type: "HERO_POWER" };
  }
}

/** Total copies of each pooled card, wherever they are. Must equal the starting supply forever. */
function copiesInPlay(m: Match): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (k: string, n: number): void => void totals.set(k, (totals.get(k) ?? 0) + n);
  for (const key of m.env.content.cards.keys()) if (m.env.pool.has(key)) add(key, m.env.pool.count(key));
  for (const p of m.players) {
    for (const k of p.state.shop) add(k, 1);
    for (const u of [...p.state.hand, ...p.state.board]) if (m.env.pool.has(u.key)) add(u.key, u.golden ? 3 : 1);
    for (const d of p.state.discovers) if (d.destination === "HAND") for (const k of d.options) add(k, 1);
  }
  return totals;
}

function playMatch(seed: number): { digest: string; problems: string[]; humansActed: number; turns: number } {
  const rng = new Rng(seed * 104729 + 7);
  const n = 2 + rng.int(7);
  const entrants: Entrant[] = Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isBot: rng.int(3) !== 0, // about two thirds bots, the rest are monkeys
  }));
  const m = Match.create({ content: world, seed, entrants, now: T0, config: { maxTurns: 14 } });
  const start = copiesInPlay(m);
  const problems: string[] = [];
  let humansActed = 0;
  let now = T0;
  const phase = (): string => m.phase; // read fresh each time: TS narrows m.phase inside the loop

  const check = (label: string): void => {
    const now2 = copiesInPlay(m);
    for (const [k, v] of start) if (now2.get(k) !== v) problems.push(`seed ${seed} ${label}: ${k} has ${now2.get(k)} copies, expected ${v}`);
    for (const p of m.players) {
      if (p.state.energy < 0 || p.state.energy > 10) problems.push(`seed ${seed} ${label}: ${p.id} energy ${p.state.energy}`);
      if (p.state.board.length > 7 || p.state.hand.length > 10) problems.push(`seed ${seed} ${label}: ${p.id} overflowing zones`);
      if (p.alive && p.hp <= 0) problems.push(`seed ${seed} ${label}: ${p.id} alive at ${p.hp} HP`);
      if (!p.alive && p.placement === undefined) problems.push(`seed ${seed} ${label}: ${p.id} dead without placement`);
    }
  };

  for (let step = 0; step < 4000 && phase() !== "ENDED"; step++) {
    // the monkeys act a few times, then time passes
    for (const p of m.players.filter((x) => !x.isBot && x.alive)) {
      for (let a = 0, k = rng.int(5); a < k; a++) {
        const intent = randomIntent(rng);
        const before = JSON.stringify(m.player(p.id).state);
        try {
          m.dispatch(p.id, intent, now);
          humansActed++;
        } catch (e) {
          if (!(e instanceof RuleError)) throw e;
          if (JSON.stringify(m.player(p.id).state) !== before) problems.push(`seed ${seed}: rejected ${intent.type} changed state`);
        }
        if (phase() === "ENDED") break;
      }
    }
    check(`step ${step} phase ${m.phase} turn ${m.turn}`);
    if (phase() === "ENDED" || m.deadline === null) break;
    now = rng.int(3) === 0 ? m.deadline : Math.min(m.deadline, now + 1 + rng.int(20_000));
    m.tick(now);
  }

  if (phase() !== "ENDED") problems.push(`seed ${seed}: did not finish (phase ${m.phase} turn ${m.turn})`);
  const placements = m.players.map((p) => p.placement).sort((a, b) => (a as number) - (b as number));
  if (JSON.stringify(placements) !== JSON.stringify(Array.from({ length: n }, (_, i) => i + 1))) {
    problems.push(`seed ${seed}: placements ${JSON.stringify(placements)} are not 1..${n}`);
  }
  const events = m.drainEvents();
  const elim = events.filter((e) => e.type === "ELIMINATED").length;
  if (elim > n - 1) problems.push(`seed ${seed}: ${elim} eliminations for ${n} players`);

  return { digest: JSON.stringify({ players: m.players, turn: m.turn, phase: m.phase }), problems, humansActed, turns: m.turn };
}

describe("match fuzz (2-8 players, bots + random humans)", () => {
  it("always finishes with valid placements and never leaks or invents a card", () => {
    const problems: string[] = [];
    let humansActed = 0;
    let longest = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const r = playMatch(seed);
      problems.push(...r.problems);
      humansActed += r.humansActed;
      longest = Math.max(longest, r.turns);
    }
    expect(problems.slice(0, 10)).toEqual([]);
    expect(humansActed).toBeGreaterThan(500); // the monkeys really did things
    expect(longest).toBeGreaterThan(5); // and matches go long enough to hit relics, ghosts, eliminations
  }, 240_000);

  it("the same seed replays identically", () => {
    for (const seed of [4, 17, 33]) expect(playMatch(seed).digest).toBe(playMatch(seed).digest);
  }, 120_000);
});

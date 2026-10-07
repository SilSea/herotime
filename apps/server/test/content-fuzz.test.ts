import { getContentSet } from "@herotime/content";
import { Content, Match, RuleError, Rng, type Entrant, type Intent } from "@herotime/engine";
import { describe, expect, it } from "vitest";

/**
 * Fuzz with the real content sets (all the newer mechanics: devour, discard, summon from hand, random gear,
 * upgrade forms, limits...): bots and random-clicking humans play whole matches. Nothing may crash, every
 * match ends with places 1..n, and no pooled card is ever lost or duplicated.
 */
function randomIntent(rng: Rng): Intent {
  const i = (n: number): number => rng.int(n);
  switch (rng.int(15)) {
    case 0: return { type: "CHOOSE_HERO", index: i(3) };
    case 1: case 2: return { type: "BUY", index: i(6) };
    case 3: case 4: return { type: "PLAY", handIndex: i(6), position: i(8) };
    case 5: return { type: "SELL", from: rng.int(2) === 0 ? "board" : "hand", index: i(8) };
    case 6: return { type: "REFRESH" };
    case 7: return { type: "FREEZE" };
    case 8: return { type: "UPGRADE" };
    case 9: return { type: "REORDER", from: i(7), to: i(7) };
    case 10: return { type: "USE_GEAR", handIndex: i(6), target: i(7) };
    case 11: return { type: "BUY_GEAR" };
    case 12: return { type: "PICK_DISCOVER", index: i(3) };
    case 13: return { type: "COMBINE", index: i(7) };
    default: return rng.int(3) === 0 ? { type: "CHOOSE_RELIC", index: i(4) } : { type: "HERO_POWER" };
  }
}

function copiesInPlay(m: Match): Map<string, number> {
  const c = m.env.content;
  const totals = new Map<string, number>();
  const add = (k: string, n: number): void => void totals.set(k, (totals.get(k) ?? 0) + n);
  for (const key of c.cards.keys()) if (m.env.pool.has(key)) add(key, m.env.pool.count(key));
  for (const p of m.players) {
    for (const k of p.state.shop) add(k, 1);
    for (const u of [...p.state.hand, ...p.state.board]) for (const { key, copies } of c.pooledCopies(u)) if (m.env.pool.has(key)) add(key, copies);
    for (const d of p.state.discovers) if (d.destination === "HAND") for (const k of d.options) add(k, 1);
  }
  return totals;
}

let turnsPlayed = 0;
let unitsOwned = 0;

function play(content: Content, seed: number): string[] {
  const rng = new Rng(seed * 7919 + 13);
  const n = 2 + rng.int(7);
  const entrants: Entrant[] = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, isBot: rng.int(3) !== 0 }));
  const m = Match.create({ content, seed, entrants, now: 0, config: { maxTurns: 16, readyEndsRecruit: true } });
  const start = copiesInPlay(m);
  const problems: string[] = [];
  const check = (label: string): void => {
    const now = copiesInPlay(m);
    for (const [k, v] of start) if (now.get(k) !== v) problems.push(`seed ${seed} ${label}: ${k} has ${now.get(k)} copies, expected ${v}`);
  };
  let now = 0;
  for (let guard = 0; m.phase !== "ENDED" && guard < 3000; guard++) {
    if (m.phase === "RECRUIT" || m.phase === "HERO_SELECT") {
      for (const p of m.players.filter((x) => !x.isBot && x.alive)) {
        for (let k = 0; k < 6; k++) {
          try {
            m.dispatch(p.id, randomIntent(rng), now);
          } catch (e) {
            if (!(e instanceof RuleError)) throw e;
          }
        }
      }
      check(`turn ${m.turn}`);
    }
    now = (m.deadline ?? now) + 1;
    m.tick(now);
  }
  if (m.phase !== "ENDED") problems.push(`seed ${seed}: did not end`);
  const places = m.players.map((p) => p.placement).sort((a, b) => (a ?? 0) - (b ?? 0));
  if (places.join() !== Array.from({ length: n }, (_, i) => i + 1).join()) problems.push(`seed ${seed}: places ${places.join()}`);
  check("end");
  turnsPlayed += m.turn;
  unitsOwned += m.players.reduce((n, p) => n + p.state.board.length, 0);
  return problems;
}

describe.each(["prototype", "production"])("fuzz with the %s set", (name) => {
  const content = new Content(getContentSet(name) as never);
  it("plays 60 messy matches without a crash, a wrong place or a lost card", () => {
    const problems: string[] = [];
    for (let seed = 1; seed <= 60; seed++) problems.push(...play(content, seed));
    expect(problems.slice(0, 10)).toEqual([]);
    // it really played: many turns, and boards were built
    expect(turnsPlayed).toBeGreaterThan(60 * 5);
    expect(unitsOwned).toBeGreaterThan(60);
    turnsPlayed = 0;
    unitsOwned = 0;
  }, 120_000);
});

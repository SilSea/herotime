import { describe, expect, it } from "vitest";
import { RuleError } from "../shop/economy.js";
import { HeroDef } from "@herotime/shared";
import { card, content } from "../testing.js";
import { buildWorld } from "../testing-world.js";
import { DEFAULT_MATCH_CONFIG, recruitDuration, type MatchConfig } from "./config.js";
import { Match } from "./match.js";
import type { Entrant, MatchEvent } from "./types.js";

const T0 = 1_000_000;
const world = buildWorld();

const humans = (n: number): Entrant[] => Array.from({ length: n }, (_, i) => ({ id: `h${i}`, name: `Human ${i}`, isBot: false }));
const bots = (n: number, from = 0): Entrant[] =>
  Array.from({ length: n }, (_, i) => ({ id: `b${from + i}`, name: `Bot ${from + i}`, isBot: true }));

// Most tests end recruit with READY to move on quickly; the default (no Ready) is tested on its own.
const make = (entrants: Entrant[], seed = 1, config: Partial<MatchConfig> = {}, now = T0) =>
  Match.create({ content: world, seed, entrants, now, config: { readyEndsRecruit: true, ...config } });

/** Get a match with only humans into the recruit phase by picking the first hero for everyone. */
function recruiting(entrants: Entrant[], seed = 1, config: Partial<MatchConfig> = {}): Match {
  const m = make(entrants, seed, config);
  for (const e of entrants) if (!e.isBot) m.dispatch(e.id, { type: "CHOOSE_HERO", index: 0 }, T0);
  return m;
}

/** Everyone ready -> battle starts. Returns the match, now in BATTLE. */
function toBattle(m: Match, now = T0): void {
  for (const p of m.players) if (!p.isBot && p.alive) m.dispatch(p.id, { type: "READY" }, now);
}

const phases = (events: MatchEvent[]) => events.filter((e) => e.type === "PHASE");

describe("recruitDuration", () => {
  it("40s, +5s per turn, capped at 75s", () => {
    const c = DEFAULT_MATCH_CONFIG;
    expect([1, 2, 3, 4].map((t) => recruitDuration(t, c))).toEqual([40_000, 45_000, 50_000, 55_000]);
    expect(recruitDuration(8, c)).toBe(75_000);
    expect(recruitDuration(30, c)).toBe(75_000);
  });

  it("relic turns (5 and 9) get 10s extra", () => {
    const c = DEFAULT_MATCH_CONFIG;
    expect(recruitDuration(5, c)).toBe(60_000 + 10_000);
    expect(recruitDuration(9, c)).toBe(75_000 + 10_000);
    expect(recruitDuration(6, c)).toBe(65_000);
  });
});

describe("creating a match", () => {
  it("needs 2 to 8 players with unique ids", () => {
    expect(() => make(humans(1))).toThrow(/2-8 players/);
    expect(() => make([...humans(5), ...bots(4)])).toThrow(/2-8 players/);
    expect(() => make([...humans(1), { id: "h0", name: "dup", isBot: false }])).toThrow(/duplicate/);
  });

  it("starts in hero select with a 30s deadline and 2 distinct hero options each", () => {
    const m = make(humans(3));
    expect(m.phase).toBe("HERO_SELECT");
    expect(m.deadline).toBe(T0 + 30_000);
    for (const p of m.players) {
      expect(p.heroOptions).toHaveLength(2);
      expect(new Set(p.heroOptions).size).toBe(2);
      for (const k of p.heroOptions) expect(world.heroes.has(k)).toBe(true);
    }
  });

  it("bots pick their hero immediately", () => {
    const m = make([...humans(1), ...bots(2)]);
    for (const p of m.players.filter((x) => x.isBot)) expect(p.state.hero).toBe(p.heroOptions[0]);
    expect(m.player("h0").state.hero).toBeUndefined();
  });
});

describe("hero select", () => {
  it("choosing a hero sets it (and its armor); the last choice starts recruit at once", () => {
    const m = make(humans(2));
    m.dispatch("h0", { type: "CHOOSE_HERO", index: 1 }, T0 + 1000);
    expect(m.player("h0").state.hero).toBe(m.player("h0").heroOptions[1]);
    expect(m.phase).toBe("HERO_SELECT");
    m.dispatch("h1", { type: "CHOOSE_HERO", index: 0 }, T0 + 2000);
    expect(m.phase).toBe("RECRUIT");
    expect(m.turn).toBe(1);
    expect(m.deadline).toBe(T0 + 2000 + 40_000);
  });

  it("rejects a bad index, a second choice and other intents", () => {
    const m = make(humans(2));
    expect(() => m.dispatch("h0", { type: "CHOOSE_HERO", index: 5 }, T0)).toThrow(RuleError);
    expect(() => m.dispatch("h0", { type: "BUY", index: 0 }, T0)).toThrow(/while recruiting/);
    m.dispatch("h0", { type: "CHOOSE_HERO", index: 0 }, T0);
    expect(() => m.dispatch("h0", { type: "CHOOSE_HERO", index: 1 }, T0)).toThrow(/already chosen/);
  });

  it("on timeout the first option is picked for anyone who has not chosen", () => {
    const m = make(humans(3));
    m.dispatch("h0", { type: "CHOOSE_HERO", index: 1 }, T0);
    m.tick(T0 + 30_000);
    expect(m.phase).toBe("RECRUIT");
    expect(m.player("h0").state.hero).toBe(m.player("h0").heroOptions[1]);
    expect(m.player("h1").state.hero).toBe(m.player("h1").heroOptions[0]);
    expect(m.deadline).toBe(T0 + 30_000 + 40_000); // measured from the deadline, not from when tick ran
  });

  it("an unknown player is rejected", () => {
    expect(() => make(humans(2)).dispatch("ghost", { type: "READY" }, T0)).toThrow(/unknown player/);
  });
});

describe("recruit phase", () => {
  it("everyone gets energy and a shop", () => {
    const m = recruiting(humans(2));
    for (const p of m.players) {
      expect(p.state.energy).toBe(3);
      expect(p.state.shop.length).toBeGreaterThan(0);
    }
  });

  it("BUY spends energy; a rejected intent changes nothing", () => {
    const m = recruiting(humans(2));
    const p = m.player("h0");
    m.dispatch("h0", { type: "BUY", index: 0 }, T0 + 1000);
    expect(p.state.energy).toBe(0);
    expect(p.state.hand).toHaveLength(1);
    const before = JSON.stringify(p.state);
    expect(() => m.dispatch("h0", { type: "BUY", index: 0 }, T0 + 2000)).toThrow(/not enough energy/);
    expect(JSON.stringify(p.state)).toBe(before);
  });

  it("an intent after the deadline is judged in the next phase", () => {
    const m = recruiting(humans(2));
    expect(() => m.dispatch("h0", { type: "BUY", index: 0 }, T0 + 40_000)).toThrow(/while recruiting/);
    expect(m.phase).toBe("BATTLE");
  });

  it("READY from every human ends recruit early; one human is not enough", () => {
    const m = recruiting(humans(2));
    m.dispatch("h0", { type: "READY" }, T0 + 5000);
    expect(m.phase).toBe("RECRUIT");
    m.dispatch("h1", { type: "READY" }, T0 + 6000);
    expect(m.phase).toBe("BATTLE");
    expect(m.deadline).toBe(T0 + 6000 + DEFAULT_MATCH_CONFIG.battleMs);
  });

  it("bots do not need to be ready", () => {
    const m = recruiting([...humans(1), ...bots(3)]);
    m.dispatch("h0", { type: "READY" }, T0 + 1000);
    expect(m.phase).toBe("BATTLE");
  });

  it("recruit lasts 40s on turn 1 and 45s on turn 2", () => {
    const m = recruiting(humans(2));
    expect(m.deadline).toBe(T0 + 40_000);
    m.tick(T0 + 40_000); // -> BATTLE
    m.tick(T0 + 40_000 + 20_000); // -> RECRUIT turn 2
    expect(m.turn).toBe(2);
    expect(m.deadline).toBe(T0 + 60_000 + 45_000);
  });

  it("relic offers appear on turns 5 and 9 for living players", () => {
    const m = recruiting([...humans(1), ...bots(1)], 3, { startHp: 9999 });
    let now = T0;
    for (let guard = 0; guard < 40 && m.turn < 5; guard++) {
      now = (m.deadline as number) + 1;
      m.tick(now);
    }
    expect(m.turn).toBe(5);
    expect(m.player("h0").state.relicOffer?.tier).toBe("LESSER");
  });

  it("pending relic offers resolve to a free option when recruit ends", () => {
    const m = recruiting([...humans(1), ...bots(1)], 3, { startHp: 9999 });
    for (let guard = 0; guard < 40 && m.turn < 5; guard++) m.tick((m.deadline as number) + 1);
    expect(m.player("h0").state.relicOffer).toBeDefined();
    m.dispatch("h0", { type: "READY" }, m.deadline as number - 1000);
    expect(m.player("h0").state.relicOffer).toBeUndefined();
  });
});

describe("what a player can see", () => {
  it("includes my full state but never another player's shop or hand", () => {
    const m = recruiting(humans(3));
    m.dispatch("h0", { type: "BUY", index: 0 }, T0 + 1);
    const v = m.view("h0");
    expect(v.me.state.hand).toHaveLength(1);
    expect(v.me.handStats).toHaveLength(1);
    const publicJson = JSON.stringify(v.players);
    expect(publicJson).not.toContain("shop");
    expect(publicJson).not.toContain("hand");
    expect(publicJson).not.toContain("board");
    // and the other players' shop cards are not smuggled in anywhere outside `me`
    const others = JSON.stringify({ ...v, me: undefined });
    for (const key of m.player("h1").state.shop.filter((k) => !m.player("h0").state.shop.includes(k) && k !== m.player("h0").state.hand[0]?.key)) {
      expect(others).not.toContain(`"${key}"`);
    }
  });

  it("shows the board stats including golden and bonuses", () => {
    const m = recruiting(humans(2));
    const s = m.player("h0").state;
    s.board = [{ key: "grunt", golden: true, bonusAtk: 1 }];
    expect(m.view("h0").me.boardStats).toEqual([{ atk: 2 * 2 + 1, hp: 1 * 2 }]);
  });

  it("exposes public info for everyone", () => {
    const m = recruiting(humans(3));
    const v = m.view("h1");
    expect(v.players.map((p) => p.id)).toEqual(["h0", "h1", "h2"]);
    expect(v.players.every((p) => p.hp === 30 && p.alive)).toBe(true);
  });
});

describe("battle", () => {
  // Pairing decides who is side A, so every damage rule is checked under several seeds
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
  const setup = (n = 2, seed = 1) => {
    const m = recruiting(humans(n), seed);
    for (const p of m.players) p.armor = 0; // isolate from hero armor
    return m;
  };

  it("the winner hits the loser's hero for rank + surviving ranks (either side)", () => {
    const sides = new Set<string>();
    for (const seed of SEEDS) {
      const m = setup(2, seed);
      m.player("h0").state.board = [{ key: "elder", golden: false }]; // rank 3
      toBattle(m);
      expect(m.phase).toBe("BATTLE");
      expect(m.player("h1").hp).toBe(26); // base rank 1 + one surviving rank-3 unit
      expect(m.player("h0").hp).toBe(30);
      expect(m.player("h1").lastCombat?.damageTaken).toBe(4);
      expect(m.player("h0").lastCombat?.damageDealt).toBe(4);
      expect(m.player("h0").lastCombat?.damageTaken).toBe(0);
      sides.add(m.player("h0").lastCombat?.meSide as string);
    }
    expect(sides).toEqual(new Set(["A", "B"])); // the loop really covered both orientations
  });

  it("armor soaks damage first (either side)", () => {
    for (const seed of SEEDS) {
      const m = setup(2, seed);
      m.player("h0").state.board = [{ key: "elder", golden: false }];
      m.player("h1").armor = 3;
      toBattle(m);
      expect(m.player("h1").armor).toBe(0);
      expect(m.player("h1").hp).toBe(29);
      expect(m.player("h1").lastCombat?.damageTaken).toBe(1); // only the HP actually lost
    }
  });

  it("armor bigger than the hit is only partly used", () => {
    const m = setup();
    m.player("h0").state.board = [{ key: "elder", golden: false }];
    m.player("h1").armor = 10;
    toBattle(m);
    expect(m.player("h1").armor).toBe(6);
    expect(m.player("h1").hp).toBe(30);
  });

  it("empty boards draw: nobody is hurt", () => {
    const m = setup();
    toBattle(m);
    expect(m.players.map((p) => p.hp)).toEqual([30, 30]);
  });

  it("damage is capped at 15 through turn 8", () => {
    const m = setup();
    m.player("h0").state.rank = 6;
    m.player("h0").state.board = Array.from({ length: 7 }, () => ({ key: "elder", golden: false }));
    toBattle(m);
    expect(m.player("h1").hp).toBe(15);
  });

  it("each side's record shows the same fight from its own side", () => {
    const m = setup();
    m.player("h0").state.board = [{ key: "elder", golden: false }];
    toBattle(m);
    const [a, b] = [m.player("h0").lastCombat, m.player("h1").lastCombat];
    expect(a?.seed).toBe(b?.seed);
    expect([a?.meSide, b?.meSide].sort()).toEqual(["A", "B"]);
    expect(a?.opponentId).toBe("h1");
    expect(b?.opponentId).toBe("h0");
    expect(a?.ghost).toBe(false);
    expect(m.view("h0").lastCombat?.turn).toBe(1);
  });

  it("permanent buffs and gauge points from the fight are applied", () => {
    const m = setup();
    const rangers = ["ranger_red", "ranger_blue", "ranger_yellow", "ranger_green", "ranger_pink"];
    m.player("h0").state.board = rangers.map((key) => ({ key, golden: false }));
    toBattle(m);
    expect(m.player("h0").lastCombat?.result.rollCall[m.player("h0").lastCombat?.meSide as "A" | "B"]).toBe(true);
    expect(m.player("h0").state.gauges.mecha).toBe(2); // roll call + win
  });

  it("battle then recruit again after battleMs", () => {
    const m = setup();
    toBattle(m, T0 + 1000);
    m.tick(T0 + 1000 + DEFAULT_MATCH_CONFIG.battleMs - 1);
    expect(m.phase).toBe("BATTLE");
    m.tick(T0 + 1000 + DEFAULT_MATCH_CONFIG.battleMs);
    expect(m.phase).toBe("RECRUIT");
    expect(m.turn).toBe(2);
  });

  it("END_OF_TURN effects happen before the fight", () => {
    const m = setup();
    m.player("h0").state.board = [{ key: "cafe", golden: false }, { key: "grunt", golden: false }];
    m.player("h0").state.energy = 3;
    toBattle(m);
    expect(m.player("h0").state.board[1]).toMatchObject({ bonusAtk: 1, bonusHp: 1 });
  });
});

describe("ghosts", () => {
  it("with 3 players exactly one fights a Ghost, and no HP is lost that is not accounted for", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = recruiting(humans(3), seed);
      for (const p of m.players) p.armor = 0;
      m.player("h0").state.board = [{ key: "elder", golden: false }];
      toBattle(m);
      const ghosts = m.players.filter((p) => p.lastCombat?.ghost);
      expect(ghosts).toHaveLength(1);
      expect(ghosts[0]?.lastCombat?.opponentName).toBe("Ghost");
      expect(ghosts[0]?.lastCombat?.opponentId).toBeNull();
      expect(ghosts[0]?.lastCombat?.damageDealt).toBe(0); // there is no Ghost hero to hurt
      // every point of HP lost shows up as someone's damageTaken: nothing hits a Ghost or a bystander
      const lost = m.players.reduce((n, p) => n + (30 - p.hp), 0);
      const taken = m.players.reduce((n, p) => n + (p.lastCombat?.damageTaken ?? 0), 0);
      expect(lost).toBe(taken);
    }
  });

  it("a player who loses to a Ghost still takes the damage", () => {
    let sawLoss = false;
    for (let seed = 1; seed <= 40 && !sawLoss; seed++) {
      const m = recruiting(humans(3), seed);
      for (const p of m.players) p.armor = 0;
      // everyone strong except h2; the Ghost copy comes from a strong board
      m.player("h0").state.board = [{ key: "elder", golden: false }, { key: "elder", golden: false }];
      m.player("h1").state.board = [{ key: "elder", golden: false }, { key: "elder", golden: false }];
      toBattle(m);
      const g = m.players.find((p) => p.lastCombat?.ghost);
      if (g && g.id === "h2" && g.hp < 30) sawLoss = true;
    }
    expect(sawLoss).toBe(true);
  });

  /** 4 players; h1 (weak, 1 HP, rank 4) falls in round 1 and the other three survive to round 2. */
  function fallenRound(seed: number) {
    const m = recruiting(humans(4), seed);
    for (const p of m.players) p.armor = 0;
    for (const id of ["h0", "h2", "h3"]) {
      m.player(id).state.board = Array.from({ length: 6 }, () => ({ key: "elder", golden: true }));
    }
    const h1 = m.player("h1");
    h1.hp = 1;
    h1.state.rank = 4;
    h1.state.board = [{ key: "scout", golden: false }, { key: "scout", golden: false }, { key: "scout", golden: false }];
    toBattle(m);
    const fallen = m.players.filter((p) => !p.alive);
    if (fallen.length !== 1 || fallen[0]?.id !== "h1" || m.aliveCount !== 3) return undefined;
    return m;
  }

  it("after someone is eliminated, a Ghost is exactly that player's last board", () => {
    let checked = false;
    for (let seed = 1; seed <= 60 && !checked; seed++) {
      const m = fallenRound(seed);
      if (!m) continue;
      const rec1 = m.player("h1").lastCombat;
      const fallenBoard = rec1?.meSide === "A" ? rec1.boardA : rec1?.boardB;
      expect(fallenBoard).toHaveLength(3); // the distinctive scout board

      m.tick(m.deadline as number); // -> recruit turn 2 with 3 players left: one faces a Ghost
      for (const p of m.players) p.armor = 0;
      toBattle(m, (m.deadline as number) - 1000);
      const ghostPlayer = m.players.find((p) => p.alive && p.lastCombat?.ghost && p.lastCombat.turn === 2);
      if (!ghostPlayer?.lastCombat) continue;
      const rec = ghostPlayer.lastCombat;
      const ghostBoard = rec.meSide === "A" ? rec.boardB : rec.boardA;
      expect(JSON.stringify(ghostBoard)).toBe(JSON.stringify(fallenBoard));
      checked = true;
    }
    expect(checked).toBe(true);
  });

  it("when a Ghost wins, the damage uses the Ghost's rank and surviving units", () => {
    let checked = false;
    for (let seed = 1; seed <= 80 && !checked; seed++) {
      const m = fallenRound(seed);
      if (!m) continue;
      m.tick(m.deadline as number); // -> recruit turn 2
      for (const p of m.players) {
        p.armor = 0;
        p.state.board = []; // everyone is empty: only the Ghost fight has a winner
      }
      const before = new Map(m.players.map((p) => [p.id, p.hp]));
      toBattle(m, (m.deadline as number) - 1000);
      const victim = m.players.find((p) => p.alive && p.lastCombat?.ghost && p.lastCombat.turn === 2);
      if (!victim) continue;
      // the Ghost is h1's old board: 3 scouts (rank 2) at tavern rank 4 -> 4 + 3 x 2 = 10
      expect(before.get(victim.id)).toBeGreaterThan(victim.hp);
      expect((before.get(victim.id) as number) - victim.hp).toBe(10);
      expect(victim.lastCombat?.damageTaken).toBe(10);
      checked = true;
    }
    expect(checked).toBe(true);
  });
});

describe("eliminations and placements", () => {
  it("a player at 0 HP is eliminated with the worst placement, and cannot act", () => {
    const m = recruiting(humans(2));
    m.player("h1").armor = 0;
    m.player("h1").hp = 3;
    m.player("h0").state.board = [{ key: "elder", golden: false }];
    toBattle(m);
    expect(m.player("h1").alive).toBe(false);
    expect(m.player("h1").placement).toBe(2);
    expect(m.player("h1").hp).toBeLessThanOrEqual(0);
    expect(() => m.dispatch("h1", { type: "READY" }, T0 + 1)).toThrow(/eliminated/);
    const events = m.drainEvents();
    expect(events.filter((e) => e.type === "ELIMINATED")).toEqual([{ type: "ELIMINATED", playerId: "h1", placement: 2 }]);
  });

  it("the match ends after the replay when one player is left, who places 1st", () => {
    const m = recruiting(humans(2));
    m.player("h1").armor = 0;
    m.player("h1").hp = 3;
    m.player("h0").state.board = [{ key: "elder", golden: false }];
    toBattle(m, T0 + 1000);
    expect(m.phase).toBe("BATTLE"); // the replay still plays
    m.tick(T0 + 1000 + DEFAULT_MATCH_CONFIG.battleMs);
    expect(m.phase).toBe("ENDED");
    expect(m.deadline).toBeNull();
    expect(m.player("h0").placement).toBe(1);
    const ended = m.drainEvents().find((e) => e.type === "ENDED");
    expect(ended).toEqual({ type: "ENDED", placements: [{ playerId: "h0", placement: 1 }, { playerId: "h1", placement: 2 }] });
    expect(() => m.dispatch("h0", { type: "READY" }, T0 + 99_999)).toThrow(/match is over/);
  });

  it("two players eliminated in the same round: the lower HP gets the worse placement", () => {
    let checked = false;
    for (let seed = 1; seed <= 60 && !checked; seed++) {
      const m = recruiting(humans(4), seed);
      for (const p of m.players) p.armor = 0;
      // h0 and h1 are strong, h2 and h3 empty and nearly dead
      for (const id of ["h0", "h1"]) m.player(id).state.board = [{ key: "elder", golden: false }];
      m.player("h2").hp = 1;
      m.player("h3").hp = 3;
      toBattle(m);
      const [h2, h3] = [m.player("h2"), m.player("h3")];
      if (h2.alive || h3.alive) continue; // both weak players must have met strong ones this round
      expect(h2.hp).toBeLessThan(h3.hp + 0.0001);
      expect(h2.placement).toBeGreaterThan(h3.placement as number);
      expect([h2.placement, h3.placement].sort()).toEqual([3, 4]);
      checked = true;
    }
    expect(checked).toBe(true);
  });

  it("placements end up a permutation of 1..N with a bots-only match", () => {
    const m = make(bots(8), 5);
    let guard = 0;
    while (m.phase !== "ENDED" && guard++ < 500) m.tick((m.deadline as number) + 1);
    expect(m.phase).toBe("ENDED");
    expect(m.players.map((p) => p.placement).sort((a, b) => (a as number) - (b as number))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("the turn limit ends the match, ranking survivors by HP", () => {
    const m = make(bots(4), 9, { startHp: 99_999, maxTurns: 3 });
    let guard = 0;
    while (m.phase !== "ENDED" && guard++ < 100) m.tick((m.deadline as number) + 1);
    expect(m.phase).toBe("ENDED");
    expect(m.turn).toBe(3);
    const placed = [...m.players].sort((a, b) => (a.placement as number) - (b.placement as number));
    expect(placed.map((p) => p.placement)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < placed.length; i++) expect((placed[i] as { hp: number }).hp).toBeLessThanOrEqual((placed[i - 1] as { hp: number }).hp);
  });
});

describe("events", () => {
  it("emits a PHASE event for every transition, in order", () => {
    const m = recruiting(humans(2));
    toBattle(m, T0 + 100);
    const seen = phases(m.drainEvents()).map((e) => (e.type === "PHASE" ? `${e.phase}:${e.turn}` : ""));
    expect(seen).toEqual(["HERO_SELECT:0", "RECRUIT:1", "BATTLE:1"]);
    expect(m.drainEvents()).toEqual([]); // drained
  });
});

describe("determinism", () => {
  const run = (seed: number) => {
    const m = make([...bots(6), ...bots(2, 6)], seed);
    let guard = 0;
    while (m.phase !== "ENDED" && guard++ < 500) m.tick((m.deadline as number) + 1);
    return JSON.stringify({ players: m.players, turn: m.turn });
  };

  it("the same seed gives the same match", () => {
    expect(run(21)).toBe(run(21));
    expect(run(21)).not.toBe(run(22));
  });
});

describe("gaps worth pinning down", () => {
  it("a hero's armor from content is applied when it is chosen", () => {
    const armored = content({
      cards: [card("u", { rank: 1 })],
      heroes: [HeroDef.parse({ key: "tank", name: "Tank", armor: 5 }), HeroDef.parse({ key: "tank2", name: "Tank2", armor: 5 })],
    });
    const m = Match.create({ content: armored, seed: 1, now: T0, entrants: humans(2) });
    m.dispatch("h0", { type: "CHOOSE_HERO", index: 0 }, T0);
    expect(m.player("h0").armor).toBe(5);
    expect(m.player("h1").armor).toBe(0); // not chosen yet
  });

  it("a pending relic offer is resolved to the free option, not just dropped", () => {
    const m = recruiting([...humans(1), ...bots(1)], 3, { startHp: 9999 });
    for (let guard = 0; guard < 40 && m.turn < 5; guard++) m.tick((m.deadline as number) + 1);
    expect(m.player("h0").state.relics).toEqual([]);
    m.dispatch("h0", { type: "READY" }, (m.deadline as number) - 1000);
    expect(m.player("h0").state.relics).toHaveLength(1);
    expect(world.relics.get(m.player("h0").state.relics[0] as string)?.cost).toBe(0);
  });

  it("an eliminated player gets no more turns", () => {
    // pairing is random, so look for a seed where the strong player really knocked someone out
    let checked = false;
    for (let seed = 1; seed <= 40 && !checked; seed++) {
      const m = recruiting(humans(4), seed);
      for (const p of m.players) p.armor = 0;
      m.player("h0").state.board = Array.from({ length: 4 }, () => ({ key: "elder", golden: false }));
      for (const id of ["h1", "h2", "h3"]) m.player(id).hp = 1;
      toBattle(m);
      const dead = m.players.filter((p) => !p.alive);
      if (dead.length === 0 || m.aliveCount <= 1) continue; // need a match that keeps going
      const frozen = dead.map((p) => JSON.stringify(p.state));
      for (let i = 0; i < 3 && m.deadline !== null; i++) m.tick(m.deadline);
      dead.forEach((p, i) => expect(JSON.stringify(p.state)).toBe(frozen[i]));
      checked = true;
    }
    expect(checked).toBe(true);
  });

  it("READY is cleared for the next recruit phase", () => {
    const m = recruiting(humans(2));
    toBattle(m);
    expect(m.players.every((p) => p.ready)).toBe(true);
    m.tick(m.deadline as number);
    expect(m.phase).toBe("RECRUIT");
    expect(m.players.every((p) => !p.ready)).toBe(true);
  });

  it("over 3 rounds with 4 players nobody meets the same opponent twice", () => {
    const m = recruiting(humans(4), 6, { startHp: 99_999 });
    for (let round = 1; round <= 3; round++) {
      toBattle(m, m.deadline as number - 1000);
      if (round < 3) m.tick(m.deadline as number);
    }
    for (const p of m.players) {
      expect(p.opponents).toHaveLength(3);
      expect(new Set(p.opponents).size).toBe(3);
    }
  });

  it("the Ghost never lands on the same player two rounds running", () => {
    const m = recruiting(humans(3), 8, { startHp: 99_999 });
    let last: string | undefined;
    for (let round = 1; round <= 8; round++) {
      toBattle(m, m.deadline as number - 1000);
      const ghostPlayer = m.players.find((p) => p.lastCombat?.ghost && p.lastCombat.turn === round)?.id;
      expect(ghostPlayer).toBeDefined();
      expect(ghostPlayer).not.toBe(last);
      last = ghostPlayer;
      m.tick(m.deadline as number);
    }
  });

  it("both sides of a fight earn their gauge points", () => {
    const rangers = ["ranger_red", "ranger_blue", "ranger_yellow", "ranger_green", "ranger_pink"];
    for (let seed = 1; seed <= 8; seed++) {
      const m = recruiting(humans(2), seed);
      for (const id of ["h0", "h1"]) m.player(id).state.board = rangers.map((key) => ({ key, golden: false }));
      toBattle(m);
      // both called the roll, so both get at least the roll-call point; the winner also gets the win point
      for (const id of ["h0", "h1"]) expect(m.player(id).state.gauges.mecha).toBeGreaterThanOrEqual(1);
      const total = (m.player("h0").state.gauges.mecha ?? 0) + (m.player("h1").state.gauges.mecha ?? 0);
      expect([3, 2]).toContain(total); // 1 + 1 (+1 for the winner, unless it was a draw)
    }
  });
});

describe("timeline and bots", () => {
  it("a late tick catches up without drifting the schedule", () => {
    const m = make(humans(2));
    m.tick(T0 + 30_000 + 7_000); // 7s late: hero select ended at +30s, so recruit should end at +70s
    expect(m.phase).toBe("RECRUIT");
    expect(m.deadline).toBe(T0 + 30_000 + 40_000);
    m.tick(T0 + 30_000 + 40_000 + 3_000); // 3s late again
    expect(m.phase).toBe("BATTLE");
    expect(m.deadline).toBe(T0 + 70_000 + DEFAULT_MATCH_CONFIG.battleMs);
  });

  it("one very late tick plays through several phases in order", () => {
    const m = make(humans(2), 1, { startHp: 99_999 });
    m.tick(T0 + 10 * 60_000);
    expect(m.turn).toBeGreaterThan(3);
    expect(m.deadline as number).toBeGreaterThan(T0 + 10 * 60_000 - 100_000);
  });

  it("turn 9 offers a Greater relic", () => {
    const m = recruiting([...humans(1), ...bots(1)], 3, { startHp: 99_999 });
    for (let guard = 0; guard < 60 && m.turn < 9; guard++) m.tick((m.deadline as number) + 1);
    expect(m.turn).toBe(9);
    expect(m.player("h0").state.relicOffer?.tier).toBe("GREATER");
  });

  it("bots take real actions on their first turn", () => {
    const m = make(bots(4), 2);
    for (const p of m.players) {
      expect(p.state.board.length + p.state.hand.length).toBeGreaterThan(0);
      expect(p.state.energy).toBeLessThan(3);
    }
  });
});

describe("what the view says things cost", () => {
  it("shows the default prices and limits", () => {
    const m = recruiting(humans(2));
    expect(m.view("h0").me.limits).toEqual({ buyCost: 3, refreshCost: 1, sellValue: 1, maxEnergy: 10, boardSize: 7, handSize: 10 });
  });

  it("follows rule changes: a free refresh shows as 0, other rules show their new values", () => {
    const m = recruiting(humans(2));
    const s = m.player("h0").state;
    s.freeRefreshes = 1;
    s.rules.buyCost = 2;
    s.rules.boardSize = 6;
    expect(m.view("h0").me.limits).toMatchObject({ refreshCost: 0, buyCost: 2, boardSize: 6 });
    s.freeRefreshes = 0;
    expect(m.view("h0").me.limits.refreshCost).toBe(1);
    expect(m.view("h1").me.limits.buyCost).toBe(3); // someone else's rules do not leak
  });

  it("describes the hero power and whether it can be used right now", () => {
    const m = recruiting(humans(2), 1);
    const power = (id: string) => m.view(id).me.heroPower;
    const withHero = (id: string, hero: string) => {
      m.player(id).state.hero = hero;
    };
    withHero("h0", "red_leader"); // ACTIVE, 2 energy
    withHero("h1", "time_traveler"); // PASSIVE
    expect(power("h0")).toEqual({ mode: "ACTIVE", cost: 2, usable: true });
    expect(power("h1")).toEqual({ mode: "PASSIVE", cost: 0, usable: false });

    m.player("h0").state.energy = 1;
    expect(power("h0")?.usable).toBe(false); // cannot afford
    m.player("h0").state.energy = 5;
    m.player("h0").state.heroPowerUsed = true;
    expect(power("h0")?.usable).toBe(false); // used this turn

    withHero("h1", "prof_belt"); // ONCE, free
    expect(power("h1")).toEqual({ mode: "ONCE", cost: 0, usable: true });
    m.player("h1").state.heroPowerSpent = true;
    expect(power("h1")?.usable).toBe(false);
  });

  it("a hero without a power, and any hero outside the recruit phase, cannot use one", () => {
    const m = recruiting(humans(2));
    m.player("h0").state.hero = "blank";
    expect(m.view("h0").me.heroPower).toBeNull();
    m.player("h1").state.hero = "red_leader";
    m.player("h1").state.energy = 9;
    toBattle(m);
    expect(m.view("h1").me.heroPower?.usable).toBe(false);
  });
});

describe("surrender", () => {
  it("puts the player out at once, in last place among those still in", () => {
    const m = recruiting(humans(3));
    m.dispatch("h1", { type: "SURRENDER" }, T0 + 1000);
    expect(m.player("h1").alive).toBe(false);
    expect(m.player("h1").placement).toBe(3);
    expect(m.player("h1").hp).toBe(0);
    expect(m.drainEvents().some((e) => e.type === "ELIMINATED" && e.playerId === "h1" && e.placement === 3)).toBe(true);
    expect(() => m.dispatch("h1", { type: "BUY", index: 0 }, T0 + 1500)).toThrow(RuleError);
  });

  it("a surrendered player no longer holds up READY, and is skipped by later pairings", () => {
    const m = recruiting(humans(3));
    m.dispatch("h0", { type: "READY" }, T0 + 1000);
    m.dispatch("h1", { type: "READY" }, T0 + 1100);
    expect(m.phase).toBe("RECRUIT");
    m.dispatch("h2", { type: "SURRENDER" }, T0 + 1200);
    expect(m.phase).toBe("BATTLE");
    expect(m.player("h2").lastCombat).toBeUndefined();
  });

  it("the last survivor wins the match immediately", () => {
    const m = recruiting(humans(2));
    m.dispatch("h0", { type: "SURRENDER" }, T0 + 1000);
    expect(m.phase).toBe("ENDED");
    expect(m.player("h1").placement).toBe(1);
    expect(m.player("h0").placement).toBe(2);
  });

  it("the match ends when no human is left, even with bots alive", () => {
    const m = recruiting([...humans(1), ...bots(3)]);
    m.dispatch("h0", { type: "SURRENDER" }, T0 + 1000);
    expect(m.phase).toBe("ENDED");
    expect(m.player("h0").placement).toBe(4);
    const places = m.players.map((p) => p.placement).sort();
    expect(places).toEqual([1, 2, 3, 4]);
  });

  it("works during hero select and during battle", () => {
    const early = make(humans(3));
    early.dispatch("h0", { type: "SURRENDER" }, T0 + 500);
    early.dispatch("h1", { type: "CHOOSE_HERO", index: 0 }, T0 + 600);
    early.dispatch("h2", { type: "CHOOSE_HERO", index: 0 }, T0 + 700);
    expect(early.phase).toBe("RECRUIT");

    const m = recruiting(humans(3));
    toBattle(m, T0 + 1000);
    expect(m.phase).toBe("BATTLE");
    m.dispatch("h0", { type: "SURRENDER" }, T0 + 1500);
    expect(m.player("h0").alive).toBe(false);
    m.tick(T0 + 1000 + DEFAULT_MATCH_CONFIG.battleMs);
    expect(m.phase).toBe("RECRUIT");
    expect(m.turn).toBe(2);
  });

  it("is refused once the match is over", () => {
    const m = recruiting(humans(2));
    m.dispatch("h0", { type: "SURRENDER" }, T0 + 1000);
    expect(() => m.dispatch("h1", { type: "SURRENDER" }, T0 + 1100)).toThrow(RuleError);
  });
});

describe("no Ready button by default", () => {
  it("READY is refused and recruit runs until its deadline", () => {
    const m = Match.create({ content: world, seed: 1, entrants: humans(2), now: T0 });
    for (const id of ["h0", "h1"]) m.dispatch(id, { type: "CHOOSE_HERO", index: 0 }, T0);
    expect(m.phase).toBe("RECRUIT");
    expect(() => m.dispatch("h0", { type: "READY" }, T0 + 1000)).toThrow(/no Ready/);
    expect(m.player("h0").ready).toBe(false);
    m.tick(T0 + recruitDuration(1, DEFAULT_MATCH_CONFIG) - 1);
    expect(m.phase).toBe("RECRUIT");
    m.tick(T0 + recruitDuration(1, DEFAULT_MATCH_CONFIG));
    expect(m.phase).toBe("BATTLE");
  });
  it("the default config says so", () => {
    expect(DEFAULT_MATCH_CONFIG.readyEndsRecruit).toBe(false);
  });
});

describe("last seen boards", () => {
  it("nobody has one before the first fight; afterwards everyone's board make-up is public, but not the cards", () => {
    const m = recruiting(humans(2));
    expect(m.view("h0").players.every((p) => p.lastBoard === undefined)).toBe(true);
    const s = m.player("h1").state;
    const shopUnit = [...world.cards.values()].find((c) => c.kind === "UNIT" && !c.token && c.factions.length > 0) as { key: string; factions: string[] };
    s.board.push({ key: shopUnit.key, golden: false }, { key: shopUnit.key, golden: false });
    toBattle(m);
    const seen = m.view("h0").players.find((p) => p.id === "h1")?.lastBoard;
    expect(seen).toMatchObject({ turn: 1, units: 2 });
    for (const f of shopUnit.factions) expect(seen?.factions[f]).toBe(2);
    expect(Object.keys(seen ?? {}).sort()).toEqual(["factions", "neutral", "turn", "units"]); // counts only, never which cards
  });
});

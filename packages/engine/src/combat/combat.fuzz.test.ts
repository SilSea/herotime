import type { Effect, KeywordKey, SentaiColor } from "@herotime/shared";
import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { card, content, effect } from "../testing.js";
import type { CombatUnitInput, CombatSideExtras } from "../types.js";
import { simulateCombat } from "./combat.js";

const KEYWORDS: KeywordKey[] = ["GUARD", "BARRIER", "RAPID", "LETHAL", "REVIVE", "RIDER_KICK", "FINAL_BLOW", "KYODAIKA", "GATTAI"];
const FACTIONS = ["sentai", "mecha", "rider", "grunt"];
const COLORS: SentaiColor[] = ["RED", "BLUE", "YELLOW", "GREEN", "PINK", "EXTRA"];
const TRIGGERS = ["START_OF_COMBAT", "LAST_STAND", "ON_ATTACK", "AFTER_DAMAGED", "AVENGE"] as const;
const SELECTORS = ["SELF", "ADJACENT", "LEFTMOST_FRIENDLY", "RIGHTMOST_FRIENDLY", "RANDOM_FRIENDLY", "ALL_FRIENDLY", "LEFTMOST_ENEMY", "RANDOM_ENEMY", "ALL_ENEMY"] as const;

const world = content({ cards: [card("tok", { atk: 1, hp: 1, token: true }), card("big", { atk: 6, hp: 6 })] });

function randomEffect(rng: Rng): Effect {
  const pickAction = (): object => {
    switch (rng.int(6)) {
      case 0: return { type: "BUFF", atk: rng.int(3), hp: rng.int(3), permanent: rng.int(2) === 0 };
      case 1: return { type: "SUMMON", cardKey: "tok", count: 1 + rng.int(2) };
      case 2: return { type: "DAMAGE", amount: 1 + rng.int(3) };
      case 3: return { type: "GIVE_KEYWORD", keyword: rng.pick(KEYWORDS) };
      case 4: return { type: "DESTROY" };
      default: return { type: "TRANSFORM", into: rng.pick(["tok", "big"]) };
    }
  };
  const condition = [
    undefined,
    { type: "TEAM_UP_COLORS_GTE", value: 1 + rng.int(3) },
    { type: "FACTION_COUNT_GTE", faction: rng.pick(FACTIONS), value: 1 + rng.int(2) },
  ][rng.int(3)];
  return effect({
    trigger: rng.pick(TRIGGERS),
    every: rng.int(3) === 0 ? 1 + rng.int(3) : undefined,
    condition,
    target: { selector: rng.pick(SELECTORS), faction: rng.int(4) === 0 ? rng.pick(FACTIONS) : undefined },
    actions: [pickAction(), ...(rng.int(3) === 0 ? [pickAction()] : [])],
    goldenMultiplier: rng.int(5) === 0 ? 3 : undefined,
  });
}

function randomUnit(rng: Rng, tag: string): CombatUnitInput {
  const keywords = KEYWORDS.filter(() => rng.int(6) === 0);
  const unit: CombatUnitInput = {
    cardKey: tag,
    rank: 1 + rng.int(6),
    atk: rng.int(7),
    hp: 1 + rng.int(8),
    keywords,
    factions: rng.int(2) === 0 ? [rng.pick(FACTIONS)] : [],
    colors: rng.int(3) === 0 ? [rng.pick(COLORS)] : [],
    golden: rng.int(6) === 0,
    sourceId: `board:${tag}`,
    effects: Array.from({ length: rng.int(3) }, () => randomEffect(rng)),
  };
  return unit;
}

function randomSide(rng: Rng, tag: string): { board: CombatUnitInput[]; extras: CombatSideExtras } {
  const board = Array.from({ length: rng.int(8) }, (_, i) => randomUnit(rng, `${tag}${i}`));
  const extras: CombatSideExtras = {
    rules: {
      rollCallColors: 1 + rng.int(5),
      gattaiSize: 2 + rng.int(2),
      giantEntryThreshold: rng.int(4),
      kyodaikaMultiplier: 1 + rng.int(3),
    },
    playerEffects: rng.int(3) === 0 ? [effect({ scope: "PLAYER", trigger: "START_OF_COMBAT", target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] : [],
  };
  if (rng.int(3) === 0) extras.giant = randomUnit(rng, `${tag}giant`);
  return { board, extras };
}

describe("combat fuzz", () => {
  it("10,000 random fights with random effects always terminate cleanly", () => {
    const gen = new Rng(20261006);
    const MAX = 150;
    let draws = 0;
    let giants = 0;
    const problems: string[] = [];

    for (let i = 0; i < 10_000; i++) {
      const a = randomSide(gen, "a");
      const b = randomSide(gen, "b");
      const seed = gen.int(1_000_000);
      const opts = { content: world, maxAttacksPerCombat: MAX, a: a.extras, b: b.extras };
      const r = simulateCombat(a.board, b.board, seed, opts);

      // a result is internally consistent
      const bad = (msg: string): void => void problems.push(`#${i} seed=${seed}: ${msg}`);
      if (!["A", "B", "DRAW"].includes(r.winner)) bad(`winner ${r.winner}`);
      if (r.attacks > MAX) bad(`attacks ${r.attacks} > ${MAX}`);
      if (r.winner === "A" && !(r.survivorsA.length > 0 && r.survivorsB.length === 0)) bad("winner A but survivors disagree");
      if (r.winner === "B" && !(r.survivorsB.length > 0 && r.survivorsA.length === 0)) bad("winner B but survivors disagree");
      const all = [...r.survivorsA, ...r.survivorsB];
      if (new Set(all.map((s) => s.uid)).size !== all.length) bad("duplicate survivor uid");
      for (const s of all) {
        if (!(s.hp > 0)) bad(`survivor ${s.uid} (${s.cardKey}) has hp ${s.hp}`);
        if (!Number.isFinite(s.atk) || !Number.isFinite(s.hp)) bad(`survivor ${s.uid} non-finite`);
      }
      for (const e of r.events) {
        if (e.type === "ATTACK" && e.attacker[0] === e.target[0]) bad(`${e.attacker} attacked its own side`);
      }
      for (const side of ["A", "B"] as const) {
        if (r.events.filter((e) => e.type === "GIANT_ENTER" && e.side === side).length > 1) bad(`giant ${side} entered twice`);
        if (r.events.filter((e) => e.type === "ROLL_CALL" && e.side === side).length > 1) bad(`roll call ${side} twice`);
      }

      if (r.winner === "DRAW") draws++;
      giants += r.events.filter((e) => e.type === "GIANT_ENTER").length;

      // identical inputs replay identically
      if (i % 40 === 0 && JSON.stringify(simulateCombat(a.board, b.board, seed, opts)) !== JSON.stringify(r)) bad("not deterministic");
    }

    expect(problems.slice(0, 10)).toEqual([]);

    // sanity: the generator really exercises the interesting paths, not just empty boards
    expect(giants).toBeGreaterThan(100);
    expect(draws).toBeLessThan(10_000);
  }, 120_000);
});

import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { fuzzWorld as world, randomSide } from "../testing-fuzz.js";
import { simulateCombat } from "./combat.js";

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

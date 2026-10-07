import { describe, expect, it } from "vitest";
import { simulateCombat } from "./combat.js";
import { card, content, effect, fighter } from "../testing.js";

const cub = card("cub", { rank: 1, atk: 1, hp: 1, token: true });
const world = content({ cards: [cub] });
const hawk = fighter("hawk", 2, 30, { effects: [effect({ trigger: "ON_ATTACK", actions: [{ type: "SUMMON", cardKey: "cub" }] })] });
const tamer = fighter("tamer", 0, 30, { effects: [effect({ trigger: "ALLY_SUMMONED", target: { selector: "SUMMONED" }, actions: [{ type: "BUFF", atk: 2, hp: 2 }] })] });

describe("ALLY_SUMMONED in a fight", () => {
  it("buffs every newly summoned unit, and nothing else", () => {
    const r = simulateCombat([hawk, tamer], [fighter("dummy", 0, 50)], 1, { content: world });
    const summoned = new Set(r.events.flatMap((e) => (e.type === "SUMMON" ? [e.unit] : [])));
    const buffs = r.events.filter((e) => e.type === "BUFF");
    expect(summoned.size).toBeGreaterThan(0);
    expect(buffs).toHaveLength(summoned.size);
    for (const b of buffs) {
      expect(b).toMatchObject({ atk: 2, hp: 2 });
      expect(summoned.has((b as { unit: string }).unit)).toBe(true);
    }
  });

  it("the newcomer does not react to its own arrival", () => {
    const selfish = fighter("selfish", 2, 30, {
      effects: [
        effect({ trigger: "ON_ATTACK", actions: [{ type: "SUMMON", cardKey: "tamer_cub" }] }),
      ],
    });
    const tamerCub = card("tamer_cub", { rank: 1, atk: 1, hp: 1, token: true, effects: [effect({ trigger: "ALLY_SUMMONED", target: { selector: "SUMMONED" }, actions: [{ type: "BUFF", atk: 5, hp: 5 }] })] });
    const r = simulateCombat([selfish], [fighter("dummy", 0, 50)], 1, { content: content({ cards: [tamerCub] }) });
    // the first cub has nobody to buff it; later cubs are buffed by the earlier ones
    const firstSummon = r.events.find((e) => e.type === "SUMMON") as { unit: string };
    expect(r.events.some((e) => e.type === "BUFF" && (e as { unit: string }).unit === firstSummon.unit)).toBe(false);
  });
});

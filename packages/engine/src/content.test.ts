import { describe, expect, it } from "vitest";
import { Content } from "./content.js";
import { card, effect } from "./testing.js";
import { buildWorld } from "./testing-world.js";
import { GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";

const invalid = (data: ConstructorParameters<typeof Content>[0]): string => {
  try {
    new Content(data);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected invalid content");
};

describe("Content", () => {
  it("accepts the realistic test world", () => {
    expect(() => buildWorld()).not.toThrow();
    expect(buildWorld().validate()).toEqual([]);
  });

  it("flags actions and targets used in the wrong phase", () => {
    const problems = invalid({
      cards: [
        card("a", { effects: [effect({ trigger: "LAST_STAND", actions: [{ type: "GAIN_ENERGY", amount: 1 }] })] }),
        card("b", { effects: [effect({ trigger: "ON_PLAY", actions: [{ type: "DAMAGE", amount: 1 }] })] }),
        card("c", { effects: [effect({ trigger: "END_OF_TURN", target: { selector: "RANDOM_ENEMY" }, actions: [{ type: "BUFF", atk: 1, hp: 0 }] })] }),
        card("ok", { effects: [effect({ trigger: "START_OF_COMBAT", target: { selector: "RANDOM_ENEMY" }, actions: [{ type: "DAMAGE", amount: 1 }] })] }),
      ],
    });
    expect(problems).toMatch(/card "a": GAIN_ENERGY only works in the recruit phase, not on LAST_STAND/);
    expect(problems).toMatch(/card "b": DAMAGE only works in a fight/);
    expect(problems).toMatch(/card "c": enemies can only be targeted in a fight/);
    expect(problems).not.toMatch(/card "ok"/);
  });

  it("rejects duplicate keys", () => {
    expect(() => new Content({ cards: [card("a"), card("a")] })).toThrow(/duplicate card key: a/);
    expect(() => new Content({ relics: [RelicDef.parse({ key: "r", name: "R", tier: "LESSER", cost: 0 }), RelicDef.parse({ key: "r", name: "R", tier: "LESSER", cost: 0 })] })).toThrow(/duplicate relic/);
  });

  it("card() throws for an unknown key", () => {
    expect(() => new Content({ cards: [card("a")] }).card("zzz")).toThrow(/unknown card: zzz/);
  });

  describe("dangling references", () => {
    it("unknown SUMMON / TRANSFORM / ADD_TO_HAND cards", () => {
      for (const action of [
        { type: "SUMMON", cardKey: "ghost" },
        { type: "TRANSFORM", into: "ghost" },
        { type: "ADD_TO_HAND", cardKey: "ghost" },
      ]) {
        const msg = invalid({ cards: [card("a", { effects: [effect({ trigger: "LAST_STAND", actions: [action] })] })] });
        expect(msg).toMatch(/card "a" references unknown card "ghost"/);
      }
    });

    it("unknown henshin target, series and gauge", () => {
      expect(invalid({ cards: [card("a", { henshin: { afterTurns: 1, into: "nope" } })] })).toMatch(/henshin references unknown card "nope"/);
      expect(invalid({ cards: [card("a", { series: "nope" })] })).toMatch(/unknown series "nope"/);
      const fx = effect({ scope: "PLAYER", trigger: "ON_ACQUIRE", actions: [{ type: "GAUGE_ADD", gauge: "nope", amount: 1 }] });
      expect(invalid({ relics: [RelicDef.parse({ key: "r", name: "R", tier: "LESSER", cost: 0, effects: [fx] })] })).toMatch(/unknown gauge "nope"/);
    });

    it("reports every problem at once", () => {
      const msg = invalid({ cards: [card("a", { series: "x", henshin: { afterTurns: 1, into: "y" } })] });
      expect(msg).toMatch(/unknown series "x"/);
      expect(msg).toMatch(/unknown card "y"/);
    });
  });

  describe("effects that could never work", () => {
    it("unknown MODIFY_RULE rule", () => {
      const fx = effect({ scope: "PLAYER", trigger: "ON_ACQUIRE", actions: [{ type: "MODIFY_RULE", rule: "gravity", op: "SET", value: 1 }] });
      expect(invalid({ relics: [RelicDef.parse({ key: "r", name: "R", tier: "LESSER", cost: 0, effects: [fx] })] })).toMatch(/unknown rule "gravity"/);
    });

    it("a unit card with a player-scope effect", () => {
      const fx = effect({ scope: "PLAYER", trigger: "ON_PLAY", actions: [{ type: "GAIN_ENERGY", amount: 1 }] });
      expect(invalid({ cards: [card("a", { effects: [fx] })] })).toMatch(/only gear may have/);
    });

    it("gear whose effects are not player-scope ON_PLAY", () => {
      const fx = effect({ trigger: "LAST_STAND", actions: [{ type: "DESTROY" }] });
      expect(invalid({ cards: [card("g", { kind: "GEAR", effects: [fx] })] })).toMatch(/gear: its effects must be player-scope ON_PLAY/);
    });

    it("series bonds that are not player-scope START_OF_COMBAT", () => {
      const fx = effect({ trigger: "START_OF_COMBAT", actions: [{ type: "BUFF", atk: 1 }] });
      const series = SeriesDef.parse({ key: "s", name: "S", bonds: [{ count: 2, effects: [fx] }] });
      expect(invalid({ series: [series] })).toMatch(/bond effects must be player-scope START_OF_COMBAT/);
    });

    it("gauge rewards that need a target", () => {
      const gauge = GaugeDef.parse({ key: "g", name: "G", max: 3, thresholds: [{ at: 1, reward: [{ type: "BUFF", atk: 1 }] }] });
      expect(invalid({ gauges: [gauge] })).toMatch(/reward uses BUFF, which needs a target/);
    });

    it("hero powers are checked too", () => {
      const fx = effect({ scope: "PLAYER", trigger: "ON_USE", actions: [{ type: "SUMMON", cardKey: "ghost" }] });
      const hero = HeroDef.parse({ key: "h", name: "H", power: { mode: "ACTIVE", effects: [fx] } });
      expect(invalid({ heroes: [hero] })).toMatch(/hero "h" references unknown card "ghost"/);
    });
  });

  describe("stats and combat snapshots", () => {
    const world = new Content({ cards: [card("a", { atk: 2, hp: 3, keywords: ["GUARD"], series: undefined })] });

    it("golden doubles base stats and bonuses stack on top", () => {
      expect(world.stats({ key: "a", golden: false })).toEqual({ atk: 2, hp: 3 });
      expect(world.stats({ key: "a", golden: true })).toEqual({ atk: 4, hp: 6 });
      expect(world.stats({ key: "a", golden: true, bonusAtk: 1, bonusHp: 2 })).toEqual({ atk: 5, hp: 8 });
    });

    it("toCombat merges granted keywords without duplicates and tags the source", () => {
      const input = world.toCombat({ key: "a", golden: true, keywords: ["GUARD", "RAPID"] }, "board:2");
      expect(input).toMatchObject({ cardKey: "a", atk: 4, hp: 6, golden: true, sourceId: "board:2" });
      expect([...(input.keywords ?? [])].sort()).toEqual(["GUARD", "RAPID"]);
    });
  });
});

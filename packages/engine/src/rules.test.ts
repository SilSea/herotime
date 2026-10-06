import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./config.js";
import {
  combatRulesOf,
  isRule,
  modifyRule,
  ruleDefault,
  ruleValue,
  withRules,
  type RuleHolder,
} from "./rules.js";

const holder = (): RuleHolder => ({ rules: {} });

describe("rules", () => {
  it("knows game, combat and extra rules, and nothing else", () => {
    for (const r of ["buyCost", "rollCallColors", "freeRefreshesPerTurn", "giantEntryThreshold"]) {
      expect(isRule(r)).toBe(true);
    }
    expect(isRule("gravity")).toBe(false);
    expect(isRule("shopSize")).toBe(false); // an array in the config, not a tunable number
  });

  it("defaults come from the config", () => {
    expect(ruleDefault("buyCost")).toBe(DEFAULT_CONFIG.buyCost);
    expect(ruleDefault("rollCallColors")).toBe(5);
    expect(ruleDefault("freeRefreshesPerTurn")).toBe(0);
    expect(() => ruleDefault("gravity")).toThrow(/unknown rule/);
  });

  it("SET / ADD / MUL", () => {
    const h = holder();
    modifyRule(h, "buyCost", "SET", 1);
    expect(h.rules.buyCost).toBe(1);
    modifyRule(h, "buyCost", "ADD", 2);
    expect(h.rules.buyCost).toBe(3);
    modifyRule(h, "buyCost", "MUL", 2);
    expect(h.rules.buyCost).toBe(6);
  });

  it("ADD and MUL start from the default when nothing was set", () => {
    const a = holder();
    modifyRule(a, "buyCost", "ADD", -1);
    expect(a.rules.buyCost).toBe(DEFAULT_CONFIG.buyCost - 1);
    const m = holder();
    modifyRule(m, "kyodaikaMultiplier", "MUL", 1.5);
    expect(m.rules.kyodaikaMultiplier).toBe(3);
  });

  it("rejects an unknown rule without changing anything", () => {
    const h = holder();
    expect(() => modifyRule(h, "gravity", "SET", 1)).toThrow(/unknown rule/);
    expect(h.rules).toEqual({});
  });

  it("withRules overlays only game rules and does not mutate the base config", () => {
    const h: RuleHolder = { rules: { buyCost: 1, rollCallColors: 4, freeRefreshesPerTurn: 2 } };
    const c = withRules(h);
    expect(c.buyCost).toBe(1);
    expect(c.refreshCost).toBe(DEFAULT_CONFIG.refreshCost);
    expect(DEFAULT_CONFIG.buyCost).toBe(3);
    expect("rollCallColors" in c).toBe(false);
  });

  it("combatRulesOf returns only combat rules", () => {
    const h: RuleHolder = { rules: { buyCost: 1, rollCallColors: 4, giantEntryThreshold: 3 } };
    expect(combatRulesOf(h)).toEqual({ rollCallColors: 4, giantEntryThreshold: 3 });
    expect(combatRulesOf(holder())).toEqual({});
  });

  it("ruleValue prefers the override", () => {
    const h: RuleHolder = { rules: { sellValue: 0 } };
    expect(ruleValue(h, "sellValue")).toBe(0); // a falsy override still wins
    expect(ruleValue(h, "buyCost")).toBe(3);
  });
});

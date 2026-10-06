import { RelicDef, SeriesDef } from "@herotime/shared";
import { describe, expect, it } from "vitest";
import { Rng } from "../rng/rng.js";
import { newPlayer, RuleError } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content } from "../testing.js";
import { buildEnv } from "../testing-world.js";
import { makeEnv, type GameEnv } from "./env.js";
import { autoChooseRelic, chooseRelic, offerRelics, prepareCombat } from "./session.js";

const relic = (key: string, over: Record<string, unknown> = {}) =>
  RelicDef.parse({ key, name: key, tier: "LESSER", cost: 2, ...over });

/** 7 lesser relics: one per board faction, one per series, one free, four generic. */
function relicEnv(seed: number, extra: RelicDef[] = []): GameEnv {
  const world = content({
    cards: [card("ally_unit", { factions: ["ally"] }), card("w_unit", { series: "w" })],
    series: [SeriesDef.parse({ key: "w", name: "W" })],
    relics: [
      relic("r_ally", { factions: ["ally"] }),
      relic("r_w", { series: "w" }),
      relic("r_free", { cost: 0 }),
      relic("r_x1"),
      relic("r_x2"),
      relic("r_x3"),
      relic("r_x4"),
      relic("g_big", { tier: "GREATER", cost: 5 }),
      ...extra,
    ],
  });
  return makeEnv({ content: world, pool: new Pool([{ key: "ally_unit", rank: 1 }, { key: "w_unit", rank: 1 }]), rng: new Rng(seed) });
}

const boardWith = (...keys: string[]) => {
  const p = newPlayer();
  p.board = keys.map((key) => ({ key, golden: false }));
  return p;
};

describe("offerRelics", () => {
  it("offers 4 distinct relics of the requested tier", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const env = relicEnv(seed);
      const options = offerRelics(boardWith("ally_unit"), "LESSER", env);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      for (const k of options) expect(env.content.relics.get(k)?.tier).toBe("LESSER");
    }
  });

  it("always includes a relic for the board's main faction and main series", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const env = relicEnv(seed);
      const options = offerRelics(boardWith("ally_unit", "ally_unit", "w_unit"), "LESSER", env);
      expect(options).toContain("r_ally");
      expect(options).toContain("r_w");
    }
  });

  it("always includes a free relic when one exists", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const env = relicEnv(seed);
      const options = offerRelics(boardWith("ally_unit", "ally_unit", "w_unit"), "LESSER", env);
      expect(options.some((k) => env.content.relics.get(k)?.cost === 0)).toBe(true);
    }
  });

  it("falls back to random picks when the board has no faction or series", () => {
    const env = relicEnv(3);
    expect(offerRelics(newPlayer(), "LESSER", env)).toHaveLength(4);
  });

  it("offers fewer than 4 when the content has fewer relics of that tier", () => {
    const world = content({ relics: [relic("only_a"), relic("only_b"), relic("big", { tier: "GREATER" })] });
    const env = makeEnv({ content: world, pool: new Pool([]), rng: new Rng(1) });
    expect(offerRelics(newPlayer(), "LESSER", env)).toHaveLength(2);
  });

  it("only one relic per tier", () => {
    const env = relicEnv(1);
    const p = newPlayer();
    offerRelics(p, "LESSER", env);
    chooseRelic(p, p.relicOffer?.options.findIndex((k) => k === "r_free") as number, env);
    expect(() => offerRelics(p, "LESSER", env)).toThrow(/already holding a lesser relic/);
    expect(() => offerRelics(p, "GREATER", env)).not.toThrow();
  });

  it("never offers a zero-weight relic", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const env = relicEnv(seed, [relic("r_never", { weight: 0 })]);
      expect(offerRelics(newPlayer(), "LESSER", env)).not.toContain("r_never");
    }
  });

  it("players may be offered the same relic", () => {
    const overlapping = [1, 2, 3, 4, 5, 6, 7, 8].filter((seed) => {
      const env = relicEnv(seed);
      const [a, b] = [offerRelics(newPlayer(), "LESSER", env), offerRelics(newPlayer(), "LESSER", env)];
      return a.some((k) => b.includes(k));
    });
    expect(overlapping.length).toBeGreaterThan(0); // 7 relics, 4 slots each: overlap is unavoidable
  });

  it("two players can hold the very same relic", () => {
    const env = buildEnv();
    const [a, b] = [newPlayer(), newPlayer()];
    for (const p of [a, b]) {
      p.energy = 5;
      p.relicOffer = { tier: "LESSER", options: ["bracelet", "plain_charm"] };
    }
    expect(chooseRelic(a, 0, env)).toBe("bracelet");
    expect(chooseRelic(b, 0, env)).toBe("bracelet");
    expect(a.relics).toEqual(["bracelet"]);
    expect(b.relics).toEqual(["bracelet"]);
  });

  it("is deterministic per seed", () => {
    const run = () => offerRelics(boardWith("ally_unit", "w_unit"), "LESSER", relicEnv(9));
    expect(run()).toEqual(run());
  });
});

describe("chooseRelic", () => {
  it("pays the cost and records the relic", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.energy = 5;
    p.relicOffer = { tier: "LESSER", options: ["bracelet", "rider_pass"] };
    expect(chooseRelic(p, 0, env)).toBe("bracelet");
    expect(p.energy).toBe(2);
    expect(p.relics).toEqual(["bracelet"]);
    expect(p.relicOffer).toBeUndefined();
  });

  it("an unaffordable pick throws and keeps the offer open", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.energy = 1;
    p.relicOffer = { tier: "LESSER", options: ["bracelet", "rider_pass"] };
    expect(() => chooseRelic(p, 0, env)).toThrow(/not enough energy/);
    expect(p.relicOffer?.options).toHaveLength(2);
    expect(p.relics).toEqual([]);
    expect(p.energy).toBe(1);
    expect(chooseRelic(p, 1, env)).toBe("rider_pass"); // the free one still works
  });

  it("rejects a missing offer or a bad index", () => {
    const env = buildEnv();
    const p = newPlayer();
    expect(() => chooseRelic(p, 0, env)).toThrow(/no relic offer/);
    p.relicOffer = { tier: "LESSER", options: ["bracelet"] };
    expect(() => chooseRelic(p, 4, env)).toThrow(RuleError);
  });

  it("ON_ACQUIRE applies MODIFY_RULE and GAUGE_ADD", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.energy = 10;
    p.relicOffer = { tier: "GREATER", options: ["team_banner", "gauge_core"] };
    chooseRelic(p, 0, env);
    expect(p.rules.rollCallColors).toBe(4);

    const q = newPlayer();
    q.energy = 10;
    q.relicOffer = { tier: "GREATER", options: ["gauge_core"] };
    chooseRelic(q, 0, env);
    expect(q.gauges.mecha).toBe(2);
    expect(q.rules.giantEntryThreshold).toBe(3);
  });
});

describe("autoChooseRelic (timeout)", () => {
  it("takes the free option", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.relicOffer = { tier: "LESSER", options: ["bracelet", "rider_pass", "coupon"] };
    expect(autoChooseRelic(p, env)).toBe("rider_pass");
    expect(p.relics).toEqual(["rider_pass"]);
  });

  it("drops the offer when nothing is free", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.relicOffer = { tier: "LESSER", options: ["bracelet", "coupon"] };
    expect(autoChooseRelic(p, env)).toBeUndefined();
    expect(p.relicOffer).toBeUndefined();
    expect(p.relics).toEqual([]);
  });

  it("does nothing without an offer", () => {
    expect(autoChooseRelic(newPlayer(), buildEnv())).toBeUndefined();
  });
});

describe("relics in combat", () => {
  it("START_OF_COMBAT relic effects reach the combat prep", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.relics = ["bracelet", "coupon"]; // only bracelet acts at combat start
    const { extras } = prepareCombat(p, env);
    expect(extras.playerEffects).toHaveLength(1);
    expect(extras.playerEffects?.[0]?.trigger).toBe("START_OF_COMBAT");
  });
});

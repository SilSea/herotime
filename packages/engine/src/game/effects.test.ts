import { describe, expect, it } from "vitest";
import type { Unit } from "../content.js";
import { Rng } from "../rng/rng.js";
import { newPlayer, type PlayerState } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect } from "../testing.js";
import { buildEnv } from "../testing-world.js";
import { addGauge, fireGaugeTrigger, runEffect, runTrigger } from "./effects.js";
import { makeEnv } from "./env.js";
import { sellUnit } from "./session.js";
import { GaugeDef } from "@herotime/shared";

const u = (key: string, golden = false): Unit => ({ key, golden });
const keys = (units: Unit[]): string[] => units.map((x) => x.key);

const setup = (seed = 1) => {
  const env = buildEnv(undefined, seed);
  const p: PlayerState = newPlayer();
  return { env, p };
};
const player = (e: Record<string, unknown>) => effect({ scope: "PLAYER", trigger: "ON_USE", ...e });

describe("GIVE_KEYWORD", () => {
  it("never duplicates a keyword", () => {
    const { env, p } = setup();
    const target = u("grunt");
    p.board = [target];
    const fx = effect({ trigger: "ON_PLAY", actions: [{ type: "GIVE_KEYWORD", keyword: "GUARD" }] });
    runEffect(fx, target, p, env);
    runEffect(fx, target, p, env);
    expect(target.keywords).toEqual(["GUARD"]);
  });
});

describe("SUMMON (recruit)", () => {
  const summon = (count = 1) => effect({ trigger: "ON_PLAY", actions: [{ type: "SUMMON", cardKey: "rider_form", count }] });

  it("lands to the right of the source", () => {
    const { env, p } = setup();
    const src = u("grunt");
    p.board = [u("scout"), src, u("elder")];
    runEffect(summon(), src, p, env);
    expect(keys(p.board)).toEqual(["scout", "grunt", "rider_form", "elder"]);
  });

  it("goes to the end of the board for a player-scope effect", () => {
    const { env, p } = setup();
    p.board = [u("scout")];
    runEffect(player({ actions: [{ type: "SUMMON", cardKey: "rider_form" }] }), null, p, env);
    expect(keys(p.board)).toEqual(["scout", "rider_form"]);
  });

  it("stops when the board is full (honouring the boardSize rule)", () => {
    const { env, p } = setup();
    const src = u("grunt");
    p.board = [src, u("scout")];
    p.rules.boardSize = 2;
    runEffect(summon(3), src, p, env);
    expect(p.board).toHaveLength(2);
    p.rules.boardSize = 4;
    runEffect(summon(5), src, p, env);
    expect(p.board).toHaveLength(4);
  });

  it("a golden source summons double", () => {
    const { env, p } = setup();
    const src = u("grunt", true);
    p.board = [src];
    runEffect(summon(), src, p, env);
    expect(p.board.filter((x) => x.key === "rider_form")).toHaveLength(2);
  });

  it("summoned units are never golden and fail loudly on a bad key", () => {
    const { env, p } = setup();
    p.board = [u("grunt")];
    runEffect(player({ actions: [{ type: "SUMMON", cardKey: "rider_form" }] }), null, p, env);
    expect(p.board[1]?.golden).toBe(false);
    expect(() => runEffect(player({ actions: [{ type: "SUMMON", cardKey: "ghost" }] }), null, p, env)).toThrow(/unknown card/);
  });
});

describe("GAIN_ENERGY", () => {
  const gain = (amount: number) => player({ actions: [{ type: "GAIN_ENERGY", amount }] });

  it("adds energy up to the player's max", () => {
    const { env, p } = setup();
    p.energy = 8;
    runEffect(gain(1), null, p, env);
    expect(p.energy).toBe(9);
    runEffect(gain(5), null, p, env);
    expect(p.energy).toBe(10);
    p.rules.maxEnergy = 12;
    runEffect(gain(5), null, p, env);
    expect(p.energy).toBe(12);
  });

  it("a negative amount drains energy but never below 0", () => {
    const { env, p } = setup();
    p.energy = 2;
    runEffect(gain(-1), null, p, env);
    expect(p.energy).toBe(1);
    runEffect(gain(-9), null, p, env);
    expect(p.energy).toBe(0);
  });
});

describe("ADD_TO_HAND", () => {
  it("adds a card and respects the hand limit without throwing", () => {
    const { env, p } = setup();
    const fx = player({ actions: [{ type: "ADD_TO_HAND", cardKey: "scout" }] });
    runEffect(fx, null, p, env);
    expect(keys(p.hand)).toEqual(["scout"]);

    p.rules.handSize = 1;
    expect(() => runEffect(fx, null, p, env)).not.toThrow();
    expect(p.hand).toHaveLength(1);
  });

  it("fails loudly on an unknown card", () => {
    const { env, p } = setup();
    expect(() => runEffect(player({ actions: [{ type: "ADD_TO_HAND", cardKey: "ghost" }] }), null, p, env)).toThrow(/unknown card/);
  });
});

describe("TRANSFORM (recruit)", () => {
  it("swaps the card, restarts the Henshin timer, keeps golden and bonuses", () => {
    const { env, p } = setup();
    const target: Unit = { key: "rookie", golden: true, bonusAtk: 2, turns: 3 };
    p.board = [target];
    runEffect(effect({ trigger: "ON_PLAY", actions: [{ type: "TRANSFORM", into: "scout" }] }), target, p, env);
    expect(target).toMatchObject({ key: "scout", golden: true, bonusAtk: 2, turns: 0 });
  });

  it("fails loudly on an unknown card", () => {
    const { env, p } = setup();
    const t = u("grunt");
    p.board = [t];
    expect(() => runEffect(effect({ trigger: "ON_PLAY", actions: [{ type: "TRANSFORM", into: "ghost" }] }), t, p, env)).toThrow(/unknown card/);
  });
});

describe("selectors (recruit)", () => {
  const buff = (target: object) => effect({ trigger: "ON_PLAY", target, actions: [{ type: "BUFF", atk: 1 }] });
  const atkOf = (units: Unit[]) => units.map((x) => x.bonusAtk ?? 0);

  it("RANDOM_FRIENDLY never picks the source, is seeded, and does nothing when alone", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { env, p } = setup(seed);
      const src = u("grunt");
      p.board = [src, u("scout"), u("elder")];
      runEffect(buff({ selector: "RANDOM_FRIENDLY" }), src, p, env);
      expect(src.bonusAtk).toBeUndefined();
      expect(atkOf(p.board).reduce((a, b) => a + b, 0)).toBe(1);
    }
    const { env, p } = setup();
    const only = u("grunt");
    p.board = [only];
    runEffect(buff({ selector: "RANDOM_FRIENDLY" }), only, p, env);
    expect(only.bonusAtk).toBeUndefined();
  });

  it("ALL_FRIENDLY filters by faction and series", () => {
    const { env, p } = setup();
    p.board = [u("grunt"), u("drone"), u("w_a")];
    runEffect(buff({ selector: "ALL_FRIENDLY", faction: "mecha" }), null, p, env);
    expect(atkOf(p.board)).toEqual([0, 1, 0]);
    runEffect(buff({ selector: "ALL_FRIENDLY", series: "w" }), null, p, env);
    expect(atkOf(p.board)).toEqual([0, 1, 1]);
  });

  it("LEFTMOST / RIGHTMOST / ADJACENT", () => {
    const { env, p } = setup();
    const mid = u("scout");
    p.board = [u("grunt"), mid, u("elder")];
    runEffect(buff({ selector: "LEFTMOST_FRIENDLY" }), mid, p, env);
    runEffect(buff({ selector: "RIGHTMOST_FRIENDLY" }), mid, p, env);
    expect(atkOf(p.board)).toEqual([1, 0, 1]);
    runEffect(buff({ selector: "ADJACENT" }), mid, p, env);
    expect(atkOf(p.board)).toEqual([2, 0, 2]);
  });

  it("enemy selectors and DAMAGE are combat-only", () => {
    const { env, p } = setup();
    p.board = [u("grunt")];
    expect(() => runEffect(buff({ selector: "ALL_ENEMY" }), null, p, env)).toThrow(/only valid during combat/);
    expect(() => runEffect(player({ actions: [{ type: "DAMAGE", amount: 1 }] }), null, p, env)).toThrow(/only valid during combat/);
  });

  it("a SELF effect whose unit left the board does nothing", () => {
    const { env, p } = setup();
    const gone = u("grunt");
    p.board = [];
    runEffect(buff({ selector: "SELF" }), gone, p, env);
    expect(gone.bonusAtk).toBeUndefined();
  });
});

describe("conditions (recruit)", () => {
  const gated = (condition: object) =>
    effect({ scope: "PLAYER", trigger: "ON_USE", condition, actions: [{ type: "GAIN_ENERGY", amount: 1 }] });
  const energyAfter = (condition: object, board: Unit[], energy = 0) => {
    const { env, p } = setup();
    p.board = board;
    p.energy = energy;
    runEffect(gated(condition), null, p, env);
    return p.energy;
  };

  it("SERIES_COUNT_GTE, FACTION_COUNT_GTE, ENERGY_GTE and TEAM_UP_COLORS_GTE", () => {
    expect(energyAfter({ type: "SERIES_COUNT_GTE", series: "w", value: 2 }, [u("w_a"), u("w_b")])).toBe(1);
    expect(energyAfter({ type: "SERIES_COUNT_GTE", series: "w", value: 2 }, [u("w_a"), u("grunt")])).toBe(0);
    expect(energyAfter({ type: "FACTION_COUNT_GTE", faction: "sentai", value: 2 }, [u("ranger_red"), u("ranger_blue")])).toBe(1);
    expect(energyAfter({ type: "FACTION_COUNT_GTE", faction: "sentai", value: 2 }, [u("ranger_red"), u("grunt")])).toBe(0);
    expect(energyAfter({ type: "ENERGY_GTE", value: 2 }, [], 2)).toBe(3);
    expect(energyAfter({ type: "ENERGY_GTE", value: 2 }, [], 1)).toBe(1);
    expect(energyAfter({ type: "TEAM_UP_COLORS_GTE", value: 2 }, [u("ranger_red"), u("ranger_blue")])).toBe(1);
    expect(energyAfter({ type: "TEAM_UP_COLORS_GTE", value: 2 }, [u("ranger_red"), u("ranger_red")])).toBe(0);
  });
});

describe("golden scaling (recruit)", () => {
  it("doubles BUFF by default and honours goldenMultiplier", () => {
    const { env, p } = setup();
    const t = u("grunt", true);
    p.board = [t];
    runEffect(effect({ trigger: "ON_PLAY", actions: [{ type: "BUFF", atk: 1, hp: 2 }] }), t, p, env);
    expect(t).toMatchObject({ bonusAtk: 2, bonusHp: 4 });
    runEffect(effect({ trigger: "ON_PLAY", goldenMultiplier: 3, actions: [{ type: "BUFF", atk: 1 }] }), t, p, env);
    expect(t.bonusAtk).toBe(5);
  });
});

describe("runTrigger", () => {
  it("runs only effects with the matching trigger and scope", () => {
    const { env, p } = setup();
    p.energy = 0;
    const effects = [
      player({ trigger: "ON_ACQUIRE", actions: [{ type: "GAIN_ENERGY", amount: 1 }] }),
      player({ trigger: "ON_TURN_START", actions: [{ type: "GAIN_ENERGY", amount: 10 }] }),
      effect({ trigger: "ON_ACQUIRE", actions: [{ type: "GAIN_ENERGY", amount: 100 }] }), // UNIT scope: skipped
    ];
    runTrigger(effects, "ON_ACQUIRE", "PLAYER", null, p, env);
    expect(p.energy).toBe(1);
  });
});

describe("DISCOVER_GIANT", () => {
  it("offers nothing when the content has no giants", () => {
    const world = content({ cards: [card("grunt")] });
    const env = makeEnv({ content: world, pool: new Pool([]), rng: new Rng(1) });
    const p = newPlayer();
    runEffect(player({ actions: [{ type: "DISCOVER_GIANT" }] }), null, p, env);
    expect(p.discovers).toEqual([]);
  });

  it("offers every giant when there are 3 or fewer", () => {
    const world = content({
      cards: [card("g1", { kind: "GIANT" }), card("g2", { kind: "GIANT" })],
    });
    const env = makeEnv({ content: world, pool: new Pool([]), rng: new Rng(1) });
    const p = newPlayer();
    runEffect(player({ actions: [{ type: "DISCOVER_GIANT" }] }), null, p, env);
    expect([...(p.discovers[0]?.options ?? [])].sort()).toEqual(["g1", "g2"]);
  });
});

describe("gauges", () => {
  const worldWith = (gauge: object) => {
    const world = content({
      cards: [card("prize", { kind: "GEAR", effects: [] })],
      gauges: [GaugeDef.parse(gauge)],
    });
    return makeEnv({ content: world, pool: new Pool([]), rng: new Rng(1) });
  };
  const once = { key: "g", name: "G", max: 5, thresholds: [{ at: 3, reward: [{ type: "ADD_TO_HAND", cardKey: "prize" }] }] };

  it("caps at max and never pays a one-shot threshold twice", () => {
    const env = worldWith(once);
    const p = newPlayer();
    addGauge(p, env, "g", 99);
    expect(p.gauges.g).toBe(5);
    expect(p.hand).toHaveLength(1);
    addGauge(p, env, "g", 1);
    expect(p.gauges.g).toBe(5);
    expect(p.hand).toHaveLength(1);
  });

  it("pays when the value is crossed, not before", () => {
    const env = worldWith(once);
    const p = newPlayer();
    addGauge(p, env, "g", 2);
    expect(p.hand).toHaveLength(0);
    addGauge(p, env, "g", 1);
    expect(p.hand).toHaveLength(1);
  });

  it("repeating thresholds pay each time they fill, carrying the remainder", () => {
    const env = worldWith({ key: "g", name: "G", max: 10, thresholds: [{ at: 3, once: false, reward: [{ type: "ADD_TO_HAND", cardKey: "prize" }] }] });
    const p = newPlayer();
    addGauge(p, env, "g", 7);
    expect(p.hand).toHaveLength(2);
    expect(p.gauges.g).toBe(1);
    addGauge(p, env, "g", 2);
    expect(p.hand).toHaveLength(3);
    expect(p.gauges.g).toBe(0);
  });

  it("fails loudly for an unknown gauge", () => {
    expect(() => addGauge(newPlayer(), worldWith(once), "nope", 1)).toThrow(/unknown gauge/);
  });

  it("fireGaugeTrigger only feeds gauges that list that trigger as a source", () => {
    const env = worldWith({
      key: "g", name: "G", max: 5,
      sources: [{ trigger: "ON_ROLL_CALL", amount: 2 }, { trigger: "HENSHIN", amount: 1 }],
    });
    const p = newPlayer();
    fireGaugeTrigger(p, env, "ON_ROLL_CALL");
    expect(p.gauges.g).toBe(2);
    fireGaugeTrigger(p, env, "ON_ROLL_CALL_WIN"); // not a source here
    expect(p.gauges.g).toBe(2);
    fireGaugeTrigger(p, env, "HENSHIN");
    expect(p.gauges.g).toBe(3);
  });

  it("GAUGE_ADD scales for golden units", () => {
    const env = worldWith({ key: "g", name: "G", max: 9 });
    const p = newPlayer();
    const src = u("prize", true);
    runEffect(effect({ trigger: "ON_PLAY", actions: [{ type: "GAUGE_ADD", gauge: "g", amount: 2 }] }), src, p, env);
    expect(p.gauges.g).toBe(4);
  });
});

describe("effects that create pooled cards draw from the shared pool", () => {
  const total = (env: ReturnType<typeof setup>["env"], key: string, p: PlayerState): number =>
    env.pool.count(key) + [...p.hand, ...p.board].filter((x) => x.key === key).reduce((n, x) => n + (x.golden ? 3 : 1), 0);

  it("ADD_TO_HAND takes a copy, and adds nothing once the pool is dry", () => {
    const { env, p } = setup();
    const start = env.pool.count("scout");
    const fx = player({ actions: [{ type: "ADD_TO_HAND", cardKey: "scout" }] });
    runEffect(fx, null, p, env);
    expect(env.pool.count("scout")).toBe(start - 1);
    expect(total(env, "scout", p)).toBe(start);

    env.pool.take("scout", env.pool.count("scout")); // drain it
    runEffect(fx, null, p, env);
    expect(p.hand).toHaveLength(1);
  });

  it("a full hand does not consume a pool copy", () => {
    const { env, p } = setup();
    p.rules.handSize = 0;
    const start = env.pool.count("scout");
    runEffect(player({ actions: [{ type: "ADD_TO_HAND", cardKey: "scout" }] }), null, p, env);
    expect(env.pool.count("scout")).toBe(start);
  });

  it("SUMMON of a pooled card takes a copy; a dry pool summons nothing", () => {
    const { env, p } = setup();
    const start = env.pool.count("grunt");
    const fx = player({ actions: [{ type: "SUMMON", cardKey: "grunt", count: 2 }] });
    runEffect(fx, null, p, env);
    expect(p.board).toHaveLength(2);
    expect(env.pool.count("grunt")).toBe(start - 2);

    env.pool.take("grunt", env.pool.count("grunt"));
    runEffect(fx, null, p, env);
    expect(p.board).toHaveLength(2);
  });

  it("selling a summoned pooled card puts the same copy back (no inflation)", () => {
    const { env, p } = setup();
    const start = env.pool.count("grunt");
    runEffect(player({ actions: [{ type: "SUMMON", cardKey: "grunt" }] }), null, p, env);
    expect(env.pool.count("grunt")).toBe(start - 1);
    sellUnit(p, "board", 0, env);
    expect(env.pool.count("grunt")).toBe(start);
  });

  describe("swapKey / TRANSFORM", () => {
    const fx = effect({ trigger: "ON_PLAY", actions: [{ type: "TRANSFORM", into: "elder" }] });

    it("moves the pool copy from the old card to the new one", () => {
      const { env, p } = setup();
      const t = u("grunt");
      p.board = [t];
      env.pool.take("grunt"); // the unit came out of the pool
      const [g, e] = [env.pool.count("grunt"), env.pool.count("elder")];
      runEffect(fx, t, p, env);
      expect(t.key).toBe("elder");
      expect(env.pool.count("grunt")).toBe(g + 1);
      expect(env.pool.count("elder")).toBe(e - 1);
    });

    it("a Final Form moves 3 copies", () => {
      const { env, p } = setup();
      const t = u("grunt", true);
      p.board = [t];
      env.pool.take("grunt", 3);
      const [g, e] = [env.pool.count("grunt"), env.pool.count("elder")];
      runEffect(fx, t, p, env);
      expect(env.pool.count("grunt")).toBe(g + 3);
      expect(env.pool.count("elder")).toBe(e - 3);
    });

    it("is refused, leaving everything untouched, when the pool cannot cover it", () => {
      const { env, p } = setup();
      const t = u("grunt", true);
      p.board = [t];
      env.pool.take("elder", env.pool.count("elder") - 2); // only 2 left, need 3
      const [g, e] = [env.pool.count("grunt"), env.pool.count("elder")];
      runEffect(fx, t, p, env);
      expect(t.key).toBe("grunt");
      expect(env.pool.count("grunt")).toBe(g);
      expect(env.pool.count("elder")).toBe(e);
    });

    it("into an unpooled card just returns the old copy", () => {
      const { env, p } = setup();
      const t = u("grunt");
      p.board = [t];
      env.pool.take("grunt");
      const g = env.pool.count("grunt");
      runEffect(effect({ trigger: "ON_PLAY", actions: [{ type: "TRANSFORM", into: "rider_form" }] }), t, p, env);
      expect(t.key).toBe("rider_form");
      expect(env.pool.count("grunt")).toBe(g + 1);
    });
  });
});

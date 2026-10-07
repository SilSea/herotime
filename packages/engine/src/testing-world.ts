import { card, content, effect } from "./testing.js";
import type { Content } from "./content.js";
import { makeEnv, type GameEnv } from "./game/env.js";
import { Rng } from "./rng/rng.js";
import { Pool } from "./shop/pool.js";
import { CardDef, GaugeDef, HeroDef, RelicDef, SeriesDef } from "@herotime/shared";

/** A small but realistic content set, mirroring the examples in docs/RULES.md. */
export function buildWorld(): Content {
  const cards: CardDef[] = [
    // plain pool cards
    card("grunt", { rank: 1, atk: 2, hp: 1, factions: ["grunt"] }),
    card("drone", { rank: 1, atk: 1, hp: 2, factions: ["mecha"], keywords: ["GATTAI"] }),
    card("scout", { rank: 2, atk: 2, hp: 2 }),
    card("elder", { rank: 3, atk: 3, hp: 3 }),
    // Henshin(2): rookie -> rider_form, then a gauge point
    card("rookie", {
      rank: 1, atk: 2, hp: 2, factions: ["rider"], series: "w",
      henshin: { afterTurns: 2, into: "rider_form" },
    }),
    card("rider_form", {
      rank: 2, atk: 4, hp: 4, factions: ["rider"], series: "w", keywords: ["RIDER_KICK"], token: true,
      effects: [effect({ trigger: "HENSHIN", actions: [{ type: "BUFF", atk: 1, hp: 1 }] })],
    }),
    // Cafe Owner: End of Turn, if energy is left, random friendly +1/+1
    card("cafe", {
      rank: 1, atk: 1, hp: 2, factions: ["ally"],
      effects: [
        effect({
          trigger: "END_OF_TURN",
          condition: { type: "ENERGY_GTE", value: 1 },
          target: { selector: "RANDOM_FRIENDLY" },
          actions: [{ type: "BUFF", atk: 1, hp: 1 }],
        }),
      ],
    }),
    // Deploy: give the unit to the right a Guard
    card("shield_bearer", {
      rank: 2, atk: 1, hp: 3,
      effects: [effect({ trigger: "ON_PLAY", target: { selector: "ADJACENT" }, actions: [{ type: "GIVE_KEYWORD", keyword: "GUARD" }] })],
    }),
    // Sentai colors
    ...(["RED", "BLUE", "YELLOW", "GREEN", "PINK"] as const).map((c) =>
      card(`ranger_${c.toLowerCase()}`, { rank: 2, atk: 2, hp: 2, factions: ["sentai"], colors: [c] }),
    ),
    card("ranger_extra", { rank: 4, atk: 3, hp: 3, factions: ["sentai"], colors: ["EXTRA"] }),
    // W units for series bonds
    card("w_a", { rank: 1, atk: 1, hp: 1, series: "w" }),
    card("w_b", { rank: 1, atk: 1, hp: 1, series: "w" }),
    card("w_c", { rank: 1, atk: 1, hp: 1, series: "w" }),
    // Gear + Giants (never pooled)
    card("kyodai_gattai", {
      rank: 1, atk: 0, hp: 1, kind: "GEAR", token: true,
      effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", actions: [{ type: "DISCOVER_GIANT" }] })],
    }),
    card("king_giant", { rank: 6, atk: 8, hp: 8, kind: "GIANT", series: "kyoryu", token: true, factions: ["mecha"] }),
    card("w_giant", { rank: 6, atk: 7, hp: 9, kind: "GIANT", series: "w", token: true }),
    card("plain_giant", { rank: 6, atk: 6, hp: 6, kind: "GIANT", token: true }),
    card("plain_giant_2", { rank: 6, atk: 5, hp: 7, kind: "GIANT", token: true }),
    card("plain_giant_3", { rank: 6, atk: 9, hp: 4, kind: "GIANT", token: true }),
    card("kyoryu_a", { rank: 1, atk: 1, hp: 1, series: "kyoryu" }),
  ];

  const series: SeriesDef[] = [
    SeriesDef.parse({
      key: "w", name: "Kamen Rider W",
      bonds: [
        { count: 2, effects: [effect({ scope: "PLAYER", trigger: "START_OF_COMBAT", target: { selector: "ALL_FRIENDLY", series: "w" }, actions: [{ type: "BUFF", atk: 1 }] })] },
        { count: 3, effects: [effect({ scope: "PLAYER", trigger: "START_OF_COMBAT", target: { selector: "ALL_FRIENDLY", series: "w" }, actions: [{ type: "BUFF", hp: 2 }] })] },
      ],
    }),
    SeriesDef.parse({ key: "kyoryu", name: "Kyoryuger" }),
  ];

  const gauges: GaugeDef[] = [
    GaugeDef.parse({
      key: "mecha", name: "Mecha Gauge", max: 6,
      sources: [{ trigger: "ON_ROLL_CALL", amount: 1 }, { trigger: "ON_ROLL_CALL_WIN", amount: 1 }],
      thresholds: [{ at: 3, reward: [{ type: "ADD_TO_HAND", cardKey: "kyodai_gattai" }] }],
    }),
    GaugeDef.parse({
      key: "rider", name: "Rider Gauge", max: 3,
      sources: [{ trigger: "HENSHIN", amount: 1 }],
      thresholds: [{ at: 2, once: false, reward: [{ type: "GAIN_ENERGY", amount: 2 }] }],
    }),
  ];

  const relics: RelicDef[] = [
    RelicDef.parse({
      key: "team_banner", name: "Team Spirit Banner", tier: "GREATER", cost: 4, factions: ["sentai"],
      effects: [effect({ scope: "PLAYER", trigger: "ON_ACQUIRE", actions: [{ type: "MODIFY_RULE", rule: "rollCallColors", op: "SET", value: 4 }] })],
    }),
    RelicDef.parse({
      key: "gauge_core", name: "Mecha Gauge Core", tier: "GREATER", cost: 3, factions: ["mecha"],
      effects: [
        effect({ scope: "PLAYER", trigger: "ON_ACQUIRE", actions: [{ type: "GAUGE_ADD", gauge: "mecha", amount: 2 }, { type: "MODIFY_RULE", rule: "giantEntryThreshold", op: "SET", value: 3 }] }),
      ],
    }),
    RelicDef.parse({ key: "free_charm", name: "Free Charm", tier: "GREATER", cost: 0 }),
    RelicDef.parse({
      key: "bracelet", name: "Training Bracelet", tier: "LESSER", cost: 3,
      effects: [effect({ scope: "PLAYER", trigger: "START_OF_COMBAT", target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })],
    }),
    RelicDef.parse({ key: "rider_pass", name: "Rider Pass", tier: "LESSER", cost: 0, series: "w" }),
    RelicDef.parse({
      key: "coupon", name: "Cafe Coupon", tier: "LESSER", cost: 1, factions: ["ally"],
      effects: [effect({ scope: "PLAYER", trigger: "ON_TURN_START", actions: [{ type: "GAIN_ENERGY", amount: 1 }] })],
    }),
    RelicDef.parse({ key: "plain_charm", name: "Plain Charm", tier: "LESSER", cost: 2 }),
  ];

  const heroes: HeroDef[] = [
    HeroDef.parse({
      key: "time_traveler", name: "Time Traveler",
      power: { mode: "PASSIVE", effects: [effect({ scope: "PLAYER", trigger: "ON_ACQUIRE", actions: [{ type: "MODIFY_RULE", rule: "freeRefreshesPerTurn", op: "SET", value: 1 }] })] },
    }),
    HeroDef.parse({
      key: "red_leader", name: "Red Leader",
      power: { mode: "ACTIVE", cost: 2, effects: [effect({ scope: "PLAYER", trigger: "ON_USE", target: { selector: "LEFTMOST_FRIENDLY" }, actions: [{ type: "BUFF", atk: 2, hp: 2 }] })] },
    }),
    HeroDef.parse({
      key: "prof_belt", name: "Professor Belt",
      power: { mode: "ONCE", cost: 0, effects: [effect({ scope: "PLAYER", trigger: "ON_USE", actions: [{ type: "ADD_TO_HAND", cardKey: "scout" }] })] },
    }),
    HeroDef.parse({ key: "blank", name: "Blank" }),
  ];

  return content({ cards, series, gauges, relics, heroes });
}

/** Pool of the shop-eligible cards (units that are not tokens). */
export function buildEnv(world: Content = buildWorld(), seed = 1): GameEnv {
  const poolCards = [...world.cards.values()]
    .filter((c) => c.kind === "UNIT" && !c.token)
    .map((c) => ({ key: c.key, rank: c.rank }));
  return makeEnv({ content: world, pool: new Pool(poolCards), rng: new Rng(seed) });
}

import { describe, expect, it } from "vitest";
import { simulateCombat } from "../combat/combat.js";
import { Rng } from "../rng/rng.js";
import { buy, newPlayer } from "../shop/economy.js";
import { Pool } from "../shop/pool.js";
import { card, content, effect, fighter } from "../testing.js";
import { runEffect } from "./effects.js";
import { makeEnv } from "./env.js";
import { playUnit, prepareCombat, sellUnit, useGear } from "./session.js";

const fx = (o: Record<string, unknown>) => effect({ scope: "PLAYER", trigger: "ON_TURN_START", ...o });
const world = content({
  factions: [{ key: "beast", name: "Beast", color: "#888", text: "", textTh: "" }],
  cards: [
    card("pup", { rank: 1, atk: 1, hp: 1, factions: ["beast"] }),
    card("bear", { rank: 1, atk: 4, hp: 5 }),
    card("rider", { rank: 1, atk: 2, hp: 2, ultimateInto: "rider_ultimate" }),
    card("rider_ultimate", { rank: 1, atk: 9, hp: 9, token: true }),
    card("robo", { kind: "GIANT", rank: 6, atk: 8, hp: 8, token: true, ultimateInto: "robo_mk2" }),
    card("robo_mk2", { kind: "GIANT", rank: 6, atk: 12, hp: 12, token: true }),
    card("upgrade_kit_shop", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "GIANT_SLOT" }, actions: [{ type: "ULTIMATE_FORM" }] })] }),
    card("upgrade_kit", { kind: "GEAR", rank: 1, cost: 1, token: true, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "GIANT_SLOT" }, actions: [{ type: "ULTIMATE_FORM" }] })] }),
    card("echo", { rank: 1, atk: 1, hp: 1, keywords: ["ECHO"] }),
    card("cheer", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_PLAY", target: { selector: "SELF" }, actions: [{ type: "BUFF", atk: 1, hp: 0 }] })] }),
    card("seller", { rank: 1, atk: 1, hp: 1, effects: [effect({ trigger: "ON_SELL", repeat: 2, actions: [{ type: "GAIN_ENERGY", amount: 1 }] })] }),
    card("blade", { kind: "GEAR", rank: 1, cost: 1, effects: [effect({ scope: "PLAYER", trigger: "ON_PLAY", actions: [{ type: "GAIN_ENERGY", amount: 1 }] })] }),
  ],
});
const env = () =>
  makeEnv({
    content: world,
    pool: new Pool(["pup", "bear", "rider", "echo", "cheer", "seller"].map((key) => ({ key, rank: 1 }))),
    rng: new Rng(4),
    gear: [{ key: "blade", rank: 1 }],
  });

describe("new mechanics", () => {
  it("RANDOM_CARD gives a random tavern gear (or a pool unit of a faction) into the hand", () => {
    const e = env();
    const p = newPlayer();
    runEffect(fx({ actions: [{ type: "RANDOM_CARD", cardKind: "GEAR" }] }), null, p, e);
    expect(p.hand.map((u) => u.key)).toEqual(["blade"]);
    runEffect(fx({ actions: [{ type: "RANDOM_CARD", cardKind: "UNIT", faction: "beast" }] }), null, p, e);
    expect(p.hand.map((u) => u.key)).toEqual(["blade", "pup"]);
  });

  it("ULTIMATE_FORM turns a unit into its own ultimate form, keeping its bonuses", () => {
    const e = env();
    const p = newPlayer();
    p.board = [{ key: "rider", golden: false, bonusAtk: 3 }, { key: "bear", golden: false }];
    runEffect(fx({ target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "ULTIMATE_FORM" }] }), null, p, e);
    expect(p.board.map((u) => u.key)).toEqual(["rider_ultimate", "bear"]);
    expect(p.board[0]?.bonusAtk).toBe(3);
  });

  it("a Gear can upgrade the Giant Robo in the Giant Slot, and is refused without one", () => {
    const e = env();
    const p = newPlayer();
    p.hand = [{ key: "upgrade_kit", golden: false }];
    expect(() => useGear(p, 0, e)).toThrow(/needs a Giant Robo/);
    p.giant = { key: "robo", golden: false };
    useGear(p, 0, e);
    expect(p.giant.key).toBe("robo_mk2");
  });

  it("BUFF_SHOP makes tavern units come with a bonus when bought", () => {
    const e = env();
    const p = newPlayer();
    p.energy = 10;
    p.shop = ["bear"];
    runEffect(fx({ actions: [{ type: "BUFF_SHOP", atk: 1, hp: 2 }] }), null, p, e);
    runEffect(fx({ actions: [{ type: "BUFF_SHOP", atk: 1, hp: 0 }] }), null, p, e);
    buy(p, 0);
    expect(p.hand[0]).toMatchObject({ key: "bear", bonusAtk: 2, bonusHp: 2 });
  });

  it("DEVOUR_SHOP eats a tavern unit and gives its stats to the target for good", () => {
    const e = env();
    const p = newPlayer();
    p.shop = ["bear"];
    p.board = [{ key: "pup", golden: false }];
    runEffect(fx({ target: { selector: "LEFTMOST_FRIENDLY" }, actions: [{ type: "DEVOUR_SHOP" }] }), null, p, e);
    expect(p.shop).toEqual([]);
    expect(p.board[0]).toMatchObject({ bonusAtk: 4, bonusHp: 5 });
  });

  it("SUMMON_FROM_HAND: in the tavern a unit card leaves the hand for the board; in a fight a copy joins", () => {
    const e = env();
    const p = newPlayer();
    p.hand = [{ key: "blade", golden: false }, { key: "bear", golden: false }];
    runEffect(fx({ actions: [{ type: "SUMMON_FROM_HAND", count: 1 }] }), null, p, e);
    expect(p.board.map((u) => u.key)).toEqual(["bear"]);
    expect(p.hand.map((u) => u.key)).toEqual(["blade"]);

    const caller = fighter("caller", 1, 20, { effects: [effect({ trigger: "START_OF_COMBAT", actions: [{ type: "SUMMON_FROM_HAND", count: 2 }] })] });
    const r = simulateCombat([caller], [fighter("foe", 0, 50)], 1, { content: world, a: { hand: ["bear"] } });
    expect(r.events.filter((ev) => ev.type === "SUMMON" && ev.cardKey === "bear")).toHaveLength(2);
  });

  it("the hand goes into the fight for SUMMON_FROM_HAND", () => {
    const e = env();
    const p = newPlayer();
    p.hand = [{ key: "bear", golden: false }, { key: "blade", golden: false }];
    expect(prepareCombat(p, e).extras.hand).toEqual(["bear"]);
  });

  it("repeat runs the whole effect several times", () => {
    const e = env();
    const p = newPlayer();
    runEffect(fx({ repeat: 3, actions: [{ type: "GAIN_ENERGY", amount: 1 }] }), null, p, e);
    expect(p.energy).toBe(3);
    const twice = fighter("t", 1, 20, { effects: [effect({ trigger: "START_OF_COMBAT", repeat: 2, target: { selector: "SELF" }, actions: [{ type: "BUFF", atk: 1, hp: 0 }] })] });
    expect(simulateCombat([twice], [fighter("foe", 0, 50)], 1).events.filter((ev) => ev.type === "BUFF")).toHaveLength(2);
  });

  it("ON_SELL runs as the unit is sold (here twice, with repeat)", () => {
    const e = env();
    const p = newPlayer();
    p.board = [{ key: "seller", golden: false }];
    sellUnit(p, "board", 0, e);
    expect(p.board).toEqual([]);
    expect(p.energy).toBe(1 + 2); // sell value + two Energy from the effect
  });

  it("ECHO: with it on the board, Deploy happens twice", () => {
    const e = env();
    const p = newPlayer();
    p.hand = [{ key: "cheer", golden: false }];
    playUnit(p, 0, 0, e);
    expect(p.board[0]?.bonusAtk).toBe(1);
    const q = newPlayer();
    q.board = [{ key: "echo", golden: false }];
    q.hand = [{ key: "cheer", golden: false }];
    playUnit(q, 0, 1, e);
    expect(q.board[1]?.bonusAtk).toBe(2);
  });
});

describe("gear that cannot be used", () => {
  it("can be sold back for the usual sell value; once it can be used it cannot", () => {
    const e = env();
    const p = newPlayer();
    p.energy = 0;
    p.hand = [{ key: "upgrade_kit", golden: false }, { key: "upgrade_kit", golden: false }];
    sellUnit(p, "hand", 0, e); // no Giant: nothing to upgrade
    expect(p.hand).toHaveLength(1);
    expect(p.energy).toBe(1);
    p.giant = { key: "robo", golden: false };
    expect(() => sellUnit(p, "hand", 0, e)).toThrow(/while it can be used/);
  });
});

describe("bots and gear they cannot use", () => {
  it("a bot does not buy a Giant gear without a Giant (gear cannot be sold, it would clog the hand)", async () => {
    const { runBot } = await import("../match/bot.js");
    const e = { ...env(), gear: [{ key: "upgrade_kit_shop", rank: 1 }] };
    const p = newPlayer();
    p.energy = 10;
    p.board = [{ key: "bear", golden: false }];
    p.shopGear = "upgrade_kit_shop";
    runBot(p, 3, e);
    expect(p.hand.some((u) => u.key === "upgrade_kit_shop")).toBe(false);
  });
});

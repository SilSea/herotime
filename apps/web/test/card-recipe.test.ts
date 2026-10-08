import { CardDef, Selector, Trigger, Action } from "@herotime/shared";
import { Content } from "@herotime/engine";
import { describe, expect, it } from "vitest";
import { buildCard, checkRecipe, choicesFor, describeRecipe, DO, keyFromName, newAbility, newRecipe, TARGET, WHEN, type Recipe } from "../src/card-recipe.js";

const recipe = (o: Partial<Recipe>): Recipe => ({ ...newRecipe(), name: "Test", key: "test", ...o });
const cub = CardDef.parse({ key: "cub", name: "Cub", rank: 1, atk: 1, hp: 1, token: true });
/** The engine's own validation: the card must be playable as built. */
const playable = (card: Record<string, unknown>): string[] => {
  try {
    new Content({ factions: [{ key: "beast", name: "Beast", color: "#888", text: "", textTh: "" }], cards: [cub, CardDef.parse(card)] } as never);
    return [];
  } catch (e) {
    return [(e as Error).message];
  }
};

describe("card wizard", () => {
  it("leaves out target filters the current target hides (left over from an earlier choice)", () => {
    const a = { ...newAbility("UNIT"), when: "START_OF_COMBAT", target: "SELF", targetFaction: "beast", targetCards: ["cub"] };
    const card = buildCard(recipe({ abilities: [a] }));
    expect((card.effects as { target: unknown }[])[0]?.target).toEqual({ selector: "SELF" });
    expect(describeRecipe(recipe({ abilities: [a] }), (k) => k, (k) => k)[0]).not.toContain("beast");
    const all = buildCard(recipe({ abilities: [{ ...a, target: "ALL_FRIENDLY" }] }));
    expect((all.effects as { target: unknown }[])[0]?.target).toEqual({ selector: "ALL_FRIENDLY", faction: "beast", cards: ["cub"] });
  });

  it("asks for the faction a faction-count condition counts (it would silently become 'always')", () => {
    const a = { ...newAbility("UNIT"), condition: "FACTION_COUNT_GTE", conditionFaction: "" };
    expect(checkRecipe(recipe({ abilities: [a] }), new Set()).join(" ")).toMatch(/faction|เผ่า/);
    expect(checkRecipe(recipe({ abilities: [{ ...a, conditionFaction: "beast" }] }), new Set())).toEqual([]);
  });

  it("names keywords in the preview line, not their ids", () => {
    const a = { ...newAbility("UNIT"), do: "GIVE_KEYWORD", keyword: "RIDER_KICK" };
    expect(describeRecipe(recipe({ abilities: [a] }), (k) => k, (k) => k)[0]).toContain("Rider Kick");
  });

  it("only offers real triggers, actions and targets", () => {
    for (const w of WHEN) expect(Trigger.options).toContain(w.key);
    for (const d of DO) expect(Action.options.map((o) => o.shape.type.value)).toContain(d.key);
    for (const t of TARGET) expect(Selector.options).toContain(t.key);
  });

  it("offers only what works at that moment", () => {
    const dies = { ...newAbility("UNIT"), when: "LAST_STAND" };
    const c = choicesFor(dies, "UNIT");
    expect(c.do.map((d) => d.key)).not.toContain("DISCARD"); // tavern-only
    expect(c.do.map((d) => d.key)).toContain("DAMAGE");
    expect(c.target.map((t) => t.key)).toContain("RANDOM_ENEMY");
    expect(c.target.map((t) => t.key)).not.toContain("SUMMONED");
    const played = choicesFor({ ...newAbility("UNIT"), when: "ON_PLAY" }, "UNIT");
    expect(played.do.map((d) => d.key)).not.toContain("DAMAGE");
    expect(played.target.map((t) => t.key)).not.toContain("RANDOM_ENEMY");
    const onSummon = choicesFor({ ...newAbility("UNIT"), when: "ALLY_SUMMONED" }, "UNIT");
    expect(onSummon.target.map((t) => t.key)).toContain("SUMMONED");
    expect(onSummon.do.map((d) => d.key)).not.toContain("DEVOUR_SHOP");
    expect(onSummon.do.map((d) => d.key)).not.toContain("DAMAGE");
    const gear = choicesFor(newAbility("GEAR"), "GEAR");
    expect(gear.when).toEqual([]);
    expect(gear.target.map((t) => t.key)).toContain("CHOSEN_FRIENDLY");
    expect(gear.target.map((t) => t.key)).not.toContain("SELF");
  });

  it("limits a target to named cards and checks for a named card", () => {
    const zeztz = CardDef.parse({ key: "zeztz", name: "Kamen Rider Zeztz", rank: 1, atk: 2, hp: 2 });
    const r = recipe({
      key: "fan",
      abilities: [{ ...newAbility("UNIT"), when: "ON_PLAY", condition: "HAS_CARD", conditionCards: ["zeztz"], do: "BUFF", atk: 2, hp: 2, target: "ALL_FRIENDLY", targetCards: ["zeztz", "cub"] }],
    });
    const card = buildCard(r);
    expect(card.effects).toEqual([
      { scope: "UNIT", trigger: "ON_PLAY", actions: [{ type: "BUFF", atk: 2, hp: 2, permanent: false }], target: { selector: "ALL_FRIENDLY", cards: ["zeztz", "cub"] }, condition: { type: "HAS_CARD", cards: ["zeztz"] } },
    ]);
    expect(() => new Content({ cards: [cub, zeztz, CardDef.parse(card)] } as never)).not.toThrow();
    const name = (k: string) => ({ zeztz: "Zeztz", cub: "Cub" })[k] ?? k;
    expect(describeRecipe(r, name, (k) => k)[0]).toContain("if you have Zeztz, give all your units (Zeztz or Cub) +2/+2");
    expect(checkRecipe({ ...r, abilities: [{ ...r.abilities[0]!, conditionCards: [] }] }, new Set())).toEqual([expect.stringMatching(/condition looks for/)]);
    // A target that is the unit itself takes no card filter.
    expect(buildCard(recipe({ abilities: [{ ...newAbility("UNIT"), targetCards: ["cub"] }] })).effects).toEqual([expect.objectContaining({ target: { selector: "SELF" } })]);
  });

  it("builds an own-stat buff and a consume-all", () => {
    const cap = recipe({ key: "cap", abilities: [{ ...newAbility("UNIT"), when: "ON_PLAY", do: "BUFF", atk: 0, hp: 0, fromSelf: true, target: "ALL_FRIENDLY" }] });
    expect(buildCard(cap).effects).toEqual([expect.objectContaining({ actions: [{ type: "BUFF", atk: 0, hp: 0, permanent: false, fromSelf: true }] })]);
    expect(checkRecipe(cap, new Set())).toEqual([]);
    expect(describeRecipe(cap, (k) => k, (k) => k)[0]).toContain("this card's ATK/HP");
    const eat = recipe({ key: "eat", abilities: [{ ...newAbility("UNIT"), when: "START_OF_COMBAT", do: "CONSUME_ALLIES", target: "SELF", permanent: true }] });
    expect(buildCard(eat).effects).toEqual([expect.objectContaining({ trigger: "START_OF_COMBAT", target: { selector: "SELF" }, actions: [{ type: "CONSUME_ALLIES", permanent: true }] })]);
    for (const c of [cap, eat]) expect(playable(buildCard(c))).toEqual([]);
    expect(choicesFor({ ...newAbility("UNIT"), when: "ON_PLAY" }, "UNIT").do.map((d) => d.key)).toContain("CONSUME_ALLIES");
  });

  it("builds copies", () => {
    const mirror = recipe({ key: "mirror", type: "GEAR", abilities: [{ ...newAbility("GEAR"), do: "COPY", copyTo: "HAND" }] });
    expect(buildCard(mirror).effects).toEqual([expect.objectContaining({ target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "COPY", to: "HAND", withBuffs: false }] })]);
    const spy = recipe({ key: "spy", abilities: [{ ...newAbility("UNIT"), when: "START_OF_COMBAT", do: "COPY", target: "LEFTMOST_ENEMY", copyBuffs: true }] });
    expect(buildCard(spy).effects).toEqual([expect.objectContaining({ actions: [{ type: "COPY", to: "BOARD", withBuffs: true }] })]);
    for (const c of [mirror, spy]) expect(playable(buildCard(c))).toEqual([]);
    expect(describeRecipe({ ...spy, abilities: [{ ...spy.abilities[0]!, copyTo: "HAND" }] }, (k) => k, (k) => k)[0]).toMatch(/next turn$/);
  });

  it("builds a Gear power-up", () => {
    const smith = recipe({ key: "smith", abilities: [{ ...newAbility("UNIT"), when: "ON_PLAY", do: "BUFF_GEAR", atk: 1, hp: 2 }] });
    expect(buildCard(smith).effects).toEqual([expect.objectContaining({ trigger: "ON_PLAY", actions: [{ type: "BUFF_GEAR", atk: 1, hp: 2 }] })]);
    expect(playable(buildCard(smith))).toEqual([]);
    expect(describeRecipe(smith, (k) => k, (k) => k)[0]).toContain("your Gear give +1/+2 more for the rest of the game");
    expect(checkRecipe({ ...smith, abilities: [{ ...smith.abilities[0]!, atk: 0, hp: 0 }] }, new Set())).toEqual([expect.stringMatching(/adds nothing/)]);
  });

  it("offers Energy and cards in fights (they arrive next turn) and Transform", () => {
    const attack = choicesFor({ ...newAbility("UNIT"), when: "ON_ATTACK" }, "UNIT").do.map((d) => d.key);
    for (const k of ["GAIN_ENERGY", "ADD_TO_HAND", "RANDOM_CARD", "DISCOVER_UNIT", "BUFF_SHOP", "TRANSFORM", "BUFF", "DAMAGE"]) expect(attack).toContain(k);
    expect(attack).not.toContain("DISCARD");
    const miner = recipe({ key: "miner", abilities: [{ ...newAbility("UNIT"), when: "ON_ATTACK", do: "GAIN_ENERGY", amount: 1 }] });
    expect(playable(buildCard(miner))).toEqual([]);
    expect(describeRecipe(miner, (k) => k, (k) => k)[0]).toMatch(/gain 1 Energy next turn$/);
    const morph = recipe({ key: "morph", abilities: [{ ...newAbility("UNIT"), when: "START_OF_COMBAT", do: "TRANSFORM", target: "SELF", cardKey: "cub" }] });
    expect(buildCard(morph).effects).toEqual([expect.objectContaining({ actions: [{ type: "TRANSFORM", into: "cub" }] })]);
    expect(playable(buildCard(morph))).toEqual([]);
    expect(checkRecipe({ ...morph, abilities: [{ ...morph.abilities[0]!, cardKey: "" }] }, new Set())).toEqual([expect.stringMatching(/pick the card/)]);
  });

  it("builds cards the engine accepts: a summoner, a pack leader and a gear", () => {
    const summoner = buildCard(recipe({ key: "den", factions: ["beast"], abilities: [{ ...newAbility("UNIT"), when: "LAST_STAND", do: "SUMMON", cardKey: "cub", count: 2 }] }));
    expect(summoner).toMatchObject({ kind: "UNIT", token: false, effects: [{ scope: "UNIT", trigger: "LAST_STAND", actions: [{ type: "SUMMON", cardKey: "cub", count: 2 }] }] });
    expect(playable(summoner)).toEqual([]);

    const leader = buildCard(recipe({ key: "pack", abilities: [{ ...newAbility("UNIT"), when: "ALLY_SUMMONED", do: "BUFF", atk: 1, hp: 1, target: "SUMMONED" }] }));
    expect(leader.effects).toEqual([{ scope: "UNIT", trigger: "ALLY_SUMMONED", actions: [{ type: "BUFF", atk: 1, hp: 1, permanent: false }], target: { selector: "SUMMONED" } }]);
    expect(playable(leader)).toEqual([]);

    const gear = buildCard(recipe({ key: "blade", type: "GEAR", cost: 3, costType: "HEALTH", abilities: [{ ...newAbility("GEAR"), do: "GIVE_KEYWORD", keyword: "LETHAL" }] }));
    expect(gear).toMatchObject({ kind: "GEAR", cost: 3, costType: "HEALTH", effects: [{ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" } }] });
    expect(playable(gear)).toEqual([]);

    const token = buildCard(recipe({ key: "tok", type: "TOKEN" }));
    expect(token).toMatchObject({ kind: "UNIT", token: true });
  });

  it("builds the newer mechanics: random gear, tavern buff, devour, summon from hand, sell twice, upgrade form", () => {
    const supply = buildCard(recipe({ key: "sup", abilities: [{ ...newAbility("UNIT"), when: "ON_PLAY", do: "RANDOM_CARD", cardKind: "GEAR" }] }));
    expect(supply.effects).toEqual([{ scope: "UNIT", trigger: "ON_PLAY", actions: [{ type: "RANDOM_CARD", cardKind: "GEAR" }] }]);
    const trader = buildCard(recipe({ key: "trd", abilities: [{ ...newAbility("UNIT"), when: "ON_SELL", do: "GAIN_ENERGY", amount: 1, repeat: 2 }] }));
    expect(trader.effects).toEqual([{ scope: "UNIT", trigger: "ON_SELL", actions: [{ type: "GAIN_ENERGY", amount: 1 }], repeat: 2 }]);
    const scout = buildCard(recipe({ key: "sct", abilities: [{ ...newAbility("UNIT"), when: "END_OF_TURN", do: "BUFF_SHOP", atk: 1, hp: 1 }] }));
    const eater = buildCard(recipe({ key: "eat", abilities: [{ ...newAbility("UNIT"), when: "ON_PLAY", do: "DEVOUR_SHOP", target: "SELF" }] }));
    const caller = buildCard(recipe({ key: "cal", abilities: [{ ...newAbility("UNIT"), when: "START_OF_COMBAT", do: "SUMMON_FROM_HAND", count: 2 }] }));
    const rider = buildCard(recipe({ key: "rid", ultimateInto: "cub" }));
    const upgrade = buildCard(recipe({ key: "upg", type: "GEAR", abilities: [{ ...newAbility("GEAR"), do: "ULTIMATE_FORM", target: "GIANT_SLOT" }] }));
    for (const c of [supply, trader, scout, eater, caller, rider, upgrade]) expect(playable(c), String(c.key)).toEqual([]);
    expect(choicesFor({ ...newAbility("UNIT"), when: "LAST_STAND" }, "UNIT").do.map((d) => d.key)).toContain("SUMMON_FROM_HAND");
    expect(choicesFor({ ...newAbility("UNIT"), when: "LAST_STAND" }, "UNIT").do.map((d) => d.key)).not.toContain("DEVOUR_SHOP");
  });

  it("says what is missing in words", () => {
    expect(checkRecipe(recipe({ name: "", key: "Bad Key" }), new Set())).toHaveLength(2);
    expect(checkRecipe(recipe({ key: "cub" }), new Set(["cub"])).join()).toMatch(/already|อยู่แล้ว/);
    expect(checkRecipe(recipe({ type: "GEAR" }), new Set()).join()).toMatch(/at least one ability|อย่างน้อย 1/);
    expect(checkRecipe(recipe({ abilities: [{ ...newAbility("UNIT"), do: "SUMMON", cardKey: "" }] }), new Set()).join()).toMatch(/pick the card|เลือกการ์ด/);
    expect(checkRecipe(recipe({ abilities: [{ ...newAbility("UNIT"), when: "LAST_STAND", do: "DISCARD" }] }), new Set()).join()).toMatch(/does not work|ใช้ในจังหวะนั้นไม่ได้/);
    expect(checkRecipe(recipe({ abilities: [{ ...newAbility("UNIT"), when: "ON_ATTACK", do: "SUMMON", cardKey: "cub" }] }), new Set())).toEqual([]);
  });

  it("reads as a sentence: target labels start lower case inside it", () => {
    const r = recipe({ type: "GEAR", abilities: [{ ...newAbility("GEAR"), do: "BUFF", atk: 2, hp: 2, target: "CHOSEN_FRIENDLY" }] });
    expect(describeRecipe(r, (k) => k, (k) => k)).toEqual(["Use: give a unit the player picks +2/+2"]);
  });

  it("makes a key from the name, unique among the cards", () => {
    expect(keyFromName("Pack Wolf", new Set())).toBe("pack_wolf");
    expect(keyFromName("Pack Wolf", new Set(["pack_wolf", "pack_wolf_2"]))).toBe("pack_wolf_3");
    expect(keyFromName("หมาป่า", new Set())).toBe("card");
  });
});

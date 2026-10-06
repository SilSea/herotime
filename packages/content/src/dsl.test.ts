import { describe, expect, it } from "vitest";
import * as d from "./dsl.js";
import { cardText, effectText, heroText, relicText } from "./text.js";
import { withGeneratedText } from "./types.js";

const names = (k: string): string => ({ tok: "Token", form: "Super Form", gear: "Gear" })[k] ?? k;

describe("DSL builders validate through the real schemas", () => {
  it("accept good input and fill defaults", () => {
    const u = d.unit("a", "A", { rank: 1, atk: 2, hp: 3 });
    expect(u).toMatchObject({ kind: "UNIT", factions: [], keywords: [], token: false, text: "" });
  });

  it("reject nonsense the moment it is written", () => {
    expect(() => d.unit("a", "A", { rank: 7, atk: 1, hp: 1 })).toThrow();
    expect(() => d.unit("a", "A", { rank: 1, atk: 1, hp: 0 })).toThrow();
    expect(() => d.on("START_OF_COMBAT", [])).toThrow();
    expect(() => d.hero("h", "H", { power: { mode: "ACTIVE", effects: [] } })).toThrow();
  });

  it("tokens, giants and gear are never shop units", () => {
    expect(d.token("t", "T", { atk: 1, hp: 1 })).toMatchObject({ token: true, kind: "UNIT" });
    expect(d.giant("g", "G", { atk: 5, hp: 5 })).toMatchObject({ token: true, kind: "GIANT", rank: 6 });
    expect(d.gear("x", "X", [d.player("ON_PLAY", d.discoverGiant())])).toMatchObject({ token: true, kind: "GEAR" });
  });

  it("effect options map onto the schema", () => {
    const e = d.on("AVENGE", d.buff(1, 1), { every: 3, golden: 4, target: d.adjacent, condition: d.teamUp(2) });
    expect(e).toMatchObject({ scope: "UNIT", trigger: "AVENGE", every: 3, goldenMultiplier: 4, target: { selector: "ADJACENT" }, condition: { value: 2 } });
    expect(d.player("ON_USE", d.energy(1))).toMatchObject({ scope: "PLAYER" });
  });

  it("henshin is wired through to the card", () => {
    expect(d.unit("a", "A", { rank: 1, atk: 1, hp: 1, henshin: { after: 2, into: "b" } }).henshin).toEqual({ afterTurns: 2, into: "b" });
  });
});

describe("rules text", () => {
  const t = (e: ReturnType<typeof d.on>) => effectText(e, names);

  it.each([
    [d.lastStand(d.summon("tok", 2)), "Last Stand: summon 2 Tokens."],
    [d.startOfCombat(d.buff(2, 2)), "Start of combat: give this +2/+2."],
    [d.startOfCombat(d.buff(1, 0, true), { target: d.allAllies({ faction: "rider" }) }), "give all rider allies +1/+0 permanently"],
    [d.henshinCall(d.energy(2)), "Henshin Call: gain 2 Energy."],
    [d.endOfTurn(d.buff(1, 1), { condition: d.energyAtLeast(1), target: d.randomAlly() }), "End of turn: If you have 1+ Energy, give another random ally +1/+1."],
    [d.onAttack(d.damage(3), { target: d.randomFoe }), "When this attacks: deal 3 damage to a random enemy."],
    [d.afterDamaged(d.give("GUARD")), "After this takes damage and survives: give this Guard."],
    [d.avenge(2, d.buff(3, 3)), "Avenge (2): give this +3/+3."],
    [d.onHenshin(d.transform("form")), "On Henshin: transform this into Super Form."],
    [d.startOfCombat(d.destroy(), { target: d.leftmostFoe }), "destroy the leftmost enemy"],
    [d.startOfCombat(d.buff(1, 1), { condition: d.teamUp(3) }), "If you have 3+ ranger colors"],
    [d.startOfCombat(d.buff(1, 1), { condition: d.factionCount("grunt", 2) }), "If you have 2+ grunt units"],
    [d.startOfCombat(d.buff(1, 1), { condition: d.seriesCount("s", 2) }), "If you have 2+ s units"],
    [d.henshinCall(d.toHand("tok")), "add Token to your hand"],
    [d.henshinCall(d.gauge("mecha", 2)), "add 2 to the mecha gauge"],
    [d.player("ON_ACQUIRE", d.rule("rollCallColors", "SET", 4)), "rule rollCallColors: set to 4"],
    [d.player("ON_ACQUIRE", d.rule("buyCost", "ADD", -1)), "change by -1"],
    [d.player("ON_ACQUIRE", d.rule("kyodaikaMultiplier", "MUL", 2)), "multiply by 2"],
    [d.player("ON_PLAY", d.discoverGiant()), "discover a Giant Robo"],
    [d.player("ON_TURN_START", d.summon("tok")), "At the start of each turn: summon Token."],
    [d.startOfCombat(d.buff(1, 1), { golden: 3 }), "(Golden: x3)"],
    [d.startOfCombat([d.buff(1, 1), d.give("RAPID")], { target: d.adjacent }), "give adjacent units +1/+1, then give adjacent units Rapid"],
    [d.startOfCombat(d.buff(1, 1), { target: d.rightmost({ series: "q" }) }), "the rightmost q ally"],
  ])("%#", (effect, expected) => {
    expect(t(effect)).toContain(expected);
  });

  it("a card lists keywords, then Henshin, then effects", () => {
    const c = d.unit("a", "A", { rank: 1, atk: 1, hp: 1, keywords: ["GUARD", "RAPID"], henshin: { after: 2, into: "form" }, effects: [d.lastStand(d.summon("tok"))] });
    expect(cardText(c, names)).toBe("Guard, Rapid Henshin (2): becomes Super Form. Last Stand: summon Token.");
  });

  it("a plain vanilla card has no text", () => {
    expect(cardText(d.unit("a", "A", { rank: 1, atk: 1, hp: 1 }), names)).toBe("");
  });

  it("relics and heroes read naturally", () => {
    expect(relicText(d.relic("r", "R", "LESSER", 0, [d.player("ON_ACQUIRE", d.energy(1))]), names)).toBe("When acquired: gain 1 Energy.");
    const active = d.hero("h", "H", { armor: 3, power: { mode: "ACTIVE", cost: 2, effects: [d.player("ON_USE", d.buff(2, 2), { target: d.leftmost() })] } });
    expect(heroText(active, names)).toBe("Hero Power (2 Energy, once per turn): Give the leftmost ally +2/+2. 3 armor.");
    expect(heroText(d.hero("h", "H", { power: { mode: "ONCE", effects: [d.player("ON_USE", d.energy(1))] } }), names)).toMatch(/once per game/);
    expect(heroText(d.hero("h", "H", { power: { mode: "PASSIVE", effects: [d.player("ON_ACQUIRE", d.energy(1))] } }), names)).toMatch(/^Passive: /);
    expect(heroText(d.hero("h", "H", { armor: 4 }), names)).toBe("4 armor.");
    expect(heroText(d.hero("h", "H"), names)).toBe("");
  });
});

describe("withGeneratedText", () => {
  const base = { factions: [], series: [], gauges: [], relics: [], heroes: [] };

  it("fills empty text but never overwrites what an author wrote", () => {
    const set = withGeneratedText({
      ...base,
      cards: [
        d.unit("a", "A", { rank: 1, atk: 1, hp: 1, keywords: ["GUARD"] }),
        d.unit("b", "B", { rank: 1, atk: 1, hp: 1, keywords: ["GUARD"], text: "My own words." }),
      ],
    });
    expect(set.cards[0]?.text).toBe("Guard");
    expect(set.cards[1]?.text).toBe("My own words.");
  });

  it("resolves card names through the whole set", () => {
    const set = withGeneratedText({
      ...base,
      cards: [d.token("tk", "Little Guy", { atk: 1, hp: 1 }), d.unit("a", "A", { rank: 1, atk: 1, hp: 1, effects: [d.lastStand(d.summon("tk"))] })],
    });
    expect(set.cards[1]?.text).toBe("Last Stand: summon Little Guy.");
  });
});

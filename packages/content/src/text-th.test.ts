import { describe, expect, it } from "vitest";
import { getContentSet, withGeneratedText } from "./index.js";

describe("Thai rules text", () => {
  const set = getContentSet("prototype");

  it("is generated for every card, relic and hero whose English text is generated", () => {
    for (const x of [...set.cards, ...set.relics, ...set.heroes]) {
      if (x.text) expect(x.textTh, x.key).not.toBe("");
    }
  });

  it("reads like the English text, in Thai", () => {
    const card = set.cards.find((c) => c.key === "bs1");
    expect(card?.textTh).toBe("Last Stand: เรียก Cub");
    const hero = set.heroes.find((h) => h.key === "captain_marvelous");
    expect(hero?.textTh).toMatch(/^Hero Power \(2 Energy, เทิร์นละครั้ง\): /);
  });

  it("every faction has a Thai description", () => {
    for (const f of set.factions) expect(f.textTh, f.key).not.toBe("");
  });
});

describe("rules text for named cards", () => {
  const blank = getContentSet("blank");
  const unit = (key: string, name: string, effects: unknown[] = []) => ({ key, name, rank: 1, atk: 1, hp: 1, kind: "UNIT", factions: [], colors: [], keywords: [], effects, token: false, text: "" });
  const set = withGeneratedText({
    ...blank,
    cards: [
      unit("agent7", "Agent Number 7"),
      unit("zeztz", "Kamen Rider Zeztz"),
      unit("caller", "Caller", [{ scope: "UNIT", trigger: "ON_PLAY", target: { selector: "ALL_FRIENDLY", cards: ["agent7", "zeztz"] }, actions: [{ type: "BUFF", atk: 2, hp: 2 }] }]),
      unit("fan", "Fan", [{ scope: "UNIT", trigger: "START_OF_COMBAT", condition: { type: "HAS_CARD", cards: ["zeztz"] }, target: { selector: "SELF" }, actions: [{ type: "BUFF", atk: 3, hp: 3 }] }]),
    ] as never,
  });
  const text = (key: string) => set.cards.find((c) => c.key === key);

  it("names the cards a target is limited to", () => {
    expect(text("caller")?.text).toBe("Deploy: give your Agent Number 7 or Kamen Rider Zeztz +2/+2.");
    expect(text("caller")?.textTh).toBe("Deploy: ให้ยูนิต Agent Number 7 หรือ Kamen Rider Zeztz ทุกตัว +2/+2");
  });

  it("names the cards a HAS_CARD condition looks for", () => {
    expect(text("fan")?.text).toBe("Start of combat: If you have Kamen Rider Zeztz, give this +3/+3.");
    expect(text("fan")?.textTh).toBe("เริ่มการต่อสู้: ถ้ามี Kamen Rider Zeztz ให้ตัวนี้ +3/+3");
  });
});

describe("rules text for fight rewards", () => {
  const blank = getContentSet("blank");
  const set = withGeneratedText({
    ...blank,
    cards: [{ key: "miner", name: "Miner", rank: 1, atk: 1, hp: 1, kind: "UNIT", factions: [], colors: [], keywords: [], token: false, text: "", effects: [{ scope: "UNIT", trigger: "ON_ATTACK", actions: [{ type: "GAIN_ENERGY", amount: 1 }] }] }] as never,
  });
  it("names own-stat buffs and consuming allies", () => {
    const unit = (key: string, effects: unknown[]) => ({ key, name: key, rank: 1, atk: 1, hp: 1, kind: "UNIT", factions: [], colors: [], keywords: [], token: false, text: "", effects });
    const g = withGeneratedText({
      ...blank,
      cards: [
        unit("cap", [{ scope: "UNIT", trigger: "ON_PLAY", target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 0, hp: 0, fromSelf: true }] }]),
        unit("eat", [{ scope: "UNIT", trigger: "START_OF_COMBAT", target: { selector: "SELF" }, actions: [{ type: "CONSUME_ALLIES", permanent: true }] }]),
      ] as never,
    });
    expect(g.cards[0]?.text).toBe("Deploy: give all allies this unit's ATK/HP.");
    expect(g.cards[0]?.textTh).toBe("Deploy: ให้พันธมิตรทุกตัว ได้ ATK/HP เท่าตัวนี้");
    expect(g.cards[1]?.text).toBe("Start of combat: destroy all your other units and give this their total ATK/HP permanently.");
    expect(g.cards[1]?.textTh).toBe("เริ่มการต่อสู้: ทำลายยูนิตอื่นของเราทั้งหมด แล้วให้ตัวนี้ได้ ATK/HP รวมของพวกมัน ถาวร");
  });

  it("names copies", () => {
    const g = withGeneratedText({
      ...blank,
      cards: [
        { key: "m", name: "Mirror", rank: 1, atk: 0, hp: 1, kind: "GEAR", cost: 1, factions: [], colors: [], keywords: [], token: false, text: "", effects: [{ scope: "PLAYER", trigger: "ON_PLAY", target: { selector: "CHOSEN_FRIENDLY" }, actions: [{ type: "COPY", to: "HAND", withBuffs: false }] }] },
        { key: "s", name: "Spy", rank: 1, atk: 1, hp: 1, kind: "UNIT", factions: [], colors: [], keywords: [], token: false, text: "", effects: [{ scope: "UNIT", trigger: "START_OF_COMBAT", target: { selector: "LEFTMOST_ENEMY" }, actions: [{ type: "COPY", to: "BOARD", withBuffs: true }] }] },
      ] as never,
    });
    expect(g.cards[0]?.text).toBe("Use: add a copy of a chosen ally to your hand.");
    expect(g.cards[0]?.textTh).toBe("ใช้: ได้สำเนาของพันธมิตรที่เลือกเข้ามือ");
    expect(g.cards[1]?.text).toBe("Start of combat: summon a copy of the leftmost enemy (bonuses included).");
    expect(g.cards[1]?.textTh).toBe("เริ่มการต่อสู้: เรียกสำเนาของศัตรูซ้ายสุด (รวมบัฟ)");
  });

  it("names a Gear power-up", () => {
    const g = withGeneratedText({ ...blank, cards: [{ key: "smith", name: "Smith", rank: 1, atk: 1, hp: 1, kind: "UNIT", factions: [], colors: [], keywords: [], token: false, text: "", effects: [{ scope: "UNIT", trigger: "ON_PLAY", actions: [{ type: "BUFF_GEAR", atk: 1, hp: 1 }] }] }] as never });
    expect(g.cards[0]?.text).toBe("Deploy: your Gear give +1/+1 more for the rest of the game.");
    expect(g.cards[0]?.textTh).toBe("Deploy: Gear ที่ให้ค่าพลังให้เพิ่มอีก +1/+1 จนจบเกม");
  });

  it("says the reward comes next turn", () => {
    expect(set.cards[0]?.text).toBe("When this attacks: gain 1 Energy next turn.");
    expect(set.cards[0]?.textTh).toMatch(/ในเทิร์นหน้า$/);
  });
});

describe("shipped rules", () => {
  it("Roll Call needs 3 different colours in every set", () => {
    for (const name of ["prototype", "production", "blank"] as const) expect(getContentSet(name).rules?.rollCallColors).toBe(3);
  });
});

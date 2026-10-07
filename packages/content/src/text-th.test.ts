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

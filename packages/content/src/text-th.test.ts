import { describe, expect, it } from "vitest";
import { getContentSet } from "./index.js";

describe("Thai rules text", () => {
  const set = getContentSet("prototype");

  it("is generated for every card, relic and hero whose English text is generated", () => {
    for (const x of [...set.cards, ...set.relics, ...set.heroes]) {
      if (x.text) expect(x.textTh, x.key).not.toBe("");
    }
  });

  it("reads like the English text, in Thai", () => {
    const card = set.cards.find((c) => c.key === "sn1");
    expect(card?.textTh).toBe("เริ่มการต่อสู้: ถ้ามี Sentai 2 สีขึ้นไป ให้ตัวนี้ +2/+2");
    const hero = set.heroes.find((h) => h.key === "red_leader");
    expect(hero?.textTh).toMatch(/^Hero Power \(2 Energy, เทิร์นละครั้ง\): /);
  });

  it("every faction has a Thai description", () => {
    for (const f of set.factions) expect(f.textTh, f.key).not.toBe("");
  });
});

describe("shipped rules", () => {
  it("Roll Call needs 3 different colours in both sets", () => {
    for (const name of ["prototype", "production"] as const) expect(getContentSet(name).rules?.rollCallColors).toBe(3);
  });
});

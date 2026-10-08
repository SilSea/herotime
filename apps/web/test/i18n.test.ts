import { afterEach, describe, expect, it } from "vitest";
import { describeCombat, gaugeText, keywordText, ordinal } from "../src/format.js";
import { lang, pick, setLang, tr } from "../src/i18n.js";

afterEach(() => setLang("en"));

describe("i18n", () => {
  it("switches every tr() pair at once", () => {
    setLang("en");
    expect(tr("Refresh", "รีเฟรช")).toBe("Refresh");
    setLang("th");
    expect(lang()).toBe("th");
    expect(tr("Refresh", "รีเฟรช")).toBe("รีเฟรช");
  });

  it("shows content text in Thai, falling back to English where there is none", () => {
    setLang("th");
    expect(pick({ text: "Give +1/+1", textTh: "ให้ +1/+1" })).toBe("ให้ +1/+1");
    expect(pick({ text: "Hand-written English", textTh: "" })).toBe("Hand-written English");
    setLang("en");
    expect(pick({ text: "Give +1/+1", textTh: "ให้ +1/+1" })).toBe("Give +1/+1");
  });

  it("keyword explanations exist in both languages", () => {
    setLang("en");
    expect(keywordText("GUARD")).toBe("Enemies must attack this unit before any other.");
    setLang("th");
    expect(keywordText("GUARD")).toBe("ศัตรูต้องโจมตียูนิตนี้ก่อนตัวอื่นเสมอ");
  });

  it("formats places, fights and gauges in Thai", () => {
    setLang("th");
    expect(ordinal(3)).toBe("ที่ 3");
    expect(describeCombat({ turn: 2, opponentName: "Bot 1", meSide: "A", damageTaken: 0, damageDealt: 5, result: { winner: "A" } } as never)).toBe("เทิร์น 2 vs Bot 1: ชนะ, ทำ 5 ดาเมจ");
    const t = gaugeText({ name: "Mecha Gauge", max: 6, sources: [{ trigger: "ON_ROLL_CALL", amount: 1 }], thresholds: [{ at: 3, once: true, reward: [{ type: "ADD_TO_HAND", cardKey: "kg" }] }] }, () => "Kyodai Gattai!", 3);
    expect(t.fills).toEqual(["+1 เมื่อเกิด Roll Call (มี Sentai 3 สีไม่ซ้ำตอนเริ่มการต่อสู้)"]);
    expect(t.rewards).toEqual(["ถึง 3: ได้ Kyodai Gattai! (ครั้งเดียวต่อเกม)"]);
    expect(t.short).toBe("ถึง 3 → Kyodai Gattai!");
  });
});

describe("server messages", async () => {
  const { serverText } = await import("../src/i18n.js");
  it("translates common refusals in Thai and leaves English alone", () => {
    setLang("th");
    expect(serverText("not enough energy: need 3, have 1")).toBe("Energy ไม่พอ: ต้องใช้ 3 มี 1");
    expect(serverText("choose a unit for Guard Shield")).toBe("เลือกยูนิตที่จะใช้ Guard Shield");
    expect(serverText("something new")).toBe("something new");
    expect(serverText("something went wrong on the server (ref 1a2b3c4d)")).toBe("เซิร์ฟเวอร์ขัดข้อง ลองใหม่อีกครั้ง (รหัส 1a2b3c4d)");
    setLang("en");
    expect(serverText("hand is full")).toBe("hand is full");
  });
});

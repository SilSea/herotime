import { describe, expect, it } from "vitest";
import { sentaiColorCount } from "./conditions.js";

describe("Sentai colour count (Team-Up, Roll Call)", () => {
  it("counts every real colour once, including black, white, purple, silver, gold and orange", () => {
    const team = ["RED", "BLUE", "YELLOW", "BLACK", "PURPLE", "WHITE", "SILVER"].map((c) => ({ colors: [c as never] }));
    expect(sentaiColorCount(team)).toBe(7);
    expect(sentaiColorCount([{ colors: ["BLACK"] }, { colors: ["BLACK"] }])).toBe(1);
  });
  it("an Extra fills one missing colour", () => {
    expect(sentaiColorCount([{ colors: ["GOLD"] }, { colors: ["EXTRA"] }, { colors: ["EXTRA"] }])).toBe(3);
  });
});

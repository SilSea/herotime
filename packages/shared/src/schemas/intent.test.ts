import { describe, expect, it } from "vitest";
import { IntentSchema, LoginSchema, RegisterSchema } from "../index.js";

describe("IntentSchema", () => {
  it("accepts every intent the engine understands", () => {
    const good = [
      { type: "CHOOSE_HERO", index: 1 },
      { type: "BUY", index: 0 },
      { type: "SELL", from: "board", index: 2 },
      { type: "PLAY", handIndex: 0, position: 3 },
      { type: "REORDER", from: 0, to: 4 },
      { type: "REFRESH" },
      { type: "FREEZE" },
      { type: "UPGRADE" },
      { type: "USE_GEAR", handIndex: 1 },
      { type: "HERO_POWER" },
      { type: "PICK_DISCOVER", index: 2 },
      { type: "CHOOSE_RELIC", index: 3 },
      { type: "READY" },
    ];
    for (const i of good) expect(IntentSchema.safeParse(i).success, JSON.stringify(i)).toBe(true);
  });

  it("rejects bad types, indexes and extra fields", () => {
    const bad: unknown[] = [
      null,
      "BUY",
      {},
      { type: "NOPE" },
      { type: "BUY" },
      { type: "BUY", index: -1 },
      { type: "BUY", index: 1.5 },
      { type: "BUY", index: "1" },
      { type: "BUY", index: 1000 },
      { type: "BUY", index: 0, gold: 99 }, // unknown field
      { type: "SELL", from: "shop", index: 0 },
      { type: "READY", force: true },
      { type: "PLAY", handIndex: 0 },
    ];
    for (const i of bad) expect(IntentSchema.safeParse(i).success, JSON.stringify(i)).toBe(false);
  });
});

describe("auth schemas", () => {
  const ok = { username: "rider_01", email: "a@b.co", password: "longenough" };

  it("accepts a valid registration", () => {
    expect(RegisterSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects short or odd usernames, bad email, weak/huge passwords, extra fields", () => {
    expect(RegisterSchema.safeParse({ ...ok, username: "ab" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...ok, username: "has space" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...ok, username: "x".repeat(21) }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...ok, password: "x".repeat(101) }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...ok, role: "ADMIN" }).success).toBe(false); // no self-granted roles
  });

  it("login needs a username and some password", () => {
    expect(LoginSchema.safeParse({ username: "rider_01", password: "x" }).success).toBe(true);
    expect(LoginSchema.safeParse({ username: "rider_01", password: "" }).success).toBe(false);
  });
});

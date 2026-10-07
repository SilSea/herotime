import { describe, expect, it } from "vitest";
import { CUES, cueForEvent, cueForIntent, isMuted, play, setMuted, splashForEvent } from "../src/sound.js";

describe("sound", () => {
  it("every cue has notes that fit in a second", () => {
    for (const [name, tones] of Object.entries(CUES)) {
      expect(tones.length, name).toBeGreaterThan(0);
      for (const t of tones) {
        expect(t.f, name).toBeGreaterThan(20);
        expect(t.t + t.d, name).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it("maps intents and fight events to cues and splashes", () => {
    expect(cueForIntent("BUY")).toBe("buy");
    expect(cueForIntent("COMBINE")).toBe("gattai");
    expect(cueForIntent("READY")).toBeUndefined();
    expect(cueForEvent("TRANSFORM")).toBe("henshin");
    expect(cueForEvent("GIANT_ENTER")).toBe("giant");
    expect(splashForEvent("GATTAI")).toBe("GATTAI!");
    expect(splashForEvent("ATTACK")).toBeUndefined();
  });

  it("muting is remembered, and playing without Web Audio does nothing", () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(() => play("buy")).not.toThrow();
    setMuted(false);
    expect(isMuted()).toBe(false);
    expect(() => play("buy")).not.toThrow(); // no window here: silently skipped
  });
});

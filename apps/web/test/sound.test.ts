import { MUSIC_SLOTS as SHARED_MUSIC, SOUND_SLOTS as SHARED_SLOTS } from "@herotime/shared";
import { describe, expect, it } from "vitest";
import { CUES, MUSIC_SLOTS, SOUND_SLOTS, cardSound, hasUploaded, isMuted, play, playMusic, setContentSounds, setMuted, setVolumes, slotForEvent, slotForIntent, slotForPlace, splashForEvent, volumes } from "../src/sound.js";

describe("sound", () => {
  it("the slot lists match the schema", () => {
    expect([...SOUND_SLOTS]).toEqual([...SHARED_SLOTS]);
    expect([...MUSIC_SLOTS]).toEqual([...SHARED_MUSIC]);
  });

  it("every built-in tone belongs to a real slot and fits in a second and a half", () => {
    for (const [name, tones] of Object.entries(CUES)) {
      expect(SOUND_SLOTS as readonly string[], name).toContain(name);
      for (const t of tones) {
        expect(t.f, name).toBeGreaterThan(20);
        expect(t.t + t.d, name).toBeLessThanOrEqual(1.5);
      }
    }
    expect(MUSIC_SLOTS).toContain("battle");
  });

  it("maps intents, fight events and places to slots that exist", () => {
    const slots = SOUND_SLOTS as readonly string[];
    for (const intent of ["BUY", "BUY_GEAR", "SELL", "REFRESH", "FREEZE", "PLAY", "USE_GEAR", "UPGRADE", "COMBINE", "HERO_POWER", "PICK_DISCOVER", "CHOOSE_RELIC"]) expect(slots).toContain(slotForIntent(intent));
    for (const ev of ["ATTACK", "BARRIER_POP", "DEATH", "TRANSFORM", "KYODAIKA", "GATTAI", "GIANT_ENTER", "ROLL_CALL", "SUMMON"]) expect(slots).toContain(slotForEvent(ev));
    expect(slotForIntent("READY")).toBeUndefined();
    expect([slotForPlace(1), slotForPlace(3), slotForPlace(7), slotForPlace(undefined)]).toEqual(["endWin", "endTop4", "endOther", "endOther"]);
    expect(splashForEvent("GATTAI")).toBe("GATTAI!");
  });

  it("a card's own sound wins over its faction's", () => {
    const factions: Record<string, { sounds?: { play?: string } }> = { beast: { sounds: { play: "roar.mp3" } } };
    const of = (k: string) => factions[k];
    expect(cardSound({ factions: ["beast"], sounds: { play: "howl.mp3" } }, of, "play")).toBe("howl.mp3");
    expect(cardSound({ factions: ["beast"] }, of, "play")).toBe("roar.mp3");
    expect(cardSound({ factions: ["beast"] }, of, "death")).toBeUndefined();
    expect(cardSound(undefined, of, "play")).toBeUndefined();
  });

  it("knows which slots have an uploaded file; mute and volumes are kept in range", () => {
    setContentSounds({ slots: { click: { file: "a1b2c3d4e5f60718.mp3" } } });
    expect(hasUploaded("click")).toBe(true);
    expect(hasUploaded("buy")).toBe(false);
    setVolumes({ sfx: 2, music: -1 });
    expect(volumes()).toEqual({ sfx: 1, music: 0 });
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    // no Audio / Web Audio here: everything is a quiet no-op
    expect(() => play("buy")).not.toThrow();
    expect(() => playMusic("battle")).not.toThrow();
  });
});

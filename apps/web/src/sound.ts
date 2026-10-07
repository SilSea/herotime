/**
 * Game sounds. Every moment (a "slot": buy, sell, a unit attacking...) plays the file uploaded for it in the
 * Admin when there is one, else a short built-in tone made with the Web Audio API. Cards and factions can
 * have their own sounds, which win over the slot. Background music follows where the player is.
 * Volumes (effects / music) and mute are remembered on the device. Browsers only allow audio after the
 * player has clicked something, so nothing plays before that.
 */
import { resolveArt } from "./content-index.js";

/** Copies of SOUND_SLOTS / MUSIC_SLOTS in @herotime/shared (the browser cannot import packages; a test keeps them equal). */
export const SOUND_SLOTS = [
  "buy", "buyGear", "sell", "refresh", "freeze", "upgrade", "denied",
  "play", "gear", "triple", "combine", "transform", "discover", "relic", "heroPower", "discard",
  "attack", "hit", "barrier", "death", "summon", "kyodaika", "giant", "rollcall",
  "roundWin", "roundLose", "eliminated", "endWin", "endTop4", "endOther",
  "turnStart", "timeLow", "click",
] as const;
export const MUSIC_SLOTS = ["lobby", "recruit", "battle", "endWin", "endLose"] as const;

type Tone = { f: number; t: number; d: number; type?: OscillatorType; v?: number; slide?: number };

/** Built-in tones, by slot. Slots without one stay silent until a file is uploaded for them. */
export const CUES: Record<string, Tone[]> = {
  buy: [{ f: 660, t: 0, d: 0.07, type: "triangle" }, { f: 990, t: 0.06, d: 0.09, type: "triangle" }],
  buyGear: [{ f: 740, t: 0, d: 0.07, type: "triangle" }, { f: 1110, t: 0.06, d: 0.09, type: "triangle" }],
  sell: [{ f: 520, t: 0, d: 0.08, type: "triangle" }, { f: 330, t: 0.07, d: 0.12, type: "triangle" }],
  refresh: [{ f: 300, t: 0, d: 0.18, type: "sawtooth", v: 0.05, slide: 900 }],
  freeze: [{ f: 1400, t: 0, d: 0.25, type: "sine", v: 0.05, slide: 700 }],
  play: [{ f: 440, t: 0, d: 0.06, type: "square", v: 0.05 }, { f: 660, t: 0.05, d: 0.1, type: "square", v: 0.05 }],
  gear: [{ f: 880, t: 0, d: 0.05, type: "triangle" }, { f: 1320, t: 0.05, d: 0.05, type: "triangle" }, { f: 1760, t: 0.1, d: 0.12, type: "triangle" }],
  heroPower: [{ f: 880, t: 0, d: 0.05, type: "triangle" }, { f: 1320, t: 0.05, d: 0.05, type: "triangle" }, { f: 1760, t: 0.1, d: 0.12, type: "triangle" }],
  upgrade: [{ f: 523, t: 0, d: 0.1 }, { f: 659, t: 0.09, d: 0.1 }, { f: 784, t: 0.18, d: 0.1 }, { f: 1047, t: 0.27, d: 0.22 }],
  relic: [{ f: 523, t: 0, d: 0.1 }, { f: 659, t: 0.09, d: 0.1 }, { f: 784, t: 0.18, d: 0.1 }, { f: 1047, t: 0.27, d: 0.22 }],
  triple: [{ f: 784, t: 0, d: 0.1 }, { f: 988, t: 0.1, d: 0.1 }, { f: 1175, t: 0.2, d: 0.1 }, { f: 1568, t: 0.3, d: 0.3 }],
  discover: [{ f: 440, t: 0, d: 0.06, type: "square", v: 0.05 }, { f: 660, t: 0.05, d: 0.1, type: "square", v: 0.05 }],
  discard: [{ f: 400, t: 0, d: 0.15, type: "sawtooth", v: 0.04, slide: 120 }],
  denied: [{ f: 180, t: 0, d: 0.15, type: "square", v: 0.05 }],
  attack: [{ f: 220, t: 0, d: 0.08, type: "sawtooth", v: 0.06, slide: 110 }],
  hit: [{ f: 140, t: 0, d: 0.1, type: "square", v: 0.06, slide: 70 }],
  barrier: [{ f: 1200, t: 0, d: 0.12, type: "triangle", v: 0.05, slide: 600 }],
  death: [{ f: 300, t: 0, d: 0.35, type: "sawtooth", v: 0.06, slide: 60 }],
  summon: [{ f: 440, t: 0, d: 0.06, type: "square", v: 0.05 }, { f: 660, t: 0.05, d: 0.1, type: "square", v: 0.05 }],
  transform: [{ f: 392, t: 0, d: 0.1, type: "square", v: 0.05 }, { f: 587, t: 0.1, d: 0.1, type: "square", v: 0.05 }, { f: 784, t: 0.2, d: 0.35, type: "sawtooth", v: 0.05, slide: 1568 }],
  combine: [{ f: 110, t: 0, d: 0.3, type: "sawtooth", v: 0.07 }, { f: 165, t: 0.25, d: 0.3, type: "sawtooth", v: 0.07 }, { f: 220, t: 0.5, d: 0.5, type: "square", v: 0.06 }],
  kyodaika: [{ f: 82, t: 0, d: 0.6, type: "sawtooth", v: 0.08 }, { f: 123, t: 0.3, d: 0.6, type: "square", v: 0.06 }],
  giant: [{ f: 82, t: 0, d: 0.6, type: "sawtooth", v: 0.08 }, { f: 123, t: 0.3, d: 0.6, type: "square", v: 0.06 }, { f: 165, t: 0.6, d: 0.7, type: "square", v: 0.06 }],
  rollcall: [{ f: 523, t: 0, d: 0.08 }, { f: 587, t: 0.08, d: 0.08 }, { f: 659, t: 0.16, d: 0.08 }, { f: 698, t: 0.24, d: 0.08 }, { f: 784, t: 0.32, d: 0.3 }],
  roundWin: [{ f: 523, t: 0, d: 0.12 }, { f: 659, t: 0.12, d: 0.12 }, { f: 784, t: 0.24, d: 0.4 }],
  roundLose: [{ f: 392, t: 0, d: 0.18 }, { f: 330, t: 0.18, d: 0.18 }, { f: 262, t: 0.36, d: 0.45 }],
  eliminated: [{ f: 330, t: 0, d: 0.25 }, { f: 262, t: 0.25, d: 0.25 }, { f: 196, t: 0.5, d: 0.6 }],
  endWin: [{ f: 523, t: 0, d: 0.15 }, { f: 659, t: 0.15, d: 0.15 }, { f: 784, t: 0.3, d: 0.15 }, { f: 1047, t: 0.45, d: 0.5 }],
  endTop4: [{ f: 523, t: 0, d: 0.12 }, { f: 659, t: 0.12, d: 0.12 }, { f: 784, t: 0.24, d: 0.4 }],
  endOther: [{ f: 392, t: 0, d: 0.18 }, { f: 330, t: 0.18, d: 0.18 }, { f: 262, t: 0.36, d: 0.45 }],
  turnStart: [{ f: 660, t: 0, d: 0.08, type: "triangle", v: 0.04 }, { f: 880, t: 0.08, d: 0.12, type: "triangle", v: 0.04 }],
  timeLow: [{ f: 990, t: 0, d: 0.06, type: "square", v: 0.03 }],
};

// ------------------------------------------------------------------ settings

const KEYS = { muted: "herotime.muted", sfx: "herotime.sfxVolume", music: "herotime.musicVolume" };
const stored = (key: string, fallback: number): number => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : Math.max(0, Math.min(1, Number(v)));
  } catch {
    return fallback;
  }
};
const store = (key: string, v: number | string): void => {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    // remembered for this visit only
  }
};

let muted = stored(KEYS.muted, 0) === 1;
let sfxVolume = stored(KEYS.sfx, 0.8);
let musicVolume = stored(KEYS.music, 0.5);

export const isMuted = (): boolean => muted;
export const volumes = (): { sfx: number; music: number } => ({ sfx: sfxVolume, music: musicVolume });

export function setMuted(on: boolean): void {
  muted = on;
  store(KEYS.muted, on ? 1 : 0);
  applyMusicVolume();
}

export function setVolumes(v: { sfx?: number; music?: number }): void {
  if (v.sfx !== undefined) store(KEYS.sfx, (sfxVolume = Math.max(0, Math.min(1, v.sfx))));
  if (v.music !== undefined) store(KEYS.music, (musicVolume = Math.max(0, Math.min(1, v.music))));
  applyMusicVolume();
}

// ------------------------------------------------------------------ uploaded sounds

type Ref = { file: string; volume?: number };
let slots: Record<string, Ref> = {};
let music: Record<string, Ref> = {};

/** The uploaded sounds of the content being played (call whenever the content changes). */
export function setContentSounds(sounds: { slots?: Record<string, Ref>; music?: Record<string, Ref> } | undefined): void {
  slots = { ...(sounds?.slots ?? {}) };
  music = { ...(sounds?.music ?? {}) };
}

export const hasUploaded = (slot: string): boolean => !!slots[slot]?.file;

const cache = new Map<string, HTMLAudioElement>();
function playFile(file: string, volume: number): boolean {
  if (typeof Audio === "undefined") return false;
  const url = resolveArt(file);
  if (!url) return false;
  try {
    let base = cache.get(url);
    if (!base) {
      base = new Audio(url);
      base.preload = "auto";
      cache.set(url, base);
    }
    // A fresh copy so the same sound can overlap itself (two units dying at once).
    const a = base.cloneNode(true) as HTMLAudioElement;
    a.volume = Math.max(0, Math.min(1, volume * sfxVolume));
    void a.play().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

let ctx: AudioContext | undefined;
function playTone(slot: string): void {
  const tones = CUES[slot];
  if (!tones || typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  try {
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.f, now + tone.t);
      if (tone.slide) osc.frequency.exponentialRampToValueAtTime(tone.slide, now + tone.t + tone.d);
      const v = Math.max(0.0002, (tone.v ?? 0.08) * sfxVolume);
      gain.gain.setValueAtTime(0.0001, now + tone.t);
      gain.gain.exponentialRampToValueAtTime(v, now + tone.t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.t + tone.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + tone.t);
      osc.stop(now + tone.t + tone.d + 0.02);
    }
  } catch {
    // audio is a nicety: never let it break the game
  }
}

/**
 * Play a moment: `own` (a card's or faction's file) first, then the file uploaded for the slot, then the
 * built-in tone. Silent when muted or the effects volume is 0.
 */
export function play(slot: string, own?: string): void {
  if (muted || sfxVolume <= 0) return;
  if (own && playFile(own, 1)) return;
  const ref = slots[slot];
  if (ref?.file && playFile(ref.file, ref.volume ?? 1)) return;
  playTone(slot);
}

/** Play an uploaded file right away (the Admin's preview button), at its own volume. */
export function preview(file: string, volume = 1): void {
  if (typeof Audio === "undefined") return;
  const url = resolveArt(file);
  if (!url) return;
  const a = new Audio(url);
  a.volume = Math.max(0, Math.min(1, volume));
  void a.play().catch(() => undefined);
}

// ------------------------------------------------------------------ card and faction sounds

type CardLike = { factions: readonly string[]; sounds?: Partial<Record<CardSoundKind, string>> };
type FactionLike = { sounds?: Partial<Record<CardSoundKind, string>> };
export type CardSoundKind = "play" | "attack" | "death" | "transform";

/** A card's own sound for `kind`, else its first faction's that has one. */
export function cardSound(card: CardLike | undefined, factionOf: (key: string) => FactionLike | undefined, kind: CardSoundKind): string | undefined {
  if (!card) return undefined;
  const own = card.sounds?.[kind];
  if (own) return own;
  for (const f of card.factions) {
    const s = factionOf(f)?.sounds?.[kind];
    if (s) return s;
  }
  return undefined;
}

// ------------------------------------------------------------------ music

let current: { slot: string; el: HTMLAudioElement; volume: number } | undefined;

function applyMusicVolume(): void {
  if (current) current.el.volume = muted ? 0 : Math.max(0, Math.min(1, current.volume * musicVolume));
}

/** Loop the music uploaded for `slot` (undefined, or a slot with no file, stops the music). */
export function playMusic(slot: string | undefined): void {
  if (typeof Audio === "undefined") return;
  const ref = slot ? music[slot] : undefined;
  if (current && current.slot === slot && ref && current.el.src.endsWith(resolveArt(ref.file) ?? "")) return;
  current?.el.pause();
  current = undefined;
  if (!slot || !ref?.file) return;
  const url = resolveArt(ref.file);
  if (!url) return;
  const el = new Audio(url);
  el.loop = true;
  current = { slot, el, volume: ref.volume ?? 1 };
  applyMusicVolume();
  // Blocked until the first click; try again then.
  void el.play().catch(() => {
    const retry = (): void => {
      if (current?.el === el) void el.play().catch(() => undefined);
    };
    document.addEventListener("pointerdown", retry, { once: true });
  });
}

// ------------------------------------------------------------------ what plays when

/** The slot for a game intent the server accepted. */
export function slotForIntent(type: string): string | undefined {
  return (
    { BUY: "buy", BUY_GEAR: "buyGear", SELL: "sell", REFRESH: "refresh", FREEZE: "freeze", PLAY: "play", USE_GEAR: "gear", UPGRADE: "upgrade", COMBINE: "combine", HERO_POWER: "heroPower", PICK_DISCOVER: "discover", CHOOSE_RELIC: "relic" } as Record<string, string>
  )[type];
}

/** The slot for a fight event in the replay. */
export function slotForEvent(type: string): string | undefined {
  return ({ ATTACK: "attack", BARRIER_POP: "barrier", DEATH: "death", TRANSFORM: "transform", KYODAIKA: "kyodaika", GATTAI: "combine", GIANT_ENTER: "giant", ROLL_CALL: "rollcall", SUMMON: "summon" } as Record<string, string>)[type];
}

/** The ending fanfare for a finishing place. */
export const slotForPlace = (place: number | undefined): string => (place === 1 ? "endWin" : place !== undefined && place <= 4 ? "endTop4" : "endOther");

/** Big words splashed over the fight for the show-stopping moments. */
export function splashForEvent(type: string): string | undefined {
  return ({ TRANSFORM: "HENSHIN!", GATTAI: "GATTAI!", GIANT_ENTER: "KYODAI GATTAI!", KYODAIKA: "KYODAIKA!", ROLL_CALL: "ROLL CALL!" } as Record<string, string>)[type];
}

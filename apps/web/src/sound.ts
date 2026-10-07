/**
 * Game sounds, synthesised with the Web Audio API (no sound files to ship). Each cue is a few short tones;
 * muting is remembered on the device. Browsers only allow audio after the player has clicked something,
 * so the context is created lazily on the first cue.
 */
export type Cue =
  | "buy"
  | "sell"
  | "refresh"
  | "play"
  | "gear"
  | "upgrade"
  | "error"
  | "attack"
  | "hit"
  | "death"
  | "henshin"
  | "gattai"
  | "giant"
  | "rollcall"
  | "win"
  | "lose";

type Tone = { f: number; t: number; d: number; type?: OscillatorType; v?: number; slide?: number };

/** The notes of each cue: frequency (Hz), start and length (s), wave, volume and an optional pitch slide. */
export const CUES: Record<Cue, Tone[]> = {
  buy: [{ f: 660, t: 0, d: 0.07, type: "triangle" }, { f: 990, t: 0.06, d: 0.09, type: "triangle" }],
  sell: [{ f: 520, t: 0, d: 0.08, type: "triangle" }, { f: 330, t: 0.07, d: 0.12, type: "triangle" }],
  refresh: [{ f: 300, t: 0, d: 0.18, type: "sawtooth", v: 0.05, slide: 900 }],
  play: [{ f: 440, t: 0, d: 0.06, type: "square", v: 0.05 }, { f: 660, t: 0.05, d: 0.1, type: "square", v: 0.05 }],
  gear: [{ f: 880, t: 0, d: 0.05, type: "triangle" }, { f: 1320, t: 0.05, d: 0.05, type: "triangle" }, { f: 1760, t: 0.1, d: 0.12, type: "triangle" }],
  upgrade: [{ f: 523, t: 0, d: 0.1 }, { f: 659, t: 0.09, d: 0.1 }, { f: 784, t: 0.18, d: 0.1 }, { f: 1047, t: 0.27, d: 0.22 }],
  error: [{ f: 180, t: 0, d: 0.15, type: "square", v: 0.05 }],
  attack: [{ f: 220, t: 0, d: 0.08, type: "sawtooth", v: 0.06, slide: 110 }],
  hit: [{ f: 140, t: 0, d: 0.1, type: "square", v: 0.06, slide: 70 }],
  death: [{ f: 300, t: 0, d: 0.35, type: "sawtooth", v: 0.06, slide: 60 }],
  henshin: [{ f: 392, t: 0, d: 0.1, type: "square", v: 0.05 }, { f: 587, t: 0.1, d: 0.1, type: "square", v: 0.05 }, { f: 784, t: 0.2, d: 0.35, type: "sawtooth", v: 0.05, slide: 1568 }],
  gattai: [{ f: 110, t: 0, d: 0.3, type: "sawtooth", v: 0.07 }, { f: 165, t: 0.25, d: 0.3, type: "sawtooth", v: 0.07 }, { f: 220, t: 0.5, d: 0.5, type: "square", v: 0.06 }],
  giant: [{ f: 82, t: 0, d: 0.6, type: "sawtooth", v: 0.08 }, { f: 123, t: 0.3, d: 0.6, type: "square", v: 0.06 }, { f: 165, t: 0.6, d: 0.7, type: "square", v: 0.06 }],
  rollcall: [{ f: 523, t: 0, d: 0.08 }, { f: 587, t: 0.08, d: 0.08 }, { f: 659, t: 0.16, d: 0.08 }, { f: 698, t: 0.24, d: 0.08 }, { f: 784, t: 0.32, d: 0.3 }],
  win: [{ f: 523, t: 0, d: 0.12 }, { f: 659, t: 0.12, d: 0.12 }, { f: 784, t: 0.24, d: 0.4 }],
  lose: [{ f: 392, t: 0, d: 0.18 }, { f: 330, t: 0.18, d: 0.18 }, { f: 262, t: 0.36, d: 0.45 }],
};

const MUTE_KEY = "herotime.muted";

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = loadMuted();
let ctx: AudioContext | undefined;

export const isMuted = (): boolean => muted;

export function setMuted(on: boolean): void {
  muted = on;
  try {
    localStorage.setItem(MUTE_KEY, on ? "1" : "0");
  } catch {
    // remembered for this visit only
  }
}

/** Play a cue (does nothing when muted or where the browser has no Web Audio). */
export function play(cue: Cue): void {
  if (muted || typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  try {
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const tone of CUES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.f, now + tone.t);
      if (tone.slide) osc.frequency.exponentialRampToValueAtTime(tone.slide, now + tone.t + tone.d);
      const v = tone.v ?? 0.08;
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

/** The cue for a game intent the server accepted. */
export function cueForIntent(type: string): Cue | undefined {
  return ({ BUY: "buy", BUY_GEAR: "buy", SELL: "sell", REFRESH: "refresh", PLAY: "play", USE_GEAR: "gear", UPGRADE: "upgrade", COMBINE: "gattai", HERO_POWER: "gear", PICK_DISCOVER: "play", CHOOSE_RELIC: "upgrade" } as Record<string, Cue>)[type];
}

/** The cue for a fight event in the replay. */
export function cueForEvent(type: string): Cue | undefined {
  return ({ ATTACK: "attack", BARRIER_POP: "hit", DEATH: "death", TRANSFORM: "henshin", KYODAIKA: "giant", GATTAI: "gattai", GIANT_ENTER: "giant", ROLL_CALL: "rollcall", SUMMON: "play" } as Record<string, Cue>)[type];
}

/** Big words splashed over the fight for the show-stopping moments. */
export function splashForEvent(type: string): string | undefined {
  return ({ TRANSFORM: "HENSHIN!", GATTAI: "GATTAI!", GIANT_ENTER: "KYODAI GATTAI!", KYODAIKA: "KYODAIKA!", ROLL_CALL: "ROLL CALL!" } as Record<string, string>)[type];
}

import { tr } from "./i18n.js";
import type { CombatEvent, CombatRecord } from "./protocol.js";

/**
 * Replays a fight by applying its events in order. Events carry the state they leave behind, so
 * nothing here knows a game rule. test/replay.test.ts proves that the result always equals what the
 * engine reports, on thousands of random fights.
 */

export type Side = "A" | "B";

export interface Fighter {
  uid: string;
  side: Side;
  cardKey: string;
  atk: number;
  hp: number;
  keywords: string[];
  barrier: boolean;
  /** Died but is about to come straight back (Revive / Kyodaika); keeps its slot. */
  ghost: boolean;
  /** A Giant, or a Kyodaika that has risen. */
  huge: boolean;
}

export interface ReplayState {
  A: Fighter[];
  B: Fighter[];
}

type BoardInput = CombatRecord["boardA"];

function fighters(units: BoardInput, side: Side): Fighter[] {
  return units.map((u, i) => {
    const keywords = [...(u.keywords ?? [])];
    return {
      uid: `${side}${i}`,
      side,
      cardKey: u.cardKey,
      atk: u.atk,
      hp: u.hp,
      keywords,
      barrier: keywords.includes("BARRIER"),
      ghost: false,
      huge: false,
    };
  });
}

export function initialState(record: Pick<CombatRecord, "boardA" | "boardB">): ReplayState {
  return { A: fighters(record.boardA, "A"), B: fighters(record.boardB, "B") };
}

const sideOf = (uid: string): Side => (uid.startsWith("A") ? "A" : "B");

function update(state: ReplayState, uid: string, change: (f: Fighter) => Fighter): ReplayState {
  const side = sideOf(uid);
  return { ...state, [side]: state[side].map((f) => (f.uid === uid ? change(f) : f)) };
}

/** Pure: returns a new state, never touches the old one. */
export function applyEvent(state: ReplayState, e: CombatEvent): ReplayState {
  switch (e.type) {
    case "ATTACK": {
      const withTarget = update(state, e.target, (f) => ({ ...f, hp: e.targetHp }));
      return update(withTarget, e.attacker, (f) => ({ ...f, hp: e.attackerHp }));
    }
    case "BARRIER_POP":
      return update(state, e.unit, (f) => ({ ...f, barrier: false }));
    case "BUFF":
      return update(state, e.unit, (f) => ({ ...f, atk: f.atk + e.atk, hp: f.hp + e.hp }));
    case "EFFECT_DAMAGE":
      return update(state, e.unit, (f) => ({ ...f, hp: e.hp }));
    case "DESTROY":
      return update(state, e.unit, (f) => ({ ...f, hp: 0 }));
    case "KEYWORD":
      return update(state, e.unit, (f) => ({
        ...f,
        keywords: f.keywords.includes(e.keyword) ? f.keywords : [...f.keywords, e.keyword],
        barrier: f.barrier || e.keyword === "BARRIER",
      }));
    case "SUMMON": {
      const list = [...state[e.side]];
      list.splice(e.index, 0, {
        uid: e.unit,
        side: e.side,
        cardKey: e.cardKey,
        atk: e.atk,
        hp: e.hp,
        keywords: [...e.keywords],
        barrier: e.keywords.includes("BARRIER"),
        ghost: false,
        huge: false,
      });
      return { ...state, [e.side]: list };
    }
    case "TRANSFORM":
      return update(state, e.unit, (f) => ({
        ...f,
        cardKey: e.into,
        atk: e.atk,
        hp: e.hp,
        keywords: [...e.keywords],
        barrier: e.keywords.includes("BARRIER"),
      }));
    case "DEATH": {
      if (e.returns) return update(state, e.unit, (f) => ({ ...f, ghost: true }));
      const side = sideOf(e.unit);
      return { ...state, [side]: state[side].filter((f) => f.uid !== e.unit) };
    }
    case "REVIVE":
      return update(state, e.unit, (f) => ({ ...f, ghost: false, hp: e.hp }));
    case "KYODAIKA":
      return update(state, e.unit, (f) => ({ ...f, ghost: false, atk: e.atk, hp: e.hp, keywords: [], barrier: false, huge: true }));
    case "GATTAI": {
      const side = sideOf(e.units[0] ?? "A");
      const list = state[side];
      const first = list.findIndex((f) => f.uid === e.units[0]);
      const merged: Fighter = {
        uid: e.into,
        side,
        cardKey: e.cardKey,
        atk: e.atk,
        hp: e.hp,
        keywords: [...e.keywords],
        barrier: list.some((f) => e.units.includes(f.uid) && f.barrier),
        ghost: false,
        huge: false,
      };
      const rest = list.filter((f) => !e.units.includes(f.uid));
      rest.splice(Math.max(0, first), 0, merged);
      return { ...state, [side]: rest };
    }
    case "GIANT_ENTER":
      return {
        ...state,
        [e.side]: [
          ...state[e.side],
          { uid: e.unit, side: e.side, cardKey: e.cardKey, atk: e.atk, hp: e.hp, keywords: [...e.keywords], barrier: e.keywords.includes("BARRIER"), ghost: false, huge: true },
        ],
      };
    case "ROLL_CALL":
      return state;
  }
}

export function replayAll(record: CombatRecord): ReplayState {
  return record.result.events.reduce(applyEvent, initialState(record));
}

/** Fighters still standing (what the engine calls survivors). */
export function standing(state: ReplayState, side: Side): Fighter[] {
  return state[side].filter((f) => !f.ghost && f.hp > 0);
}

export type Names = (cardKey: string) => string;

export interface Step {
  event: CombatEvent;
  /** State after this event. */
  state: ReplayState;
  /** Fighters to highlight while this step plays. */
  focus: string[];
  text: string;
}

function find(state: ReplayState, uid: string): Fighter | undefined {
  return state[sideOf(uid)].find((f) => f.uid === uid);
}

/** A human-readable line for the combat log. `before` is the state before the event. */
export function describe(e: CombatEvent, before: ReplayState, names: Names): string {
  const name = (uid: string): string => names(find(before, uid)?.cardKey ?? uid);
  switch (e.type) {
    case "ATTACK":
      return tr(`${name(e.attacker)} hits ${name(e.target)} for ${e.damageToTarget} and takes ${e.damageToAttacker}`, `${name(e.attacker)} ตี ${name(e.target)} ${e.damageToTarget} ดาเมจ และโดนคืน ${e.damageToAttacker}`);
    case "BARRIER_POP": return tr(`${name(e.unit)}'s Barrier absorbs the hit`, `Barrier ของ ${name(e.unit)} กันดาเมจไว้`);
    case "BUFF": return `${name(e.unit)} ${tr("gets", "ได้")} ${e.atk >= 0 ? "+" : ""}${e.atk}/${e.hp >= 0 ? "+" : ""}${e.hp}`;
    case "EFFECT_DAMAGE": return e.amount > 0 ? tr(`${name(e.unit)} takes ${e.amount} damage`, `${name(e.unit)} โดน ${e.amount} ดาเมจ`) : tr(`${name(e.unit)} is not hurt`, `${name(e.unit)} ไม่เป็นอะไร`);
    case "DESTROY": return tr(`${name(e.unit)} is destroyed`, `${name(e.unit)} ถูกทำลาย`);
    case "KEYWORD": return `${name(e.unit)} ${tr("gains", "ได้")} ${e.keyword}`;
    case "SUMMON": return `${names(e.cardKey)} ${tr("appears", "ปรากฏตัว")} (${e.atk}/${e.hp})`;
    case "TRANSFORM": return `${name(e.unit)} ${tr("becomes", "กลายเป็น")} ${names(e.into)} (${e.atk}/${e.hp})`;
    case "DEATH": return `${name(e.unit)} ${tr("falls", "ล้ม")}`;
    case "REVIVE": return `${name(e.unit)} ${tr("revives", "ฟื้นคืนชีพ")}`;
    case "KYODAIKA": return tr(`${name(e.unit)} rises as a giant (${e.atk}/${e.hp})`, `${name(e.unit)} ขยายร่างเป็นยักษ์ (${e.atk}/${e.hp})`);
    case "GATTAI": return tr(`${e.units.length} units merge into ${names(e.cardKey)} (${e.atk}/${e.hp})`, `${e.units.length} ยูนิตรวมร่างเป็น ${names(e.cardKey)} (${e.atk}/${e.hp})`);
    case "ROLL_CALL": return tr(`Roll Call! Side ${e.side} calls out the full team`, `Roll Call! ฝั่ง ${e.side} ประกาศชื่อทีม`);
    case "GIANT_ENTER": return `${names(e.cardKey)} ${tr("enters the fight", "ลงสนาม")} (${e.atk}/${e.hp})`;
  }
}

function focusOf(e: CombatEvent): string[] {
  switch (e.type) {
    case "ATTACK": return [e.attacker, e.target];
    case "GATTAI": return [e.into];
    case "ROLL_CALL": return [];
    case "GIANT_ENTER": case "SUMMON": return [e.unit];
    default: return "unit" in e ? [e.unit] : [];
  }
}

export function buildSteps(record: CombatRecord, names: Names): { initial: ReplayState; steps: Step[] } {
  const initial = initialState(record);
  const steps: Step[] = [];
  let state = initial;
  for (const event of record.result.events) {
    const text = describe(event, state, names);
    state = applyEvent(state, event);
    steps.push({ event, state, focus: focusOf(event), text });
  }
  return { initial, steps };
}

/** How long a step stays on screen, relative to one normal attack (1). Shields and merges are quick. */
export function stepWeight(e: CombatEvent): number {
  switch (e.type) {
    case "ATTACK": return 1;
    case "BARRIER_POP": case "KEYWORD": case "BUFF": return 0.35;
    case "DEATH": return 0.6;
    case "ROLL_CALL": case "GATTAI": case "GIANT_ENTER": case "KYODAIKA": return 1.4;
    default: return 0.7;
  }
}

/** Per-weight delay so the whole replay fits in `budgetMs`, within sensible bounds. */
export function pickDelay(steps: readonly Step[], budgetMs: number, minMs = 60, maxMs = 650): number {
  const total = steps.reduce((n, s) => n + stepWeight(s.event), 0);
  if (total === 0) return maxMs;
  return Math.max(minMs, Math.min(maxMs, budgetMs / total));
}

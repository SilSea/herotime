import type { ContentIndex } from "../content-index.js";
import type { CombatRecord } from "../protocol.js";
import { buildSteps, pickDelay, stepWeight, type Fighter, type ReplayState, type Step } from "../replay.js";
import { cardEl } from "./card.js";
import { h, mount } from "./dom.js";

export interface ReplayOptions {
  /** Aim to finish within this many ms (the battle phase is short, so long fights speed up). */
  budgetMs: number;
  onClose: () => void;
}

/** Plays one fight on screen: enemy on top, you at the bottom. */
export class ReplayView {
  private readonly steps: Step[];
  private readonly initial: ReplayState;
  private index = -1;
  private timer: number | undefined;
  private paused = false;
  private speed = 1;
  private readonly baseDelay: number;
  private readonly root: HTMLElement;
  private readonly logEl: HTMLElement;
  private readonly field: HTMLElement;
  private readonly controls: HTMLElement;
  private closed = false;

  constructor(
    host: HTMLElement,
    private readonly record: CombatRecord,
    private readonly ix: ContentIndex,
    private readonly opts: ReplayOptions,
  ) {
    const built = buildSteps(record, ix.cardName);
    this.steps = built.steps;
    this.initial = built.initial;
    this.baseDelay = pickDelay(this.steps, opts.budgetMs);

    this.field = h("div", { class: "replay-field" });
    this.logEl = h("div", { class: "replay-log" });
    this.controls = h("div", { class: "replay-controls" });
    this.root = h("div", { class: "replay-overlay" }, h("div", { class: "replay-box" }, h("h2", { text: `Turn ${record.turn}: you vs ${record.opponentName}` }), this.field, this.logEl, this.controls));
    host.replaceChildren(this.root);
    this.draw(this.initial, [], undefined);
    this.drawControls();
    this.schedule(600);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    window.clearTimeout(this.timer);
    this.root.remove();
    this.opts.onClose();
  }

  private get done(): boolean {
    return this.index >= this.steps.length - 1;
  }

  private schedule(ms: number): void {
    window.clearTimeout(this.timer);
    if (this.closed || this.paused || this.done) return;
    this.timer = window.setTimeout(() => this.advance(), ms / this.speed);
  }

  private advance(): void {
    if (this.done) return;
    this.index++;
    const step = this.steps[this.index] as Step;
    const prev = this.index > 0 ? (this.steps[this.index - 1] as Step).state : this.initial;
    // A unit that dies is drawn once more, fading, from the state before it was removed.
    const dying = step.event.type === "DEATH" && !step.event.returns ? [step.event.unit] : [];
    this.draw(dying.length > 0 ? prev : step.state, step.focus, step, dying);
    this.log(step.text);
    this.drawControls();
    this.schedule(this.baseDelay * stepWeight(step.event));
  }

  private skip(): void {
    window.clearTimeout(this.timer);
    const last = this.steps[this.steps.length - 1];
    for (let i = this.index + 1; i < this.steps.length; i++) this.log((this.steps[i] as Step).text);
    this.index = this.steps.length - 1;
    this.draw(last?.state ?? this.initial, [], undefined);
    this.drawControls();
  }

  private log(text: string): void {
    this.logEl.append(h("div", { text }));
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  private row(side: "A" | "B", state: ReplayState, focus: readonly string[], step: Step | undefined, dying: readonly string[]): HTMLElement {
    const attacker = step?.event.type === "ATTACK" ? step.event.attacker : undefined;
    const target = step?.event.type === "ATTACK" ? step.event.target : undefined;
    const fresh = step && (step.event.type === "SUMMON" || step.event.type === "GIANT_ENTER" || step.event.type === "GATTAI") ? focus : [];
    const row = h("div", { class: `replay-row ${side === this.record.meSide ? "mine" : "theirs"}` });
    for (const f of state[side]) row.append(this.fighter(f, { attacker: f.uid === attacker, target: f.uid === target, focus: focus.includes(f.uid), dying: dying.includes(f.uid), fresh: fresh.includes(f.uid) }));
    if (state[side].length === 0) row.append(h("div", { class: "muted", text: "(no units)" }));
    return row;
  }

  private fighter(f: Fighter, flags: { attacker: boolean; target: boolean; focus: boolean; dying: boolean; fresh: boolean }): HTMLElement {
    const classes = [flags.attacker ? "attacking" : "", flags.target ? "hit" : "", flags.focus && !flags.attacker && !flags.target ? "focus" : "", flags.dying ? "dying" : "", flags.fresh ? "entering" : "", f.ghost ? "ghost" : "", f.huge ? "huge" : ""];
    return cardEl(this.ix, { key: f.cardKey, atk: f.atk, hp: Math.max(0, f.hp), small: true, hideText: true, barrier: f.barrier, extraKeywords: f.keywords, classes });
  }

  private draw(state: ReplayState, focus: readonly string[], step: Step | undefined, dying: readonly string[] = []): void {
    const mine = this.record.meSide;
    const theirs = mine === "A" ? "B" : "A";
    mount(this.field, this.row(theirs, state, focus, step, dying), h("div", { class: "vs", text: "VS" }), this.row(mine, state, focus, step, dying));
  }

  private drawControls(): void {
    const finished = this.done;
    const r = this.record.result;
    const outcome = r.winner === "DRAW" ? "Draw" : r.winner === this.record.meSide ? "You won" : "You lost";
    mount(
      this.controls,
      finished
        ? h("span", { class: `outcome ${r.winner === this.record.meSide ? "win" : r.winner === "DRAW" ? "draw" : "loss"}`, text: `${outcome}${this.record.damageTaken > 0 ? ` - you took ${this.record.damageTaken} damage` : this.record.damageDealt > 0 ? ` - dealt ${this.record.damageDealt} damage` : ""}` })
        : h("span", { class: "muted", text: `${this.index + 1}/${this.steps.length}` }),
      !finished && h("button", { class: "btn", text: this.paused ? "Resume" : "Pause", on: { click: () => this.togglePause() } }),
      !finished && h("button", { class: "btn", text: `${this.speed}x`, title: "Change speed", on: { click: () => ((this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1), this.drawControls(), this.schedule(0)) } }),
      !finished && h("button", { class: "btn", text: "Skip", on: { click: () => this.skip() } }),
      h("button", { class: "btn primary", text: finished ? "Continue" : "Close", on: { click: () => this.close() } }),
    );
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.drawControls();
    if (!this.paused) this.schedule(0);
    else window.clearTimeout(this.timer);
  }
}

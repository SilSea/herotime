import { ContentIndex } from "../content-index.js";
import { ApiError } from "../net.js";
import type { AdminDraft, AuditEntry, ContentSnapshot, SimRow, SimulationReport, VersionMeta, GameStats, StatRow } from "../protocol.js";
import { ENTITIES, entityInfo, KEYWORDS, RULE_DEFAULTS, RULE_ROWS, TRIGGERS, type EntityKind, type RefKind } from "./admin-schema.js";
import { byName, grantedKeywords } from "../format.js";
import { artBox } from "./art.js";
import { cardEl, keywordBoxes } from "./card.js";
import { artCropTools } from "./art-crop.js";
import { wizardPanel } from "./card-wizard.js";
import { CUES, MUSIC_SLOTS, play, preview, SOUND_SLOTS } from "../sound.js";
import type { Ctx } from "./ctx.js";
import { h, mount } from "./dom.js";
import { renderRows, type FormEnv } from "./form.js";
import { userMessage } from "../errors.js";

/**
 * The content editor. Everything the admin changes lives in `ed.draft.data` (the same JSON the server stores);
 * nothing reaches players until the draft is saved and then published as a new version.
 */
interface EditorState {
  draft?: AdminDraft;
  loading: boolean;
  loadError?: string;
  /** Which list is open; "rules" is the game-wide numbers. */
  kind: EntityKind | "rules" | "sounds";
  /** Position in the list of that kind (not the key, which can be edited). */
  index?: number;
  query: string;
  dirty: boolean;
  busy: boolean;
  raw: boolean;
  panel: "edit" | "versions" | "audit" | "simulate" | "stats" | "wizard";
  stats?: GameStats;
  statsHumans: boolean;
  /** Card list filters ("" = all). */
  filter: { kind: string; faction: string; rank: string; keyword: string };
  sim?: SimulationReport;
  simMatches: number;
  simTarget: "draft" | "published";
  /** Relic handed to the first bot of every simulated match ("" = none). */
  simRelic: string;
  versions?: { current: number; versions: VersionMeta[] };
  audit?: AuditEntry[];
  /** Problems from the last failed publish (the draft's own issues are in draft.issues). */
  publishIssues: string[];
}

const ed: EditorState = { loading: false, kind: "cards", query: "", dirty: false, busy: false, raw: false, panel: "edit", publishIssues: [], simMatches: 60, simTarget: "draft", simRelic: "", statsHumans: false, filter: { kind: "", faction: "", rank: "", keyword: "" } };

/** The element the screen was last drawn into: the app redraws and replaces it, so async work must not hold on to an old one. */
let host: HTMLElement | undefined;
let live: Ctx | undefined;
let statusEl: HTMLElement | undefined;
let previewEl: HTMLElement | undefined;
/** The toolbar buttons an edit turns on (see setDirty). */
let saveEl: HTMLButtonElement | undefined;
let discardEl: HTMLButtonElement | undefined;

/** The entity list being edited (the Rules tab has no list; entity code never runs there). */
const kindNow = (): EntityKind => (ed.kind === "rules" || ed.kind === "sounds" ? "cards" : ed.kind);

const data = (): Record<string, any[]> => (ed.draft as AdminDraft).data;
const list = (kind: EntityKind): any[] => (data()[kind] ??= []);

/** Forget everything (logging out, or another account signing in). */
export function resetAdmin(): void {
  ed.draft = undefined;
  ed.loadError = undefined;
  ed.index = undefined;
  ed.dirty = false;
  ed.panel = "edit";
  ed.versions = undefined;
  ed.audit = undefined;
  ed.publishIssues = [];
}

/** True while someone is typing in the editor, so the app does not redraw it from under them. */
export function adminHasFocus(): boolean {
  const a = document.activeElement;
  return !!a && !!a.closest(".admin") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
}

let drawnFor: string | undefined;

/**
 * Draw the admin again, keeping where each scrolling part was: the list on the left (so picking a card does not
 * jump back to the top) and the page. The form and preview keep theirs too, unless another entry was picked.
 */
function redraw(): void {
  if (!host || !live) return;
  const at = (sel: string): number => host?.querySelector<HTMLElement>(sel)?.scrollTop ?? 0;
  const kept = { list: at(".admin-list"), middle: at(".admin-middle"), right: at(".admin-right"), page: window.scrollY };
  const same = drawnFor === `${ed.kind}:${ed.index}`;
  renderAdmin(host, live);
  drawnFor = `${ed.kind}:${ed.index}`;
  const put = (sel: string, top: number): void => {
    const el = host?.querySelector<HTMLElement>(sel);
    if (el) el.scrollTop = top;
  };
  put(".admin-list", kept.list);
  if (same) {
    put(".admin-middle", kept.middle);
    put(".admin-right", kept.right);
  }
  window.scrollTo({ top: kept.page });
}

async function guarded<T>(ctx: Ctx, work: () => Promise<T>): Promise<T | undefined> {
  if (ed.busy) return undefined;
  ed.busy = true;
  redraw();
  try {
    return await work();
  } catch (e) {
    if (e instanceof ApiError && e.issues.length > 0) ed.publishIssues = e.issues;
    ctx.toast(userMessage(e, "admin"), "error");
    return undefined;
  } finally {
    ed.busy = false;
    redraw();
  }
}

const token = (ctx: Ctx): string => ctx.store.state.token as string;

async function load(ctx: Ctx): Promise<void> {
  if (ed.loading) return;
  ed.loading = true;
  try {
    ed.draft = await ctx.api.adminDraft(token(ctx));
    ed.loadError = undefined;
    ed.dirty = false;
  } catch (e) {
    ed.loadError = userMessage(e, "admin load", "could not load the draft");
  } finally {
    ed.loading = false;
    redraw();
  }
}

// ------------------------------------------------------------------ screen

export function renderAdmin(root: HTMLElement, ctx: Ctx): void {
  host = root;
  live = ctx;
  if (!ed.draft) {
    mount(root, h("div", { class: "admin" }, ed.loadError ? h("p", { class: "form-error", text: ed.loadError }) : h("p", { class: "muted center-text", text: "Loading the content draft..." }), ed.loadError && h("button", { class: "btn", text: "Try again", on: { click: () => void load(ctx) } })));
    if (!ed.loadError) void load(ctx);
    return;
  }

  const refs = (k: RefKind): string[] => (k === "cards" || k === "factions" || k === "series" || k === "gauges" || k === "heroes" || k === "relics" ? list(k).map((x) => String(x.key ?? "")).filter(Boolean) : []);
  const labelOf = (k: RefKind, x: Record<string, any>): string =>
    k === "cards" ? `${x.name ?? x.key} · ${x.kind === "GEAR" ? "Gear" : x.kind === "GIANT" ? "Giant" : `${x.atk}/${x.hp}`}${x.token ? " · token" : ""} · rank ${x.rank ?? 1}` : String(x.name ?? x.key);
  const datalists = (["cards", "factions", "series", "gauges", "heroes", "relics"] as RefKind[]).map((k) =>
    h("datalist", { id: `dl-${k}` }, ...[...list(k as EntityKind)].filter((x) => x.key).sort(byName).map((x) => h("option", { value: String(x.key), text: labelOf(k, x) }))),
  );

  const panel =
    ed.panel === "versions" ? versionsPanel(ctx) : ed.panel === "audit" ? auditPanel() : ed.panel === "simulate" ? simulatePanel(ctx) : ed.panel === "stats" ? statsPanel(ctx) : ed.panel === "wizard" ? wizard(ctx) : editorBody(ctx, refs);

  mount(root, h("div", { class: "admin" }, ...datalists, toolbar(ctx), issuesBox(), panel));
}

function summary(): string {
  const d = ed.draft as AdminDraft;
  const parts = [`Published: version ${d.published}`, d.saved ? "draft saved" : "no draft yet"];
  if (ed.dirty) parts.push("UNSAVED CHANGES");
  parts.push(d.issues.length === 0 ? "no problems" : `${d.issues.length} problem${d.issues.length > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

function setDirty(): void {
  ed.dirty = true;
  if (statusEl) statusEl.textContent = summary();
  statusEl?.classList.add("dirty");
  // An edit that does not redraw the page must still turn Save (and Discard) on.
  for (const btn of [saveEl, discardEl]) if (btn && !ed.busy) btn.disabled = false;
  saveEl?.classList.add("primary");
  updatePreview();
}

function toolbar(ctx: Ctx): HTMLElement {
  const d = ed.draft as AdminDraft;
  statusEl = h("span", { class: `admin-status ${ed.dirty ? "dirty" : ""}`, text: summary() });
  const b = (text: string, on: () => void, o: { primary?: boolean; danger?: boolean; title?: string; off?: boolean } = {}) =>
    h("button", { class: `btn ${o.primary ? "primary" : ""} ${o.danger ? "danger" : ""}`, text, ...(o.title ? { title: o.title } : {}), disabled: ed.busy || !!o.off, on: { click: on } });
  return h(
    "div",
    { class: "admin-bar" },
    h("strong", { text: "Content editor" }),
    statusEl,
    h("span", { class: "spacer" }),
    (saveEl = b("Save draft", () => void save(ctx), { primary: ed.dirty, off: !ed.dirty && d.saved, title: "Check the draft and keep it for later. Players do not see it yet." }) as HTMLButtonElement),
    b("Publish", () => void publish(ctx), { title: "Make the draft the content new matches use. Matches already running are not affected." }),
    (discardEl = b("Discard draft", () => void discard(ctx), { danger: true, off: !d.saved && !ed.dirty }) as HTMLButtonElement),
    b("＋ Card wizard", () => ((ed.panel = "wizard"), redraw()), { primary: ed.panel !== "wizard", title: "Make a new card step by step, with a live preview" }),
    b("Versions", () => void showVersions(ctx)),
    b("Simulate", () => ((ed.panel = "simulate"), redraw()), { title: "Play bot matches on the content and see what stands out" }),
    b("Stats", () => void showStats(ctx), { title: "Pick rate and results of cards, heroes and relics in real matches" }),
    b("History", () => void showAudit(ctx)),
    ed.panel !== "edit" && b("Back to editing", () => ((ed.panel = "edit"), redraw())),
  );
}

function issuesBox(): HTMLElement | null {
  const d = ed.draft as AdminDraft;
  const all = [...d.issues.map((t) => ({ t, kind: "draft" })), ...ed.publishIssues.filter((t) => !d.issues.includes(t)).map((t) => ({ t, kind: "publish" }))];
  if (all.length === 0) return null;
  return h("div", { class: "admin-issues" }, h("strong", { text: "These must be fixed before the draft can be published:" }), h("ul", null, ...all.slice(0, 30).map((i) => h("li", { text: i.t }))), all.length > 30 && h("p", { class: "muted", text: `...and ${all.length - 30} more` }));
}

// ----------------------------------------------------------------- actions

async function save(ctx: Ctx): Promise<boolean> {
  const next = await guarded(ctx, () => ctx.api.adminSave(token(ctx), data()));
  if (!next) return false;
  ed.draft = next;
  ed.dirty = false;
  ed.publishIssues = [];
  ctx.toast(next.issues.length === 0 ? "Draft saved" : `Draft saved with ${next.issues.length} problem(s)`);
  return true;
}

async function publish(ctx: Ctx): Promise<void> {
  if (ed.dirty || !(ed.draft as AdminDraft).saved) {
    if (!(await save(ctx))) return;
  }
  const d = ed.draft as AdminDraft;
  if (d.issues.length > 0) return ctx.toast("Fix the problems first", "error");
  const notes = window.prompt("Notes for this version (what changed?)", "");
  if (notes === null) return;
  const done = await guarded(ctx, async () => {
    try {
      return await ctx.api.adminPublish(token(ctx), notes, false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && window.confirm(`${e.message}\n\nPublish anyway?`)) return ctx.api.adminPublish(token(ctx), notes, true);
      throw e;
    }
  });
  if (!done) return;
  ctx.toast(`Published version ${done.version}. New matches use it.`);
  ed.publishIssues = [];
  ed.draft = undefined;
  await ctx.refreshContent();
  await load(ctx);
}

async function discard(ctx: Ctx): Promise<void> {
  if (!window.confirm("Throw away the draft and go back to the published content?")) return;
  const next = await guarded(ctx, () => ctx.api.adminReset(token(ctx)));
  if (!next) return;
  ed.draft = next;
  ed.dirty = false;
  ed.index = undefined;
  ed.publishIssues = [];
}

async function showVersions(ctx: Ctx): Promise<void> {
  const v = await guarded(ctx, () => ctx.api.adminVersions(token(ctx)));
  if (!v) return;
  ed.versions = v;
  ed.panel = "versions";
}

async function showAudit(ctx: Ctx): Promise<void> {
  const a = await guarded(ctx, () => ctx.api.adminAudit(token(ctx)));
  if (!a) return;
  ed.audit = a.entries;
  ed.panel = "audit";
}

async function restore(ctx: Ctx, n: number): Promise<void> {
  if (ed.dirty && !window.confirm("Replace your unsaved draft with that version?")) return;
  const next = await guarded(ctx, () => ctx.api.adminRestore(token(ctx), n));
  if (!next) return;
  ed.draft = next;
  ed.dirty = false;
  ed.index = undefined;
  ed.panel = "edit";
  ctx.toast(`Version ${n} copied into the draft. Publish it to make it live.`);
}

// ----------------------------------------------------------------- card wizard

function wizard(ctx: Ctx): HTMLElement {
  return wizardPanel({
    ix: localIndex(ctx),
    takenKeys: new Set(list("cards").map((c) => String(c.key ?? ""))),
    upload: (file) => uploadImage(ctx, file),
    rerender: redraw,
    create: (card, andSave) => {
      list("cards").push(card);
      ed.kind = "cards";
      ed.index = list("cards").length - 1;
      ed.panel = "edit";
      ed.dirty = true;
      ctx.toast(`${String(card.name)} was added to the draft.`);
      if (andSave) void save(ctx).then(() => redraw());
      else redraw();
    },
  });
}

// ----------------------------------------------------------------- statistics from real matches

async function showStats(ctx: Ctx): Promise<void> {
  ed.panel = "stats";
  const r = await guarded(ctx, () => ctx.api.adminStats(token(ctx), ed.statsHumans, []));
  if (r) {
    ed.stats = r;
    redraw();
  }
}

function statRows(title: string, rows: readonly StatRow[], name: (k: string) => string, limit = 20): HTMLElement {
  return h(
    "div",
    { class: "panel sim-table" },
    h("h3", { text: title }),
    rows.length === 0
      ? h("p", { class: "muted", text: "No data yet." })
      : h("table", { class: "admin-table" }, h("tr", null, ...["", "Seen", "Pick %", "Avg place", "Win %"].map((t) => h("th", { text: t }))),
          ...rows.slice(0, limit).map((r) => h("tr", { class: r.count >= 5 && r.avgPlacement <= 3.8 ? "sim-good" : r.count >= 5 && r.avgPlacement >= 5.2 ? "sim-bad" : "" }, h("td", { text: name(r.key) }), h("td", { text: String(r.count) }), h("td", { text: `${(r.pickRate * 100).toFixed(1)}%` }), h("td", { text: r.avgPlacement.toFixed(2) }), h("td", { text: `${(r.winRate * 100).toFixed(0)}%` })))),
  );
}

/** Copy the suggested relic weights into the draft (save to keep them, publish to use them). */
function applyWeights(ctx: Ctx): void {
  const s = ed.stats;
  if (!s || !ed.draft) return;
  let changed = 0;
  for (const r of data().relics ?? []) {
    const w = s.relicWeights.find((x) => x.key === r.key);
    if (w && w.samples > 0 && w.suggested !== (r.weight ?? 100)) {
      r.weight = w.suggested;
      changed++;
    }
  }
  if (changed > 0) ed.dirty = true;
  ctx.toast(changed > 0 ? `${changed} relic weight${changed > 1 ? "s" : ""} changed in the draft. Save, then publish.` : "Nothing to change.");
  redraw();
}

function statsPanel(ctx: Ctx): HTMLElement {
  const s = ed.stats;
  const humans = h("input", { type: "checkbox", checked: ed.statsHumans });
  humans.addEventListener("change", () => {
    ed.statsHumans = humans.checked;
    void showStats(ctx);
  });
  const changes = s ? s.relicWeights.filter((w) => w.samples > 0 && w.suggested !== w.weight) : [];
  return h(
    "div",
    null,
    h("div", { class: "panel" }, h("h3", { text: "Statistics from real matches" }), h("p", { class: "muted", text: "Every finished match the server saved. A card counts once for each player whose last board had it. Green = its players place well (3.8 or better), red = badly (5.2 or worse), with 5+ samples." }),
      h("label", { class: "row" }, humans, "humans only (leave bots out)"),
      s && h("p", { text: `${s.matches} matches, ${s.players} players counted.` })),
    s &&
      h(
        "div",
        { class: "sim-grid" },
        statRows("Heroes", s.heroes, ctx.ix.heroName),
        statRows("Relics", s.relics, ctx.ix.relicName),
        statRows("Cards: best", s.cards.filter((c) => c.count >= 5), ctx.ix.cardName),
        statRows("Cards: most picked", [...s.cards].sort((a, b) => b.count - a.count), ctx.ix.cardName),
        h("div", { class: "panel sim-table" }, h("h3", { text: "Relic weights" }), h("p", { class: "muted", text: "How often each relic is offered. The suggestion lowers the weight of relics whose holders place well and raises it for those that place badly (15% per place, at least 5 holders)." }),
          changes.length === 0 ? h("p", { class: "muted", text: "No change suggested yet." }) : h("table", { class: "admin-table" }, h("tr", null, ...["", "Holders", "Weight", "Suggested"].map((t) => h("th", { text: t }))), ...changes.map((w) => h("tr", null, h("td", { text: ctx.ix.relicName(w.key) }), h("td", { text: String(w.samples) }), h("td", { text: String(w.weight) }), h("td", { text: String(w.suggested) })))),
          changes.length > 0 && h("button", { class: "btn primary", text: "Apply to the draft", on: { click: () => applyWeights(ctx) } })),
      ),
  );
}

// ----------------------------------------------------------------- simulation

async function runSimulation(ctx: Ctx): Promise<void> {
  // The server simulates the saved draft, so save pending edits first.
  if (ed.simTarget === "draft" && ed.dirty && !(await save(ctx))) return;
  const r = await guarded(ctx, () => ctx.api.adminSimulate(token(ctx), ed.simMatches, ed.simTarget, ed.simRelic || undefined));
  if (r) {
    ed.sim = r;
    redraw(); // guarded() already redrew, before the result was stored
  }
}

/**
 * Green / red only when a row is well off the average and the gap is bigger than its ± range (so a handful of
 * lucky matches does not light up).
 */
function simClass(r: SimRow, expected: number): string {
  const gap = r.avgPlacement - expected;
  if (Math.abs(gap) < 0.7 || (r.margin !== undefined && Math.abs(gap) <= r.margin)) return "";
  return gap < 0 ? "sim-good" : "sim-bad";
}

function simTable(title: string, rows: SimRow[], expected: number, limit = 15, note?: string): HTMLElement {
  const shown = rows.slice(0, limit);
  return h(
    "div",
    { class: "panel sim-table" },
    h("h3", { text: title }),
    shown.length === 0
      ? h("p", { class: "muted", text: "Nothing to show." })
      : h(
          "table",
          { class: "admin-table" },
          h("tr", null, ...["", "Seen", "Avg place", "±", "Win %"].map((t) => h("th", { text: t, title: t === "±" ? "95% range: run more matches and the average very likely stays within this" : "" }))),
          ...shown.map((r) => h("tr", { class: simClass(r, expected) }, h("td", { text: r.name }), h("td", { text: String(r.count) }), h("td", { text: r.avgPlacement.toFixed(2) }), h("td", { class: "muted", text: r.margin !== undefined ? r.margin.toFixed(2) : "" }), h("td", { text: `${(r.winRate * 100).toFixed(0)}%` }))),
        ),
    note && h("p", { class: "muted small", text: note }),
  );
}

function simulatePanel(ctx: Ctx): HTMLElement {
  const matches = h("input", { type: "number", value: String(ed.simMatches), attrs: { min: "1", max: "300" } });
  matches.addEventListener("input", () => (ed.simMatches = Math.max(1, Math.min(300, Math.trunc(matches.valueAsNumber) || 1))));
  const target = h("select", null, h("option", { value: "draft", text: "the draft", selected: ed.simTarget === "draft" }), h("option", { value: "published", text: "what is published", selected: ed.simTarget === "published" }));
  target.addEventListener("change", () => (ed.simTarget = target.value as "draft" | "published"));
  const relicKeys = (ed.draft ? (data().relics ?? []) : []).map((x: { key?: string; name?: string }) => ({ key: String(x.key ?? ""), name: String(x.name ?? x.key ?? "") })).filter((x) => x.key);
  const relic = h("select", { title: "Give this relic to the first bot of every match from the start" }, h("option", { value: "", text: "no forced relic", selected: ed.simRelic === "" }), ...relicKeys.map((x) => h("option", { value: x.key, text: `bot 1 starts with ${x.name}`, selected: ed.simRelic === x.key })));
  relic.addEventListener("change", () => (ed.simRelic = relic.value));
  const r = ed.sim;
  const cards = r ? r.cards.filter((c) => c.count >= Math.max(3, r.matches / 4)) : [];
  return h(
    "div",
    null,
    h("div", { class: "panel" }, h("h3", { text: "Sandbox: bots play full matches" }), h("p", { class: "muted", text: "Eight bots per match. Read it as 'does anything stand out' rather than a verdict: the bots play simply. Green = places well, red = places badly, against the average, only when the gap is bigger than its ± range. ± shrinks with more matches: 300 matches gives about ±0.2 for a faction." }), h("div", { class: "row" }, matches, "matches on", target, relic, h("button", { class: "btn primary", text: ed.busy ? "Running..." : "Run", disabled: ed.busy, on: { click: () => void runSimulation(ctx) } }))),
    r &&
      h(
        "div",
        { class: "sim-grid" },
        h("div", { class: "panel" }, h("strong", { text: `${r.matches} of ${r.requested} matches` }), h("p", { class: "muted", text: `Average place ${r.expected}. Average length ${r.avgTurns} turns (${r.target}).` }), r.neverUsed.length > 0 && h("p", { text: `Never on a final board: ${r.neverUsed.map(ctx.ix.cardName).join(", ")}` })),
        r.forced && h("div", { class: "panel" }, h("strong", { text: `Bot 1 with ${r.forced.name}` }), h("p", { text: `Average place ${r.forced.avgPlacement.toFixed(2)} (expected ${r.expected}), wins ${(r.forced.winRate * 100).toFixed(0)}% over ${r.forced.count} matches.` })),
        simTable("Heroes", r.heroes, r.expected),
        simTable("Relics (held at the end)", r.relics ?? [], r.expected),
        (r.giants?.length ?? 0) > 0 && simTable("Giant Robos (in the Giant Slot at the end)", r.giants ?? [], r.expected),
        simTable("Factions (3+ units on the final board, summoned tokens not counted)", r.factions, r.expected, 15, r.unassigned ? `${r.unassigned} final boards had no faction with 3+ units, so they are in no faction row.` : undefined),
        simTable("Best cards", cards, r.expected),
        simTable("Worst cards", [...cards].reverse(), r.expected),
      ),
  );
}

// ----------------------------------------------------------------- versions, history

const when = (iso: string): string => new Date(iso).toLocaleString();

function versionsPanel(ctx: Ctx): HTMLElement {
  const v = ed.versions as { current: number; versions: VersionMeta[] };
  return h(
    "div",
    { class: "panel" },
    h("h3", { text: "Published versions" }),
    h("p", { class: "muted", text: "Restoring copies a version into the draft; it goes live only when you publish." }),
    h("table", { class: "admin-table" }, h("tr", null, ...["Version", "Published", "Notes", ""].map((t) => h("th", { text: t }))), ...v.versions.map((m) => h("tr", null, h("td", { text: `${m.number}${m.number === v.current ? " (live)" : ""}` }), h("td", { text: when(m.publishedAt) }), h("td", { text: m.notes ?? "" }), h("td", null, h("button", { class: "mini", text: "Restore into draft", disabled: ed.busy, on: { click: () => void restore(ctx, m.number) } }))))),
  );
}

function auditPanel(): HTMLElement {
  const entries = ed.audit ?? [];
  return h(
    "div",
    { class: "panel" },
    h("h3", { text: "Who changed what" }),
    entries.length === 0 ? h("p", { class: "muted", text: "Nothing yet." }) : h("table", { class: "admin-table" }, h("tr", null, ...["When", "What", "Details"].map((t) => h("th", { text: t }))), ...entries.map((e) => h("tr", null, h("td", { text: when(e.at) }), h("td", { text: e.entity }), h("td", { class: "muted", text: JSON.stringify(e.after ?? e.before ?? "") })))),
  );
}

// ----------------------------------------------------------------- the editor

function rulesBody(refs: (k: RefKind) => string[]): HTMLElement {
  const d = data() as unknown as Record<string, unknown>;
  const rules = (d.rules ??= {}) as Record<string, unknown>;
  const env: FormEnv = { refs, changed: setDirty };
  const tabs = rulesTabs();
  return h(
    "div",
    { class: "admin-body rules-body" },
    h("div", { class: "admin-left" }, tabs, h("p", { class: "muted small", text: "Game-wide numbers for this content version. Tick a rule to override its default; untick to go back to it. Relics, heroes and cards can still change them for one player with MODIFY_RULE." })),
    h("div", { class: "admin-middle" }, h("strong", { text: "Game rules" }), renderRows(RULE_ROWS, rules, env)),
    h("div", { class: "admin-right" }, h("h3", { text: "In effect" }), h("table", { class: "admin-table" }, ...Object.keys(RULE_DEFAULTS).map((k) => h("tr", null, h("td", { text: k }), h("td", { class: rules[k] !== undefined ? "rule-changed" : "muted", text: String(rules[k] ?? RULE_DEFAULTS[k]) }))))),
  );
}

/** What each sound slot is for (shown in the Sounds tab). */
const SLOT_INFO: Record<string, [group: string, label: string]> = {
  buy: ["Tavern", "Buy a unit"], buyGear: ["Tavern", "Buy a Gear"], sell: ["Tavern", "Sell"], refresh: ["Tavern", "Refresh"], freeze: ["Tavern", "Freeze"], upgrade: ["Tavern", "Upgrade the tavern"], denied: ["Tavern", "Not allowed / not enough Energy"],
  play: ["Board", "Play a unit (Deploy)"], gear: ["Board", "Use a Gear"], triple: ["Board", "Triple (Golden)"], combine: ["Board", "Gattai / Combine"], transform: ["Board", "Transform (Henshin, Final Form)"], discover: ["Board", "Pick a Discover card"], relic: ["Board", "Pick a Relic"], heroPower: ["Board", "Hero Power"], discard: ["Board", "A card is discarded"],
  attack: ["Fight", "Attack"], hit: ["Fight", "Hit"], barrier: ["Fight", "Barrier breaks"], death: ["Fight", "A unit dies"], summon: ["Fight", "Summon"], kyodaika: ["Fight", "Kyodaika"], giant: ["Fight", "Giant Robo enters"], rollcall: ["Fight", "Roll Call"],
  roundWin: ["Results", "Fight won"], roundLose: ["Results", "Fight lost"], eliminated: ["Results", "Knocked out"], endWin: ["Results", "Match won (1st)"], endTop4: ["Results", "Match: top 4"], endOther: ["Results", "Match: 5th-8th"],
  turnStart: ["General", "A turn starts"], timeLow: ["General", "5 seconds left"], click: ["General", "Button click (only with a file)"],
};
const MUSIC_INFO: Record<string, string> = { lobby: "Lobby", recruit: "Recruit phase (and hero select)", battle: "Battle phase", endWin: "End of match: won", endLose: "End of match: not won" };

/** The Sounds tab: a file, a volume and a preview for every game moment and every music slot. */
function soundsBody(ctx: Ctx): HTMLElement {
  const d = data() as unknown as Record<string, any>;
  const sounds = (d.sounds ??= { slots: {}, music: {} }) as { slots: Record<string, { file: string; volume: number }>; music: Record<string, { file: string; volume: number }> };
  sounds.slots ??= {};
  sounds.music ??= {};
  const row = (map: Record<string, { file: string; volume: number }>, key: string, label: string, builtIn: boolean): HTMLElement => {
    const ref = map[key];
    const pickFile = h("input", { type: "file", attrs: { accept: "audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" } }) as HTMLInputElement;
    pickFile.addEventListener("change", () => {
      const file = pickFile.files?.[0];
      if (file) void uploadImage(ctx, file).then((name) => ((map[key] = { file: name, volume: map[key]?.volume ?? 1 }), (ed.dirty = true), redraw()), () => undefined);
    });
    const vol = h("input", { type: "range", value: String(Math.round((ref?.volume ?? 1) * 100)), attrs: { min: "0", max: "100" }, disabled: !ref }) as HTMLInputElement;
    vol.addEventListener("change", () => {
      if (!map[key]) return;
      map[key].volume = Number(vol.value) / 100;
      setDirty();
    });
    return h(
      "tr",
      null,
      h("td", { text: label }),
      h("td", { class: ref ? "" : "muted", text: ref ? ref.file : builtIn ? "built-in" : "none" }),
      h("td", null, pickFile),
      h("td", null, vol),
      h("td", null,
        h("button", { class: "mini", text: "▶", title: "Listen", disabled: !ref && !builtIn, on: { click: () => (ref ? preview(ref.file, ref.volume) : play(key)) } }),
        ref && h("button", { class: "mini danger", text: "✕", title: "Back to the built-in sound", on: { click: () => (delete map[key], (ed.dirty = true), redraw()) } })),
    );
  };
  const groups = [...new Set(Object.values(SLOT_INFO).map(([g]) => g))];
  return h(
    "div",
    { class: "admin-body sounds-body" },
    h("div", { class: "admin-left" }, rulesTabs(), h("p", { class: "muted small", text: "Upload MP3, OGG or WAV (up to 6 MB each; keep effects short, about 1-2 seconds). A slot without a file plays the built-in sound. Cards and factions can have their own sounds (\"sounds\" in their form), which win over these. Save the draft and publish to use them in matches." })),
    h(
      "div",
      { class: "admin-middle sounds-middle" },
      ...groups.map((g) =>
        h("div", { class: "panel" }, h("h3", { text: g }), h("table", { class: "admin-table sounds-table" }, h("tr", null, ...["Moment", "File", "Upload", "Volume", ""].map((t) => h("th", { text: t }))), ...SOUND_SLOTS.filter((k) => SLOT_INFO[k]?.[0] === g).map((k) => row(sounds.slots, k, SLOT_INFO[k]?.[1] ?? k, !!CUES[k])))),
      ),
      h("div", { class: "panel" }, h("h3", { text: "Music (loops)" }), h("table", { class: "admin-table sounds-table" }, h("tr", null, ...["Where", "File", "Upload", "Volume", ""].map((t) => h("th", { text: t }))), ...MUSIC_SLOTS.map((k) => row(sounds.music, k, MUSIC_INFO[k] ?? k, false)))),
    ),
  );
}

function rulesTabs(): HTMLElement {
  return h("div", { class: "admin-tabs" }, ...ENTITIES.map((e) => h("button", { class: `tab ${e.kind === ed.kind ? "active" : ""}`, text: `${e.label} (${list(e.kind).length})`, on: { click: () => ((ed.kind = e.kind), (ed.index = undefined), redraw()) } })), h("button", { class: `tab ${ed.kind === "rules" ? "active" : ""}`, text: "Rules", on: { click: () => ((ed.kind = "rules"), (ed.index = undefined), redraw()) } }), h("button", { class: `tab ${ed.kind === "sounds" ? "active" : ""}`, text: "Sounds", on: { click: () => ((ed.kind = "sounds"), (ed.index = undefined), redraw()) } }));
}

function editorBody(ctx: Ctx, refs: (k: RefKind) => string[]): HTMLElement {
  if (ed.kind === "rules") return rulesBody(refs);
  if (ed.kind === "sounds") return soundsBody(ctx);
  const kind: EntityKind = ed.kind;
  const info = entityInfo(kind);
  const items = list(kind);

  const tabs = rulesTabs();
  const search = h("input", { type: "text", placeholder: "Search...", value: ed.query });
  search.addEventListener("input", () => {
    ed.query = search.value;
    fillList();
  });
  const listEl = h("div", { class: "admin-list" });
  const f = ed.filter;
  const passes = (it: Record<string, any>): boolean => {
    if (kind !== "cards") return true;
    const kindOf = it.kind === "GEAR" ? "GEAR" : it.kind === "GIANT" ? "GIANT" : it.token ? "TOKEN" : "UNIT";
    const factions: string[] = it.factions ?? [];
    const kws: string[] = it.keywords ?? [];
    return (
      (!f.kind || kindOf === f.kind) &&
      (!f.faction || (f.faction === "_none" ? factions.length === 0 : factions.includes(f.faction))) &&
      (!f.rank || String(it.rank ?? 1) === f.rank) &&
      (!f.keyword || kws.includes(f.keyword) || JSON.stringify(it.effects ?? []).includes(`"${f.keyword}"`))
    );
  };
  // Factions, heroes and relics can be taken out of play straight from the list.
  const switchable = ed.kind === "factions" || ed.kind === "heroes" || ed.kind === "relics";
  const playToggle = (it: Record<string, any>): HTMLElement =>
    h("span", {
      class: `play-toggle ${it.enabled === false ? "" : "on"}`,
      text: it.enabled === false ? "○" : "●",
      title: it.enabled === false ? "Off - click to put it in play" : "In play - click to take it out",
      on: {
        click: (e) => {
          e.stopPropagation();
          if (it.enabled === false) delete it.enabled;
          else it.enabled = false;
          setDirty();
          redraw();
        },
      },
    });
  const fillList = (): void => {
    const q = ed.query.toLowerCase();
    listEl.replaceChildren(
      ...items
        .map((it, i) => ({ it, i }))
        .sort((a, b) => byName(a.it, b.it))
        .filter(({ it }) => passes(it))
        .filter(({ it }) => !q || `${it.key} ${it.name} ${it.text ?? ""} ${it.textTh ?? ""}`.toLowerCase().includes(q))
        .map(({ it, i }) =>
          h(
            "button",
            { class: `admin-item ${i === ed.index ? "active" : ""} ${it.enabled === false ? "admin-off" : ""}`, on: { click: () => ((ed.index = i), redraw()) } },
            switchable && playToggle(it),
            h("strong", { text: String(it.name ?? it.key) }),
            h("span", { class: "muted", text: ` ${it.key ?? ""}${typeof it.rank === "number" ? ` · rank ${it.rank}` : ""}${it.enabled === false ? " · off" : ""}` }),
          ),
        ),
    );
    if (listEl.childElementCount === 0) listEl.append(h("p", { class: "muted", text: "Nothing here." }));
  };
  fillList();

  const add = h("button", { class: "btn", text: `+ New ${info.singular}`, disabled: ed.busy, on: { click: () => newEntity(ctx) } });
  const sel = (key: keyof EditorState["filter"], options: [string, string][]): HTMLElement => {
    const el = h("select", null, ...options.map(([v, label]) => h("option", { value: v, text: label, selected: f[key] === v }))) as HTMLSelectElement;
    el.addEventListener("change", () => {
      f[key] = el.value;
      fillList();
    });
    return el;
  };
  const filters =
    kind === "cards" &&
    h(
      "div",
      { class: "admin-filters" },
      sel("kind", [["", "All kinds"], ["UNIT", "Units (shop)"], ["TOKEN", "Tokens"], ["GEAR", "Gear"], ["GIANT", "Giants"]]),
      sel("faction", [["", "All factions"], ...list("factions").map((x) => [String(x.key), String(x.name ?? x.key)] as [string, string]), ["_none", "Neutral"]]),
      sel("rank", [["", "All ranks"], ...[1, 2, 3, 4, 5, 6].map((r) => [String(r), `Rank ${r}`] as [string, string])]),
      sel("keyword", [["", "Any keyword/trigger"], ...[...KEYWORDS, ...TRIGGERS].map((k) => [k, k] as [string, string])]),
      h("button", { class: "mini", text: "Clear", on: { click: () => ((ed.filter = { kind: "", faction: "", rank: "", keyword: "" }), (ed.query = ""), redraw()) } }),
    );
  const left = h("div", { class: "admin-left" }, tabs, search, filters, add, listEl);

  const entity = ed.index !== undefined ? items[ed.index] : undefined;
  const middle = h("div", { class: "admin-middle" }, entity ? entityEditor(ctx, entity, refs) : h("p", { class: "muted", text: `Pick a ${info.singular} on the left, or create a new one.` }));
  previewEl = h("div", { class: "admin-right" });
  updatePreview();
  return h("div", { class: "admin-body" }, left, middle, previewEl);
}

function newEntity(_ctx: Ctx): void {
  if (ed.kind === "rules" || ed.kind === "sounds") return;
  const info = entityInfo(kindNow());
  const key = window.prompt(`Key for the new ${info.singular} (letters, digits, _ ; cannot change meaning later)`, "")?.trim();
  if (!key) return;
  if (list(kindNow()).some((x) => x.key === key)) return live?.toast(`There is already a ${info.singular} "${key}"`, "error");
  list(kindNow()).push(info.make(key));
  ed.index = list(kindNow()).length - 1;
  ed.dirty = true;
  redraw();
}

function entityEditor(ctx: Ctx, entity: Record<string, any>, refs: (k: RefKind) => string[]): HTMLElement {
  const info = entityInfo(kindNow());
  // Empty rules text is generated by the server on save: show what it made (both languages) in the empty fields.
  const made = generatedText(entity);
  const env: FormEnv = {
    refs,
    changed: setDirty,
    upload: (file) => uploadImage(ctx, file),
    placeholder: (obj, key) => (obj === entity && (key === "text" || key === "textTh") ? made?.[key] || undefined : undefined),
  };

  const mode = h(
    "div",
    { class: "row" },
    h("strong", { text: String(entity.name ?? entity.key ?? "") }),
    h("span", { class: "spacer" }),
    h("button", { class: `btn ${ed.raw ? "" : "on"}`, text: "Form", on: { click: () => ((ed.raw = false), redraw()) } }),
    h("button", { class: `btn ${ed.raw ? "on" : ""}`, text: "JSON", on: { click: () => ((ed.raw = true), redraw()) } }),
    h("button", { class: "btn", text: "Duplicate", on: { click: () => duplicate(entity) } }),
    h("button", { class: "btn danger", text: "Delete", on: { click: () => remove() } }),
  );

  let body: HTMLElement;
  if (ed.raw) {
    const area = h("textarea", { class: "json-area", value: JSON.stringify(entity, null, 2), attrs: { spellcheck: "false", rows: "24" } });
    const msg = h("span", { class: "muted" });
    const apply = h("button", { class: "btn primary", text: "Apply JSON", on: { click: () => applyJson(area, msg, ctx) } });
    body = h("div", null, area, h("div", { class: "row" }, apply, msg));
  } else {
    body = renderRows(info.rows, entity, env);
  }
  return h("div", null, mode, body);
}

const MAX_IMAGE_BYTES = 14_900_000;
const MAX_AUDIO_BYTES = 5_900_000;

/** Send a picked image or sound to the server and return the stored file name. */
async function uploadImage(ctx: Ctx, file: File): Promise<string> {
  const audio = file.type.startsWith("audio/") || /\.(mp3|ogg|wav)$/i.test(file.name);
  const limit = audio ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    ctx.toast(`That ${audio ? "sound" : "image"} is ${Math.round(file.size / 1000)} KB; the limit is about ${Math.round(limit / 1000)} KB`, "error");
    throw new Error("too large");
  }
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("could not read the file"));
    r.readAsDataURL(file);
  });
  try {
    const saved = await ctx.api.adminUpload(token(ctx), data);
    ctx.toast(`Uploaded ${file.name}`);
    return saved.file;
  } catch (e) {
    ctx.toast(userMessage(e, "admin upload", "upload failed"), "error");
    throw e;
  }
}

function applyJson(area: HTMLTextAreaElement, msg: HTMLElement, ctx: Ctx): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(area.value);
  } catch (e) {
    msg.textContent = `Not valid JSON: ${e instanceof Error ? e.message : ""}`;
    return;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    msg.textContent = "Expected a JSON object";
    return;
  }
  list(kindNow())[ed.index as number] = parsed;
  ed.dirty = true;
  ctx.toast("JSON applied. Save the draft to check it.");
  redraw();
}

function duplicate(entity: Record<string, any>): void {
  const copy = structuredClone(entity);
  let key = `${entity.key}_copy`;
  for (let n = 2; list(kindNow()).some((x) => x.key === key); n++) key = `${entity.key}_copy${n}`;
  copy.key = key;
  if (typeof copy.name === "string") copy.name = `${copy.name} (copy)`;
  list(kindNow()).push(copy);
  ed.index = list(kindNow()).length - 1;
  ed.dirty = true;
  redraw();
}

function remove(): void {
  const items = list(kindNow());
  const it = items[ed.index as number];
  if (!it || !window.confirm(`Delete "${it.name ?? it.key}"? Anything that refers to it will show up as a problem.`)) return;
  items.splice(ed.index as number, 1);
  ed.index = undefined;
  ed.dirty = true;
  redraw();
}

// ----------------------------------------------------------------- live preview

/** The rules text the server generated for this entry at the last save (empty when it has none yet). */
function generatedText(entity: Record<string, any>): { text?: string; textTh?: string } | undefined {
  const snap = (ed.draft as AdminDraft | undefined)?.snapshot as Record<string, { key: string; text?: string; textTh?: string }[]> | undefined;
  return snap?.[kindNow()]?.find((x) => x.key === entity.key);
}

/** The draft as players would see it: the saved snapshot (which has generated rules text) with local edits laid over it. */
function localIndex(ctx: Ctx): ContentIndex {
  const d = ed.draft as AdminDraft;
  const base: ContentSnapshot = d.snapshot ?? ctx.ix.snapshot;
  type Texts = { key: string; text?: string; textTh?: string };
  const generated = (arr: Texts[], key: string): Texts | undefined => arr.find((x) => x.key === key);
  // Written text wins; otherwise the server-generated one (both languages) from the last save.
  const fill = <T extends Texts>(items: T[], from: Texts[]): T[] =>
    items.map((x) => (x.text ? x : { ...x, text: generated(from, x.key)?.text ?? "", textTh: x.textTh || (generated(from, x.key)?.textTh ?? "") }));
  const cards = (data().cards ?? []).map((c: any) => ({ kind: "UNIT", factions: [], colors: [], keywords: [], effects: [], token: false, text: "", ...c }));
  return new ContentIndex({
    ...base,
    factions: (data().factions ?? []).map((f: any) => ({ color: "#888888", text: "", ...f })),
    series: (data().series ?? []) as never,
    gauges: (data().gauges ?? []) as never,
    cards: fill(cards, base.cards) as never,
    relics: fill((data().relics ?? []).map((r: any) => ({ factions: [], effects: [], text: "", ...r })), base.relics) as never,
    heroes: fill((data().heroes ?? []).map((x: any) => ({ armor: 0, text: "", ...x })), base.heroes) as never,
  });
}

function updatePreview(): void {
  if (!previewEl || !live) return;
  const entity = ed.index !== undefined ? list(kindNow())[ed.index] : undefined;
  if (!entity) return mount(previewEl);
  const ix = localIndex(live);
  const note = h("p", { class: "muted small", text: "Rules text made from the effects updates when you save the draft." });
  if (ed.kind === "cards") {
    const cards = h("div", { class: "crop-scope" }, cardEl(ix, { key: String(entity.key) }), h("div", { class: "preview-small" }, cardEl(ix, { key: String(entity.key), small: true })));
    // A card with a picture can be framed: drag / scroll on the big card, or the sliders.
    const framing =
      entity.art &&
      artCropTools(cards, entity.artCrop, (c) => {
        if (c) entity.artCrop = c;
        else delete entity.artCrop;
        setDirty();
        redraw(); // the form's "picture framing" numbers follow
      });
    // What its keywords, and the keywords it gives, mean: the same boxes players see when they point at the card.
    const def = ix.card(String(entity.key));
    const kwInfo = def ? keywordBoxes(def.keywords, grantedKeywords(def), def.factions) : [];
    const kwEl = kwInfo.length > 0 ? h("div", { class: "kw-boxes admin-kw-boxes" }, ...kwInfo) : null;
    return mount(previewEl, h("h3", { text: "Preview" }), cards, kwEl, framing, note);
  }
  // A hero or relic picture is framed like a card's: on the big picture, with the small ones following.
  const framed = (pics: HTMLElement, extra: HTMLElement | false): void => {
    const framing =
      entity.art &&
      artCropTools(pics, entity.artCrop, (c) => {
        if (c) entity.artCrop = c;
        else delete entity.artCrop;
        setDirty();
        redraw();
      });
    mount(previewEl as HTMLElement, h("h3", { text: "Preview" }), pics, extra, framing, note);
  };
  const key = String(entity.key);
  const name = String(entity.name ?? "");
  // The admin checks both languages, so the preview shows the Thai text under the English one.
  const bothLanguages = (x: { text?: string; textTh?: string } | undefined, none: string): (HTMLElement | false)[] => [
    h("p", { text: x?.text || none }),
    !!x?.textTh && x.textTh !== x.text && h("p", { class: "muted", text: x.textTh }),
  ];
  const off = entity.enabled === false && h("p", { class: "muted", text: "Off: not in play" });
  if (ed.kind === "heroes") {
    const seriesName = entity.series ? String(list("series").find((s) => s.key === entity.series)?.name ?? entity.series) : "";
    const pics = h(
      "div",
      { class: "crop-scope" },
      h("div", { class: "info-card" }, artBox("hero-art", ix.heroArt(key), name, entity.artCrop), h("h3", { text: name }), seriesName && h("p", { class: "muted", text: seriesName }), ...bothLanguages(ix.heroes.get(key), "No hero power."), Number(entity.armor) > 0 && h("p", { class: "muted", text: `${entity.armor} armor` })),
      h("div", { class: "row" }, artBox("pc-portrait", ix.heroArt(key), name, entity.artCrop), artBox("portrait", ix.heroArt(key), name, entity.artCrop)),
    );
    return framed(pics, off);
  }
  if (ed.kind === "relics") {
    const r = ix.relics.get(key);
    const pics = h(
      "div",
      { class: "crop-scope" },
      h("div", { class: "info-card" }, artBox("relic-art", ix.relicArt(key), name, entity.artCrop), h("h3", { text: name }), h("p", { class: "muted", text: `${entity.tier === "GREATER" ? "Greater" : "Lesser"} relic - ${entity.cost} Energy` }), ...bothLanguages(r, "")),
      h("div", { class: "row" }, artBox("relic-thumb", ix.relicArt(key), name, entity.artCrop)),
    );
    return framed(pics, off);
  }
  if (ed.kind === "factions") return mount(previewEl, h("h3", { text: "Preview" }), h("span", { class: "chip", style: `--c:${String(entity.color ?? "#888")}`, text: String(entity.name ?? entity.key) }));
  mount(previewEl);
}

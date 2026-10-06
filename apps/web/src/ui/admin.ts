import { ContentIndex } from "../content-index.js";
import { ApiError } from "../net.js";
import type { AdminDraft, AuditEntry, ContentSnapshot, SimRow, SimulationReport, VersionMeta } from "../protocol.js";
import { ENTITIES, entityInfo, type EntityKind, type RefKind } from "./admin-schema.js";
import { cardEl } from "./card.js";
import type { Ctx } from "./ctx.js";
import { h, mount } from "./dom.js";
import { renderRows, type FormEnv } from "./form.js";

/**
 * The content editor. Everything the admin changes lives in `ed.draft.data` (the same JSON the server stores);
 * nothing reaches players until the draft is saved and then published as a new version.
 */
interface EditorState {
  draft?: AdminDraft;
  loading: boolean;
  loadError?: string;
  kind: EntityKind;
  /** Position in the list of that kind (not the key, which can be edited). */
  index?: number;
  query: string;
  dirty: boolean;
  busy: boolean;
  raw: boolean;
  panel: "edit" | "versions" | "audit" | "simulate";
  sim?: SimulationReport;
  simMatches: number;
  simTarget: "draft" | "published";
  versions?: { current: number; versions: VersionMeta[] };
  audit?: AuditEntry[];
  /** Problems from the last failed publish (the draft's own issues are in draft.issues). */
  publishIssues: string[];
}

const ed: EditorState = { loading: false, kind: "cards", query: "", dirty: false, busy: false, raw: false, panel: "edit", publishIssues: [], simMatches: 60, simTarget: "draft" };

/** The element the screen was last drawn into: the app redraws and replaces it, so async work must not hold on to an old one. */
let host: HTMLElement | undefined;
let live: Ctx | undefined;
let statusEl: HTMLElement | undefined;
let previewEl: HTMLElement | undefined;

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

function redraw(): void {
  if (host && live) renderAdmin(host, live);
}

async function guarded<T>(ctx: Ctx, work: () => Promise<T>): Promise<T | undefined> {
  if (ed.busy) return undefined;
  ed.busy = true;
  redraw();
  try {
    return await work();
  } catch (e) {
    if (e instanceof ApiError && e.issues.length > 0) ed.publishIssues = e.issues;
    ctx.toast(e instanceof Error ? e.message : "something went wrong", "error");
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
    ed.loadError = e instanceof Error ? e.message : "could not load the draft";
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
  const datalists = (["cards", "factions", "series", "gauges", "heroes", "relics"] as RefKind[]).map((k) => h("datalist", { id: `dl-${k}` }, ...refs(k).map((v) => h("option", { value: v }))));

  const panel =
    ed.panel === "versions" ? versionsPanel(ctx) : ed.panel === "audit" ? auditPanel() : ed.panel === "simulate" ? simulatePanel(ctx) : editorBody(ctx, refs);

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
    b("Save draft", () => void save(ctx), { primary: ed.dirty, off: !ed.dirty && d.saved, title: "Check the draft and keep it for later. Players do not see it yet." }),
    b("Publish", () => void publish(ctx), { title: "Make the draft the content new matches use. Matches already running are not affected." }),
    b("Discard draft", () => void discard(ctx), { danger: true, off: !d.saved && !ed.dirty }),
    b("Versions", () => void showVersions(ctx)),
    b("Simulate", () => ((ed.panel = "simulate"), redraw()), { title: "Play bot matches on the content and see what stands out" }),
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

// ----------------------------------------------------------------- simulation

async function runSimulation(ctx: Ctx): Promise<void> {
  // The server simulates the saved draft, so save pending edits first.
  if (ed.simTarget === "draft" && ed.dirty && !(await save(ctx))) return;
  const r = await guarded(ctx, () => ctx.api.adminSimulate(token(ctx), ed.simMatches, ed.simTarget));
  if (r) {
    ed.sim = r;
    redraw(); // guarded() already redrew, before the result was stored
  }
}

function simTable(title: string, rows: SimRow[], expected: number, limit = 15): HTMLElement {
  const shown = rows.slice(0, limit);
  return h(
    "div",
    { class: "panel sim-table" },
    h("h3", { text: title }),
    shown.length === 0 ? h("p", { class: "muted", text: "Nothing to show." }) : h("table", { class: "admin-table" }, h("tr", null, ...["", "Seen", "Avg place", "Win %"].map((t) => h("th", { text: t }))), ...shown.map((r) => h("tr", { class: r.avgPlacement <= expected - 0.7 ? "sim-good" : r.avgPlacement >= expected + 0.7 ? "sim-bad" : "" }, h("td", { text: r.name }), h("td", { text: String(r.count) }), h("td", { text: r.avgPlacement.toFixed(2) }), h("td", { text: `${(r.winRate * 100).toFixed(0)}%` })))),
  );
}

function simulatePanel(ctx: Ctx): HTMLElement {
  const matches = h("input", { type: "number", value: String(ed.simMatches), attrs: { min: "1", max: "300" } });
  matches.addEventListener("input", () => (ed.simMatches = Math.max(1, Math.min(300, Math.trunc(matches.valueAsNumber) || 1))));
  const target = h("select", null, h("option", { value: "draft", text: "the draft", selected: ed.simTarget === "draft" }), h("option", { value: "published", text: "what is published", selected: ed.simTarget === "published" }));
  target.addEventListener("change", () => (ed.simTarget = target.value as "draft" | "published"));
  const r = ed.sim;
  const cards = r ? r.cards.filter((c) => c.count >= Math.max(3, r.matches / 4)) : [];
  return h(
    "div",
    null,
    h("div", { class: "panel" }, h("h3", { text: "Sandbox: bots play full matches" }), h("p", { class: "muted", text: "Eight bots per match. Read it as 'does anything stand out' rather than a verdict: the bots play simply. Green = places well, red = places badly, against the average." }), h("div", { class: "row" }, matches, "matches on", target, h("button", { class: "btn primary", text: ed.busy ? "Running..." : "Run", disabled: ed.busy, on: { click: () => void runSimulation(ctx) } }))),
    r &&
      h(
        "div",
        { class: "sim-grid" },
        h("div", { class: "panel" }, h("strong", { text: `${r.matches} of ${r.requested} matches` }), h("p", { class: "muted", text: `Average place ${r.expected}. Average length ${r.avgTurns} turns (${r.target}).` }), r.neverUsed.length > 0 && h("p", { text: `Never on a final board: ${r.neverUsed.map(ctx.ix.cardName).join(", ")}` })),
        simTable("Heroes", r.heroes, r.expected),
        simTable("Factions (3+ units on the final board)", r.factions, r.expected),
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

function editorBody(ctx: Ctx, refs: (k: RefKind) => string[]): HTMLElement {
  const info = entityInfo(ed.kind);
  const items = list(ed.kind);

  const tabs = h("div", { class: "admin-tabs" }, ...ENTITIES.map((e) => h("button", { class: `tab ${e.kind === ed.kind ? "active" : ""}`, text: `${e.label} (${list(e.kind).length})`, on: { click: () => ((ed.kind = e.kind), (ed.index = undefined), redraw()) } })));
  const search = h("input", { type: "text", placeholder: "Search...", value: ed.query });
  search.addEventListener("input", () => {
    ed.query = search.value;
    fillList();
  });
  const listEl = h("div", { class: "admin-list" });
  const fillList = (): void => {
    const q = ed.query.toLowerCase();
    listEl.replaceChildren(
      ...items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => !q || `${it.key} ${it.name}`.toLowerCase().includes(q))
        .map(({ it, i }) => h("button", { class: `admin-item ${i === ed.index ? "active" : ""}`, on: { click: () => ((ed.index = i), redraw()) } }, h("strong", { text: String(it.name ?? it.key) }), h("span", { class: "muted", text: ` ${it.key ?? ""}${typeof it.rank === "number" ? ` · rank ${it.rank}` : ""}` }))),
    );
    if (listEl.childElementCount === 0) listEl.append(h("p", { class: "muted", text: "Nothing here." }));
  };
  fillList();

  const add = h("button", { class: "btn", text: `+ New ${info.singular}`, disabled: ed.busy, on: { click: () => newEntity(ctx) } });
  const left = h("div", { class: "admin-left" }, tabs, search, add, listEl);

  const entity = ed.index !== undefined ? items[ed.index] : undefined;
  const middle = h("div", { class: "admin-middle" }, entity ? entityEditor(ctx, entity, refs) : h("p", { class: "muted", text: `Pick a ${info.singular} on the left, or create a new one.` }));
  previewEl = h("div", { class: "admin-right" });
  updatePreview();
  return h("div", { class: "admin-body" }, left, middle, previewEl);
}

function newEntity(_ctx: Ctx): void {
  const info = entityInfo(ed.kind);
  const key = window.prompt(`Key for the new ${info.singular} (letters, digits, _ ; cannot change meaning later)`, "")?.trim();
  if (!key) return;
  if (list(ed.kind).some((x) => x.key === key)) return live?.toast(`There is already a ${info.singular} "${key}"`, "error");
  list(ed.kind).push(info.make(key));
  ed.index = list(ed.kind).length - 1;
  ed.dirty = true;
  redraw();
}

function entityEditor(ctx: Ctx, entity: Record<string, any>, refs: (k: RefKind) => string[]): HTMLElement {
  const info = entityInfo(ed.kind);
  const env: FormEnv = { refs, changed: setDirty };

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
  list(ed.kind)[ed.index as number] = parsed;
  ed.dirty = true;
  ctx.toast("JSON applied. Save the draft to check it.");
  redraw();
}

function duplicate(entity: Record<string, any>): void {
  const copy = structuredClone(entity);
  let key = `${entity.key}_copy`;
  for (let n = 2; list(ed.kind).some((x) => x.key === key); n++) key = `${entity.key}_copy${n}`;
  copy.key = key;
  if (typeof copy.name === "string") copy.name = `${copy.name} (copy)`;
  list(ed.kind).push(copy);
  ed.index = list(ed.kind).length - 1;
  ed.dirty = true;
  redraw();
}

function remove(): void {
  const items = list(ed.kind);
  const it = items[ed.index as number];
  if (!it || !window.confirm(`Delete "${it.name ?? it.key}"? Anything that refers to it will show up as a problem.`)) return;
  items.splice(ed.index as number, 1);
  ed.index = undefined;
  ed.dirty = true;
  redraw();
}

// ----------------------------------------------------------------- live preview

/** The draft as players would see it: the saved snapshot (which has generated rules text) with local edits laid over it. */
function localIndex(ctx: Ctx): ContentIndex {
  const d = ed.draft as AdminDraft;
  const base: ContentSnapshot = d.snapshot ?? ctx.ix.snapshot;
  const generated = (arr: { key: string; text?: string }[], key: string): string => arr.find((x) => x.key === key)?.text ?? "";
  const fill = <T extends { key: string; text?: string }>(items: T[], from: { key: string; text?: string }[]): T[] => items.map((x) => ({ ...x, text: x.text || generated(from, x.key) }));
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
  const entity = ed.index !== undefined ? list(ed.kind)[ed.index] : undefined;
  if (!entity) return mount(previewEl);
  const ix = localIndex(live);
  const note = h("p", { class: "muted small", text: "Rules text made from the effects updates when you save the draft." });
  if (ed.kind === "cards") {
    return mount(previewEl, h("h3", { text: "Preview" }), cardEl(ix, { key: String(entity.key) }), h("div", { class: "preview-small" }, cardEl(ix, { key: String(entity.key), small: true })), note);
  }
  if (ed.kind === "heroes") return mount(previewEl, h("h3", { text: "Preview" }), h("div", { class: "info-card" }, h("h3", { text: String(entity.name ?? "") }), h("p", { text: ix.heroes.get(String(entity.key))?.text || "No hero power." }), Number(entity.armor) > 0 && h("p", { class: "muted", text: `${entity.armor} armor` })), note);
  if (ed.kind === "relics") {
    const r = ix.relics.get(String(entity.key));
    return mount(previewEl, h("h3", { text: "Preview" }), h("div", { class: "info-card" }, h("h3", { text: String(entity.name ?? "") }), h("p", { class: "muted", text: `${entity.tier === "GREATER" ? "Greater" : "Lesser"} relic - ${entity.cost} Energy` }), h("p", { text: r?.text ?? "" })), note);
  }
  if (ed.kind === "factions") return mount(previewEl, h("h3", { text: "Preview" }), h("span", { class: "chip", style: `--c:${String(entity.color ?? "#888")}`, text: String(entity.name ?? entity.key) }));
  mount(previewEl);
}

import { formatClock } from "../clock.js";
import type { PracticeOptions } from "../protocol.js";
import { h, mount } from "./dom.js";
import type { Ctx } from "./ctx.js";

/** Remembered between visits so a tester does not re-enter the same setup each game. */
interface PracticeForm {
  factions: string[];
  bots: number;
  speed: "normal" | "fast";
}

const KEY = "herotime.practice";

function loadForm(): PracticeForm {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<PracticeForm> | null;
    return { factions: raw?.factions ?? [], bots: raw?.bots ?? 7, speed: raw?.speed === "normal" ? "normal" : "fast" };
  } catch {
    return { factions: [], bots: 7, speed: "fast" };
  }
}

const saveForm = (f: PracticeForm): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    // private mode: the form just will not be remembered
  }
};

export const toPracticeOptions = (f: PracticeForm): PracticeOptions => ({
  ...(f.factions.length > 0 ? { factions: f.factions } : {}),
  bots: f.bots,
  speed: f.speed,
});

export function renderLobby(root: HTMLElement, ctx: Ctx): void {
  const { ix, store } = ctx;
  const state = store.state;
  const form = loadForm();

  const factionBoxes = [...ix.factions.values()].map((f) => {
    const box = h("input", { type: "checkbox", checked: form.factions.includes(f.key), attrs: { "data-faction": f.key } });
    box.addEventListener("change", () => {
      form.factions = [...root.querySelectorAll<HTMLInputElement>("input[data-faction]")].filter((b) => b.checked).map((b) => b.dataset.faction as string);
      saveForm(form);
    });
    return h("label", { class: "faction-pick", title: f.text, style: `--c:${f.color}` }, box, h("span", { class: "swatch" }), f.name);
  });

  const bots = h("select", { on: { change: (e) => ((form.bots = Number((e.target as HTMLSelectElement).value)), saveForm(form)) } }, ...[1, 2, 3, 4, 5, 6, 7].map((n) => h("option", { value: String(n), text: `${n} bot${n > 1 ? "s" : ""}`, selected: n === form.bots })));
  const speed = h(
    "select",
    { on: { change: (e) => ((form.speed = (e.target as HTMLSelectElement).value as "normal" | "fast"), saveForm(form)) } },
    h("option", { value: "fast", text: "Fast (about 1 min per game)", selected: form.speed === "fast" }),
    h("option", { value: "normal", text: "Normal (20-30 min)", selected: form.speed === "normal" }),
  );

  const status = state.status;
  const queueBox =
    status.state === "queued"
      ? h(
          "div",
          { class: "queue-box" },
          h("p", { text: `Waiting for players: ${status.waiting}/${status.matchSize}` }),
          h("p", { class: "muted", id: "fill-countdown", data: { fillAt: String(status.fillAt ?? "") }, text: status.fillAt ? `Bots join in ${formatClock(ctx.clock.remaining(status.fillAt))}` : "" }),
          h("button", { class: "btn", text: "Leave queue", on: { click: () => void ctx.leaveQueue() } }),
        )
      : h("button", { class: "btn", text: "Join the queue", on: { click: () => void ctx.joinQueue() } });

  mount(
    root,
    h(
      "div",
      { class: "lobby" },
      h(
        "div",
        { class: "panel" },
        h("h2", { text: "Practice (solo vs bots)" }),
        h("p", { class: "muted", text: "Start right now. Tick factions to force a matchup, or leave them all empty for the normal random 5." }),
        h("div", { class: "faction-picks" }, ...factionBoxes),
        h("div", { class: "row" }, bots, speed),
        h("button", { class: "btn primary big", text: "Start practice", on: { click: () => void ctx.startPractice(toPracticeOptions(form)) } }),
      ),
      h("div", { class: "panel" }, h("h2", { text: "Matchmaking" }), h("p", { class: "muted", text: "Join with other players. Empty seats are filled with bots after a short wait." }), queueBox),
      h(
        "div",
        { class: "panel" },
        h("h2", { text: "About this build" }),
        h("p", { class: "muted", text: `Content set: ${ix.snapshot.set} (v${ix.snapshot.version}) - ${ix.cards.size} cards, ${ix.heroes.size} heroes, ${ix.relics.size} relics, ${ix.factions.size} factions.` }),
        h("p", { class: "muted", text: "Everything is a prototype: numbers are first guesses. Press D in a match for the debug panel; copy the report if something looks wrong." }),
      ),
    ),
  );
}

import { formatClock } from "../clock.js";
import { ordinal } from "../format.js";
import type { LeaderboardRow, MyMatch, PracticeOptions } from "../protocol.js";
import { h, mount } from "./dom.js";
import type { Ctx } from "./ctx.js";

/** Remembered between visits so a tester does not re-enter the same setup each game. */
interface PracticeForm {
  factions: string[];
  bots: number;
  speed: "normal" | "fast";
}

const KEY = "herotime.practice";

/** History and leaderboard, fetched in the background and refreshed when the lobby is shown again after a while. */
const stats: { at: number; loading: boolean; user?: string; mine?: MyMatch[]; board?: { minGames: number; players: LeaderboardRow[] }; error?: string } = { at: 0, loading: false };
const STATS_TTL_MS = 15_000;

/** Forget the cached numbers (a match just finished, or someone else logged in). */
export function invalidateStats(): void {
  stats.at = 0;
}

function refreshStats(ctx: Ctx): void {
  const user = ctx.store.state.user?.id;
  const token = ctx.store.state.token;
  if (!user || !token || stats.loading) return;
  if (stats.user === user && Date.now() - stats.at < STATS_TTL_MS) return;
  stats.loading = true;
  Promise.all([ctx.api.myMatches(token), ctx.api.leaderboard()])
    .then(([mine, board]) => {
      Object.assign(stats, { user, mine: mine.matches, board, error: undefined });
    })
    .catch((e: unknown) => {
      stats.error = e instanceof Error ? e.message : "could not load";
      stats.user = user;
    })
    .finally(() => {
      stats.at = Date.now();
      stats.loading = false;
      if (ctx.store.state.screen === "lobby") ctx.store.set({}); // draw again with the numbers
    });
}

function historyPanel(ctx: Ctx): HTMLElement {
  const rows = stats.mine;
  return h(
    "div",
    { class: "panel" },
    h("h2", { text: "Your recent matches" }),
    stats.error && h("p", { class: "form-error", text: stats.error }),
    !rows ? h("p", { class: "muted", text: "Loading..." }) : rows.length === 0 ? h("p", { class: "muted", text: "No finished matches yet." }) :
      h("table", { class: "admin-table" }, h("tr", null, ...["Place", "Hero", "Mode", "When"].map((t) => h("th", { text: t }))),
        ...rows.map((m) => h("tr", { title: m.players.map((p) => `${ordinal(p.placement)} ${p.name}${p.isBot ? " (bot)" : ""}`).join("\n") },
          h("td", { class: m.placement === 1 ? "place-win" : "", text: m.placement ? ordinal(m.placement) : "-" }),
          h("td", { text: m.heroKey ? ctx.ix.heroName(m.heroKey) : "-" }),
          h("td", { text: m.mode === "practice" ? "practice" : "ranked" }),
          h("td", { class: "muted", text: new Date(m.endedAt).toLocaleString() })))),
  );
}

function leaderboardPanel(): HTMLElement {
  const b = stats.board;
  return h(
    "div",
    { class: "panel" },
    h("h2", { text: "Leaderboard" }),
    h("p", { class: "muted", text: `Matchmaking games only (practice never counts). At least ${b?.minGames ?? 3} games to appear. Lower average place is better.` }),
    !b ? h("p", { class: "muted", text: "Loading..." }) : b.players.length === 0 ? h("p", { class: "muted", text: "Nobody has enough ranked games yet." }) :
      h("table", { class: "admin-table" }, h("tr", null, ...["#", "Player", "Games", "Wins", "Top 4", "Avg place"].map((t) => h("th", { text: t }))),
        ...b.players.map((p) => h("tr", null, h("td", { text: String(p.rank) }), h("td", { text: p.username }), h("td", { text: String(p.games) }), h("td", { text: String(p.wins) }), h("td", { text: String(p.top4) }), h("td", { text: p.avgPlacement.toFixed(2) })))),
  );
}

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
      historyPanel(ctx),
      leaderboardPanel(),
    ),
  );
  refreshStats(ctx);
}

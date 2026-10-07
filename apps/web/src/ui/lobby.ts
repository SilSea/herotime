import { formatClock } from "../clock.js";
import { ordinal } from "../format.js";
import { tr } from "../i18n.js";
import type { LeaderboardRow, MyMatch, PracticeOptions } from "../protocol.js";
import { h, mount } from "./dom.js";
import type { Ctx } from "./ctx.js";

/** Remembered between visits so a tester does not re-enter the same setup each game. */
interface PracticeForm {
  factions: string[];
  bots: number;
  speed: "normal" | "fast" | "quick";
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
    h("h2", { text: tr("Your recent matches", "เกมล่าสุดของคุณ") }),
    stats.error && h("p", { class: "form-error", text: stats.error }),
    !rows ? h("p", { class: "muted", text: tr("Loading...", "กำลังโหลด...") }) : rows.length === 0 ? h("p", { class: "muted", text: tr("No finished matches yet.", "ยังไม่มีเกมที่เล่นจบ") }) :
      h("table", { class: "admin-table" }, h("tr", null, ...[tr("Place", "อันดับ"), "Hero", tr("Mode", "โหมด"), tr("When", "เมื่อ")].map((t) => h("th", { text: t }))),
        ...rows.map((m) => h("tr", { title: m.players.map((p) => `${ordinal(p.placement)} ${p.name}${p.isBot ? " (bot)" : ""}`).join("\n") },
          h("td", { class: m.placement === 1 ? "place-win" : "", text: m.placement ? ordinal(m.placement) : "-" }),
          h("td", { text: m.heroKey ? ctx.ix.heroName(m.heroKey) : "-" }),
          h("td", { text: m.mode === "practice" ? tr("practice", "ฝึกซ้อม") : m.mode === "quick" ? "quick" : tr("ranked", "จัดอันดับ") }),
          h("td", { class: "muted", text: new Date(m.endedAt).toLocaleString() })))),
  );
}

function leaderboardPanel(): HTMLElement {
  const b = stats.board;
  return h(
    "div",
    { class: "panel" },
    h("h2", { text: tr("Leaderboard", "ตารางอันดับ") }),
    h("p", { class: "muted", text: tr(`Matchmaking games only (practice never counts). At least ${b?.minGames ?? 3} games to appear. Ranked by MMR (everyone starts at 1000).`, `นับเฉพาะเกมจับคู่ (ฝึกซ้อมไม่นับ) ต้องเล่นอย่างน้อย ${b?.minGames ?? 3} เกมถึงจะขึ้นตาราง เรียงตาม MMR (เริ่มที่ 1000)`) }),
    !b ? h("p", { class: "muted", text: tr("Loading...", "กำลังโหลด...") }) : b.players.length === 0 ? h("p", { class: "muted", text: tr("Nobody has enough ranked games yet.", "ยังไม่มีใครเล่นเกมจัดอันดับครบ") }) :
      h("table", { class: "admin-table" }, h("tr", null, ...["#", tr("Player", "ผู้เล่น"), "MMR", tr("Games", "เกม"), tr("Wins", "ชนะ"), "Top 4", tr("Avg place", "อันดับเฉลี่ย")].map((t) => h("th", { text: t }))),
        ...b.players.map((p) => h("tr", null, h("td", { text: String(p.rank) }), h("td", { text: p.username }), h("td", { text: String(p.mmr) }), h("td", { text: String(p.games) }), h("td", { text: String(p.wins) }), h("td", { text: String(p.top4) }), h("td", { text: p.avgPlacement.toFixed(2) })))),
  );
}

function loadForm(): PracticeForm {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<PracticeForm> | null;
    return { factions: raw?.factions ?? [], bots: raw?.bots ?? 7, speed: raw?.speed === "normal" || raw?.speed === "quick" ? raw.speed : "fast" };
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
    return h("label", { class: "faction-pick", title: ctx.ix.factionText(f.key), style: `--c:${f.color}` }, box, h("span", { class: "swatch" }), f.name);
  });

  const bots = h("select", { on: { change: (e) => ((form.bots = Number((e.target as HTMLSelectElement).value)), saveForm(form)) } }, ...[1, 2, 3, 4, 5, 6, 7].map((n) => h("option", { value: String(n), text: tr(`${n} bot${n > 1 ? "s" : ""}`, `bot ${n} ตัว`), selected: n === form.bots })));
  const speed = h(
    "select",
    { on: { change: (e) => ((form.speed = (e.target as HTMLSelectElement).value as PracticeForm["speed"]), saveForm(form)) } },
    h("option", { value: "fast", text: tr("Fast (about 1 min per game)", "เร็ว (ประมาณ 1 นาทีต่อเกม)"), selected: form.speed === "fast" }),
    h("option", { value: "normal", text: tr("Normal (20-30 min)", "ปกติ (20-30 นาที)"), selected: form.speed === "normal" }),
    h("option", { value: "quick", text: tr("Quick Mode (35s turns, 20 HP)", "Quick Mode (เทิร์นละ 35 วิ, HP 20)"), selected: form.speed === "quick" }),
  );

  const status = state.status;
  const queueBox =
    status.state === "queued"
      ? h(
          "div",
          { class: "queue-box" },
          h("p", { text: `${status.kind === "quick" ? "Quick Mode · " : ""}${tr("Waiting for players", "รอผู้เล่น")}: ${status.waiting}/${status.matchSize}` }),
          h("p", { class: "muted", id: "fill-countdown", data: { fillAt: String(status.fillAt ?? "") }, text: status.fillAt ? `${tr("Bots join in", "bot จะเข้าใน")} ${formatClock(ctx.clock.remaining(status.fillAt))}` : "" }),
          h("button", { class: "btn", text: tr("Leave queue", "ออกจากคิว"), on: { click: () => void ctx.leaveQueue() } }),
        )
      : h(
          "div",
          { class: "row" },
          h("button", { class: "btn", text: tr("Join the queue", "เข้าคิว"), on: { click: () => void ctx.joinQueue("standard") } }),
          h("button", { class: "btn", text: tr("Quick Mode queue", "คิว Quick Mode"), title: tr("35s turns, heroes start on 20 HP. Does not count for the leaderboard.", "เทิร์นละ 35 วิ Hero เริ่ม HP 20 ไม่นับในตารางอันดับ"), on: { click: () => void ctx.joinQueue("quick") } }),
        );

  // Your numbers, from the history the server keeps (ranked games only for the record line).
  const mine = stats.mine ?? [];
  const ranked = mine.filter((m) => m.mode === "queue" && m.placement !== null);
  const best = ranked.length > 0 ? Math.min(...ranked.map((m) => m.placement as number)) : undefined;
  const wins = ranked.filter((m) => m.placement === 1).length;
  const me = stats.board?.players.find((p) => p.username === state.user?.username);

  const statTile = (label: string, value: string): HTMLElement => h("div", { class: "stat-tile" }, h("div", { class: "stat-value", text: value }), h("div", { class: "stat-label", text: label }));

  mount(
    root,
    h(
      "div",
      { class: "lobby" },
      h(
        "section",
        { class: "lobby-hero" },
        h("div", { class: "hero-copy" }, h("div", { class: "eyebrow", text: "Auto-battler · Rider × Sentai" }), h("h1", { class: "logo", text: "HeroTime" }), h("p", { class: "tagline", text: tr("Recruit your squad, transform, and call the giant robo. Last hero standing wins.", "รวมทีม แปลงร่าง แล้วเรียกหุ่นยักษ์ ฮีโร่คนสุดท้ายที่รอดคือผู้ชนะ") })),
        h(
          "div",
          { class: "hero-stats" },
          h("div", { class: "pilot", text: state.user?.username ?? "" }),
          h("div", { class: "stat-row" }, statTile(tr("Ranked games", "เกมจัดอันดับ"), String(ranked.length)), statTile(tr("Wins", "ชนะ"), String(wins)), statTile(tr("Best place", "อันดับดีสุด"), best ? ordinal(best) : "-"), statTile(tr("Rank", "อันดับ"), me ? `#${me.rank}` : "-"), statTile("MMR", me ? String(me.mmr) : "-")),
        ),
      ),
      h(
        "div",
        { class: "lobby-main" },
        h(
          "div",
          { class: "mode-card practice-card" },
          h("div", { class: "mode-tag", text: tr("Solo", "เดี่ยว") }),
          h("h2", { text: tr("Practice vs bots", "ฝึกกับ bot") }),
          h("p", { class: "muted", text: tr("Starts at once. Pick factions to force a matchup, or leave them empty for the usual random 5. Never counts for the leaderboard.", "เริ่มทันที เลือกเผ่าเพื่อกำหนดเผ่าในเกม หรือเว้นว่างให้สุ่ม 5 เผ่าตามปกติ ไม่นับในตารางอันดับ") }),
          h("div", { class: "faction-picks" }, ...factionBoxes),
          h("div", { class: "row" }, bots, speed),
          h("button", { class: "btn primary big", text: tr("Start practice", "เริ่มฝึกซ้อม"), on: { click: () => void ctx.startPractice(toPracticeOptions(form)) } }),
        ),
        h(
          "div",
          { class: "mode-card ranked-card" },
          h("div", { class: "mode-tag", text: tr("Ranked", "จัดอันดับ") }),
          h("h2", { text: tr("Matchmaking", "จับคู่") }),
          h("p", { class: "muted", text: tr("Eight players. Empty seats are filled with bots after a short wait. Your place counts for the leaderboard.", "ผู้เล่น 8 คน ที่ว่างจะเติม bot หลังรอสักครู่ อันดับนับในตารางอันดับ") }),
          queueBox,
          h("div", { class: "build-info muted small", text: tr(`Content: ${ix.snapshot.set} v${ix.snapshot.version} · ${ix.cards.size} cards · ${ix.heroes.size} heroes · ${ix.relics.size} relics · ${ix.factions.size} factions`, `Content: ${ix.snapshot.set} v${ix.snapshot.version} · การ์ด ${ix.cards.size} · Hero ${ix.heroes.size} · Relic ${ix.relics.size} · เผ่า ${ix.factions.size}`) }),
        ),
      ),
      h("div", { class: "lobby-side" }, historyPanel(ctx), leaderboardPanel()),
    ),
  );
  refreshStats(ctx);
}

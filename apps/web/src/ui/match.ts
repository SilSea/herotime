import { formatClock } from "../clock.js";
import { boardLabel, gaugeText, KEYWORDS, keywordName, ordinal, PHASE_LABEL, stars } from "../format.js";
import type { MatchView } from "../protocol.js";
import type { AppState } from "../store.js";
import { cardEl } from "./card.js";
import type { Ctx } from "./ctx.js";
import { artBox, bg, initialsOf } from "./art.js";
import { h, mount, type Child } from "./dom.js";

type View = NonNullable<AppState["view"]>;
type Player = MatchView["players"][number];

/** Marks that a drag is in progress, so the app does not redraw underneath the player's hand. */
export const DRAGGING = "dragging";

export function renderMatch(root: HTMLElement, ctx: Ctx): void {
  const view = ctx.store.state.view as View;
  if (view.phase === "HERO_SELECT") return mount(root, matchFrame(ctx, view, heroSelect(ctx, view)));
  if (view.phase === "ENDED") return mount(root, matchFrame(ctx, view, endScreen(ctx, view)));
  // Out of the match while it goes on: watch the others instead of an empty table.
  const out = !view.me.alive;
  mount(root, matchFrame(ctx, view, out ? spectateStage(ctx, view) : table(ctx, view)));
}

/** Shown once when you are knocked out: your place, then watch or leave. */
function defeatNotice(ctx: Ctx, view: View): HTMLElement | null {
  const state = ctx.store.state;
  if (view.me.alive || view.phase === "ENDED" || state.defeatAck === state.matchId) return null;
  const place = view.me.placement;
  const firstAlive = view.players.find((p) => p.alive)?.id;
  return h(
    "div",
    { class: "modal defeat" },
    h(
      "div",
      { class: "modal-box defeat-box" },
      h("div", { class: "defeat-title", text: "Defeated" }),
      h("p", { class: "defeat-place", text: place ? `You finished ${ordinal(place)}` : "You are out of the match" }),
      h("p", { class: "muted", text: "The match goes on without you. You can watch the other players' boards from their last fight, or leave." }),
      h("div", { class: "row center-row" },
        h("button", { class: "btn primary big", text: "Watch other players", on: { click: () => ctx.store.set({ defeatAck: state.matchId, spectating: state.spectating ?? firstAlive }) } }),
        h("button", { class: "btn big", text: "Leave match", on: { click: () => void ctx.leaveMatch() } }),
      ),
    ),
  );
}

/** A knocked-out player's view: pick anyone and see the board they last fought with. */
function spectateStage(ctx: Ctx, view: View): HTMLElement {
  const state = ctx.store.state;
  const others = view.players.filter((p) => p.id !== view.me.id).sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp);
  const target = others.find((p) => p.id === state.spectating) ?? others.find((p) => p.alive) ?? others[0];
  const heroDef = target?.hero ? ctx.ix.heroes.get(target.hero) : undefined;
  const units = target?.lastFightBoard ?? [];
  const label = target?.lastBoard ? boardLabel(target.lastBoard, ctx.ix.factionName) : undefined;
  return h(
    "div",
    { class: "stage table spectate" },
    defeatNotice(ctx, view),
    h("div", { class: "spectate-head" },
      h("span", { class: "spectate-tag", text: "Spectating" }),
      h("div", { class: "spectate-tabs" }, ...others.map((p) => h("button", { class: `tab ${p.id === target?.id ? "active" : ""} ${p.alive ? "" : "out"}`, text: `${p.name}${p.alive ? ` · ${Math.max(0, p.hp)} HP` : ` · ${p.placement ? ordinal(p.placement) : "out"}`}`, on: { click: () => ctx.store.set({ spectating: p.id }) } }))),
      h("span", { class: "spacer" }),
      h("button", { class: "btn", text: "Leave match", on: { click: () => void ctx.leaveMatch() } }),
    ),
    target
      ? h("div", { class: "spectate-body" },
          h("div", { class: "spectate-hero" },
            artBox("pc-portrait", ctx.ix.heroArt(target.hero), heroDef?.name ?? target.name),
            h("div", null, h("div", { class: "pc-name", text: target.name }), h("div", { class: "pc-hero", text: heroDef?.name ?? "" }), h("div", { class: "pc-stats", text: `${Math.max(0, target.hp)} HP${target.armor ? ` + ${target.armor} armor` : ""} · Tavern rank ${target.rank}` }))),
          h("div", { class: "pc-label", text: target.lastBoard ? `Board in their last fight (turn ${target.lastBoard.turn})${label ? ` · ${label.headline}` : ""}` : "No fight seen yet" }),
          h("div", { class: "cards board-cards spectate-board" }, ...units.map((u) => cardEl(ctx.ix, { key: u.cardKey, atk: u.atk, hp: u.hp, golden: u.golden, extraKeywords: u.keywords, small: true, minion: true })), units.length === 0 && h("p", { class: "muted", text: target.lastBoard ? "They fought with an empty board." : "Boards appear after a fight." })),
          h("div", { class: "spectate-info" },
            h("div", { class: "power-panel" }, h("div", { class: "pc-label", text: powerHeader(heroDef?.power?.mode, heroDef?.power?.cost) }), h("div", { class: "power-text", text: heroDef ? powerBody(heroDef.text) || "No hero power." : "" })),
            target.relics.length > 0 && h("div", { class: "relic-panel" }, h("div", { class: "pc-label", text: "Relics" }), relicList(ctx, target.relics)),
          ),
        )
      : h("p", { class: "muted", text: "Nobody else is left." }),
  );
}

function matchFrame(ctx: Ctx, view: View, stage: HTMLElement): HTMLElement {
  return h(
    "div",
    { class: "match" },
    topBar(ctx, view),
    h("div", { class: "fuse" }, h("div", { class: "fuse-fill", id: "fuse-fill" })),
    h("div", { class: "match-body" }, leaderboard(ctx, view), stage),
    ctx.store.state.showLog && logDrawer(ctx, view),
    ctx.store.state.showBook && bookModal(ctx, view),
  );
}

// ------------------------------------------------------------------ top bar

/** Phase, a fuse that burns down with the clock, the lineup, and the way out of the match. */
function topBar(ctx: Ctx, view: View): HTMLElement {
  const me = view.me;
  const state = ctx.store.state;
  const timer = h("span", { class: "timer", id: "timer", data: { deadline: String(view.deadline ?? "") }, text: formatClock(ctx.clock.remaining(view.deadline)) });
  const out = view.phase !== "ENDED" && !me.alive;

  return h(
    "div",
    { class: "topbar" },
    h("div", { class: "phase" }, h("strong", { text: PHASE_LABEL[view.phase] ?? view.phase }), view.turn > 0 && h("span", { class: "turn", text: `Turn ${view.turn}` }), timer),
    h("div", { class: "factions" }, ...view.factions.map((f) => h("span", { class: "chip", style: `--c:${ctx.ix.factionColor(f)}`, title: ctx.ix.factions.get(f)?.text ?? "", text: ctx.ix.factionName(f) }))),
    h(
      "div",
      { class: "top-actions" },
      h("button", { class: `btn ${state.showBook ? "on" : ""}`, text: "Book", title: "Every card in this match, by rank (B)", on: { click: () => ctx.store.set({ showBook: !state.showBook, bookRank: state.bookRank || me.state.rank }) } }),
      h("button", { class: `btn ${state.showLog ? "on" : ""}`, text: "Log", title: "L", on: { click: () => ctx.store.set({ showLog: !state.showLog }) } }),
      view.phase !== "ENDED" && me.alive && h("button", { class: "btn danger", text: "Surrender", title: "Give up and take your current place", on: { click: () => void surrender(ctx, view) } }),
      out && h("button", { class: "btn", text: "Leave match", on: { click: () => void ctx.leaveMatch() } }),
    ),
  );
}

async function surrender(ctx: Ctx, view: View): Promise<void> {
  const place = view.players.filter((p) => p.alive).length;
  if (!window.confirm(`Surrender? You will finish ${ordinal(place)} and the match goes on without you.`)) return;
  await ctx.act({ type: "SURRENDER" });
}

// ------------------------------------------------------------ left: players

/** A column of portraits, best on top, like the sidebar in Battlegrounds. */
function leaderboard(ctx: Ctx, view: View): HTMLElement {
  const opp = ctx.store.state.combat?.opponentId;
  const sorted = [...view.players].sort((a, b) => Number(b.alive) - Number(a.alive) || (a.placement ?? 0) - (b.placement ?? 0) || b.hp - a.hp);
  return h("div", { class: "leaderboard" }, ...sorted.map((p) => playerRow(ctx, p, p.id === view.me.id, p.id === opp)));
}

function playerRow(ctx: Ctx, p: Player, mine: boolean, opponent: boolean): HTMLElement {
  const hero = p.hero ? ctx.ix.heroName(p.hero) : p.name;
  const row = h(
    "div",
    { class: `player ${mine ? "me" : ""} ${p.alive ? "" : "dead"} ${opponent ? "opponent" : ""}` },
    h("div", { class: `portrait small-portrait ${ctx.ix.heroArt(p.hero) ? "has-art" : ""}`, style: bg(ctx.ix.heroArt(p.hero)) }, !ctx.ix.heroArt(p.hero) && h("span", { text: initialsOf(hero) }), h("span", { class: "tier-badge", title: `Tavern rank ${p.rank}`, text: String(p.rank) }), h("span", { class: "hpgem", text: String(Math.max(0, p.hp)) }), p.armor > 0 && h("span", { class: "armorgem", text: String(p.armor) })),
    h("div", { class: "pname" }, h("span", { class: "pname-text", text: p.name }), !p.alive && p.placement !== undefined && h("span", { class: "tag", text: ordinal(p.placement) })),
    h("div", { class: "pmeta", text: `${stars(p.rank)}${p.lastBoard ? ` · ${boardLabel(p.lastBoard, ctx.ix.factionName).headline}` : ""}` }),
  );
  row.addEventListener("mouseenter", () => showPlayerCard(ctx, row, p, mine, opponent));
  // Once you are out, clicking a player shows their board.
  if (!ctx.store.state.view?.me.alive && !mine) row.addEventListener("click", () => ctx.store.set({ spectating: p.id, defeatAck: ctx.store.state.matchId }));
  row.addEventListener("mouseleave", hidePlayerCard);
  return row;
}

// ------------------------------------------------------------ hover card for a player

let playerCard: HTMLElement | undefined;

/** Hide the floating player card (the app calls this whenever it redraws). */
export function hidePlayerCard(): void {
  playerCard?.remove();
  playerCard = undefined;
}

/** Hero power text without the "Hero Power (2 Energy, once per turn):" header, which the panel shows separately. */
const powerBody = (text: string): string => text.replace(/^(Hero Power \([^)]*\)|Passive): /, "");

/** Say why the power cannot be used, rather than just greying it out. */
function powerButtonLabel(power: { mode: string; cost: number; usable: boolean }, recruiting: boolean, energy: number): string {
  if (power.usable) return "Use power";
  if (!recruiting) return "Recruit phase only";
  if (energy < power.cost) return `Need ${power.cost} Energy`;
  return power.mode === "ONCE" ? "Already used" : "Used this turn";
}

function powerHeader(mode: string | undefined, cost: number | undefined): string {
  if (mode === "ACTIVE") return `Hero Power · ${cost ?? 0} Energy · once per turn`;
  if (mode === "ONCE") return `Hero Power · ${cost ?? 0} Energy · once per game`;
  if (mode === "PASSIVE") return "Passive";
  return "No hero power";
}

/** Relics as small readable entries: picture, name and what it does. */
function relicList(ctx: Ctx, keys: readonly string[]): HTMLElement {
  return h(
    "div",
    { class: "relic-list" },
    ...keys.map((k) => {
      const r = ctx.ix.relics.get(k);
      return h("div", { class: "relic-entry" }, artBox("relic-thumb", ctx.ix.relicArt(k), ctx.ix.relicName(k)), h("div", null, h("div", { class: "relic-name", text: `${ctx.ix.relicName(k)}${r ? ` · ${r.tier === "GREATER" ? "Greater" : "Lesser"}` : ""}` }), h("div", { class: "relic-text", text: r?.text ?? "" })));
    }),
  );
}

function showPlayerCard(ctx: Ctx, row: HTMLElement, p: Player, mine: boolean, opponent: boolean): void {
  hidePlayerCard();
  const heroDef = p.hero ? ctx.ix.heroes.get(p.hero) : undefined;
  const board = p.lastBoard ? boardLabel(p.lastBoard, ctx.ix.factionName) : undefined;
  const card = h(
    "div",
    { class: "player-card" },
    h("div", { class: "pc-head" }, artBox("pc-portrait", ctx.ix.heroArt(p.hero), heroDef?.name ?? p.name), h("div", null, h("div", { class: "pc-name", text: `${p.name}${p.isBot ? " (bot)" : ""}${mine ? " (you)" : ""}` }), h("div", { class: "pc-hero", text: heroDef?.name ?? "Choosing a hero..." }), h("div", { class: "pc-stats", text: `${Math.max(0, p.hp)} HP${p.armor ? ` + ${p.armor} armor` : ""} · Tavern ${stars(p.rank)}` }))),
    !p.alive && p.placement !== undefined && h("div", { class: "pc-out", text: `Out in ${ordinal(p.placement)} place` }),
    opponent && h("div", { class: "pc-note", text: "Your last opponent" }),
    h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: board ? `Board in their last fight (turn ${p.lastBoard?.turn}) · ${p.lastBoard?.units} unit${p.lastBoard?.units === 1 ? "" : "s"}` : "Board" }),
      board ? h("div", null, h("div", { class: "pc-headline", text: board.headline }), board.parts.length > 0 && h("div", { class: "pc-parts" }, ...board.parts.map((t) => h("span", { class: "pc-part", text: t })))) : h("div", { class: "muted", text: "Not seen yet: boards show up after the first fight." })),
    h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: powerHeader(heroDef?.power?.mode, heroDef?.power?.cost) }), h("div", { class: "pc-text", text: heroDef ? powerBody(heroDef.text) || "No hero power." : "-" })),
    h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: `Relics (${p.relics.length})` }), p.relics.length > 0 ? relicList(ctx, p.relics) : h("div", { class: "muted", text: "None yet: relics are offered on turns 5 and 9." })),
  );
  document.body.append(card);
  playerCard = card;
  const r = row.getBoundingClientRect();
  const top = Math.max(8, Math.min(r.top, window.innerHeight - card.offsetHeight - 8));
  card.style.left = `${r.right + 10}px`;
  card.style.top = `${top}px`;
}

// ------------------------------------------------------------ book

/** Whether the tavern was frozen last time it was drawn, to play the freezing animation only once. */
let wasFrozen = false;
/** The shop as last drawn, so the deal-in animation plays only for a new shop. */
let lastShopSig = "";

/** Book tab for tavern gear (ranks are 1-6, so 7 cannot clash). */
const GEAR_TAB = 7;

/** Every shop card this match can offer, by rank: only this match's factions, plus neutrals. */
function bookModal(ctx: Ctx, view: View): HTMLElement {
  const state = ctx.store.state;
  const rank = state.bookRank || view.me.state.rank || 1;
  const inMatch = (c: { factions: string[] }): boolean => c.factions.length === 0 || c.factions.some((f) => view.factions.includes(f));
  const pool = [...ctx.ix.cards.values()].filter((c) => c.kind === "UNIT" && !c.token && inMatch(c));
  const gear = [...ctx.ix.cards.values()].filter((c) => c.kind === "GEAR" && !c.token && inMatch(c)).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const fac = state.bookFaction;
  const kw = state.bookKeyword;
  const pass = (c: { factions: string[]; keywords: string[]; effects: { actions: { type: string; keyword?: string }[] }[] }): boolean =>
    (fac === "" || (fac === "_neutral" ? c.factions.length === 0 : c.factions.includes(fac))) &&
    (kw === "" || c.keywords.includes(kw) || c.effects.some((e) => e.actions.some((a) => a.type === "GIVE_KEYWORD" && a.keyword === kw)));
  const ofRank = (rank === GEAR_TAB ? gear : pool.filter((c) => c.rank === rank)).filter(pass).sort((a, b) => (a.factions[0] ?? "~").localeCompare(b.factions[0] ?? "~") || a.name.localeCompare(b.name));
  const close = (): void => ctx.store.set({ showBook: false });
  return h(
    "div",
    { class: "modal book", on: { click: (e) => e.target === e.currentTarget && close() } },
    h(
      "div",
      { class: "modal-box book-box" },
      h("div", { class: "row" }, h("h2", { text: "Card book" }), h("span", { class: "spacer" }), h("span", { class: "muted", text: `Factions this match: ${view.factions.map(ctx.ix.factionName).join(", ") || "all"} · your tavern is rank ${view.me.state.rank}` }), h("button", { class: "btn", text: "Close", on: { click: close } })),
      h("div", { class: "book-tabs" }, ...[1, 2, 3, 4, 5, 6].map((r) => h("button", { class: `tab ${r === rank ? "active" : ""} ${r > view.me.state.rank ? "locked" : ""}`, title: r > view.me.state.rank ? "Upgrade your tavern to be offered these" : "", on: { click: () => ctx.store.set({ bookRank: r }) } }, `${stars(r)} Rank ${r}`, h("span", { class: "book-count", text: String(pool.filter((c) => c.rank === r).length) }))),
        gear.length > 0 && h("button", { class: `tab ${rank === GEAR_TAB ? "active" : ""}`, title: "Gear the tavern can offer (from the rank shown on each card)", on: { click: () => ctx.store.set({ bookRank: GEAR_TAB }) } }, "Gear", h("span", { class: "book-count", text: String(gear.length) }))),
      h(
        "div",
        { class: "book-filters" },
        h("span", { class: "muted small", text: "Faction" }),
        ...[["", "All"], ...view.factions.map((f) => [f, ctx.ix.factionName(f)]), ["_neutral", "Neutral"]].map(([k, label]) => h("button", { class: `chip filter-chip ${fac === k ? "active" : ""}`, style: k && k !== "_neutral" ? `--c:${ctx.ix.factionColor(k as string)}` : "--c:#8296bb", text: label as string, on: { click: () => ctx.store.set({ bookFaction: k as string }) } })),
        h("span", { class: "muted small", text: "Keyword" }),
        (() => {
          const sel = h("select", null, h("option", { value: "", text: "Any", selected: kw === "" }), ...Object.keys(KEYWORDS).map((k) => h("option", { value: k, text: keywordName(k), selected: kw === k })));
          sel.addEventListener("change", () => ctx.store.set({ bookKeyword: sel.value }));
          return sel;
        })(),
      ),
      h("div", { class: "book-cards" }, ...ofRank.map((c) => cardEl(ctx.ix, { key: c.key, ...(c.kind === "GEAR" ? { cost: c.cost ?? view.me.limits.buyCost } : {}) })), ofRank.length === 0 && h("p", { class: "muted", text: fac || kw ? "No cards match these filters at this rank." : "No cards of this rank in this match." })),
    ),
  );
}

// ------------------------------------------------------------ log drawer

function logDrawer(ctx: Ctx, view: View): HTMLElement {
  const state = ctx.store.state;
  const debug = state.showDebug
    ? h(
        "div",
        { class: "debug" },
        h("div", { class: "row" }, h("strong", { text: "Debug" }), h("button", { class: "btn", text: "Copy report", on: { click: () => void copyReport(ctx) } })),
        h("pre", { text: JSON.stringify({ matchId: state.matchId, set: ctx.ix.snapshot.set, version: ctx.ix.snapshot.version, turn: view.turn, phase: view.phase, factions: view.factions, lastSeed: state.combat?.seed, me: { ...view.me, state: { ...view.me.state, shop: view.me.state.shop } } }, null, 1) }),
      )
    : null;
  return h(
    "div",
    { class: "drawer" },
    h("div", { class: "row" }, h("h3", { text: "Match log" }), h("span", { class: "spacer" }), h("button", { class: "btn", text: "Close", on: { click: () => ctx.store.set({ showLog: false }) } })),
    h("div", { class: "log", id: "log" }, ...state.log.map((l) => h("div", { text: l }))),
    h("p", { class: "muted small", text: "R refresh - F freeze - U upgrade - L log - D debug" }),
    debug,
  );
}

async function copyReport(ctx: Ctx): Promise<void> {
  const s = ctx.store.state;
  const report = JSON.stringify({ matchId: s.matchId, set: s.content?.snapshot.set, view: s.view, log: s.log, lastCombatSeed: s.combat?.seed }, null, 2);
  try {
    await navigator.clipboard.writeText(report);
    ctx.toast("Report copied to the clipboard");
  } catch {
    ctx.toast("Could not copy; open the console and run copy(window.__report) instead", "error");
    (window as unknown as { __report?: string }).__report = report;
  }
}

// ------------------------------------------------------------- hero select

function heroSelect(ctx: Ctx, view: View): HTMLElement {
  const chosen = view.me.state.hero;
  return h(
    "div",
    { class: "center hero-select" },
    h("h2", { text: chosen ? "Waiting for the other players..." : "Choose your hero" }),
    h("div", { class: "hero-options" }, ...view.me.heroOptions.map((key, i) => {
      const def = ctx.ix.heroes.get(key);
      return h("div", { class: `hero-card ${chosen === key ? "picked" : ""} ${chosen ? "locked" : ""}`, on: { click: () => !chosen && void ctx.act({ type: "CHOOSE_HERO", index: i }) } }, artBox("hero-art", ctx.ix.heroArt(key), def?.name ?? key), h("h3", { text: def?.name ?? key }), h("p", { text: def?.text || "No hero power." }), (def?.armor ?? 0) > 0 && h("p", { class: "muted", text: `${def?.armor} armor` }));
    })),
    view.factions.length > 0 && h("p", { class: "muted", text: `Factions this game: ${view.factions.map(ctx.ix.factionName).join(", ")}` }),
  );
}

// -------------------------------------------------------------- end screen

function endScreen(ctx: Ctx, view: View): HTMLElement {
  const placements = ctx.store.state.placements ?? view.players.filter((p) => p.placement !== undefined).map((p) => ({ playerId: p.id, placement: p.placement as number }));
  const mine = view.me.placement;
  const name = (id: string): string => view.players.find((p) => p.id === id)?.name ?? id;
  return h(
    "div",
    { class: "center end-screen" },
    h("h2", { text: mine === 1 ? "Victory!" : mine ? `You finished ${ordinal(mine)}` : "Match over" }),
    h("ol", { class: "standings" }, ...[...placements].sort((a, b) => a.placement - b.placement).map((p) => h("li", { class: p.playerId === view.me.id ? "me" : "" }, `${ordinal(p.placement)} - ${name(p.playerId)}`))),
    h("div", { class: "row" }, h("button", { class: "btn primary big", text: "Back to lobby", on: { click: () => void ctx.leaveMatch() } })),
  );
}

// ------------------------------------------------------------------- table

/**
 * The Battlegrounds layout: the tavern across the top, your warband in the middle, and along the bottom
 * your hero, your hand and your gold. Tavern-tier upgrade sits left of the shop, refresh and freeze right of it.
 */
function table(ctx: Ctx, view: View): HTMLElement {
  const me = view.me;
  const recruiting = view.phase === "RECRUIT" && me.alive;
  const s = me.state;
  const energy = s.energy;
  const canBuy = recruiting && energy >= me.limits.buyCost && s.hand.length < me.limits.handSize;

  const upgrade = h(
    "button",
    { class: `tier-btn ${me.upgradeCost === null ? "maxed" : ""}`, disabled: !recruiting || me.upgradeCost === null || energy < (me.upgradeCost ?? 0), title: me.upgradeCost === null ? "Your tavern is at the highest rank" : "Upgrade the tavern (U)", on: { click: () => void ctx.act({ type: "UPGRADE" }) } },
    h("span", { class: "tier-stars", text: stars(s.rank) }),
    // At the top rank there is nothing to buy: no price, just the rank.
    me.upgradeCost === null ? h("span", { class: "tier-label", text: "Max rank" }) : h("span", { class: "tier-label", text: `Upgrade to ${s.rank + 1}` }),
    me.upgradeCost !== null && h("span", { class: "coin", text: String(me.upgradeCost) }),
  );
  const side = h(
    "div",
    { class: "tavern-side" },
    h("button", { class: "round-btn", disabled: !recruiting || energy < me.limits.refreshCost, title: "Refresh the tavern (R)", on: { click: () => void ctx.act({ type: "REFRESH" }) } }, h("span", { class: "round-icon", text: "↻" }), h("span", { class: "coin", text: String(me.limits.refreshCost) })),
    h("button", { class: `round-btn ${s.frozen ? "on" : ""}`, disabled: !recruiting, title: "Freeze the tavern (F)", on: { click: () => void ctx.act({ type: "FREEZE" }) } }, h("span", { class: "round-icon", text: "❄" })),
  );
  // Deal the cards in only when the shop actually changed, not on every redraw.
  const shopSig = `${view.turn}|${s.shop.join(",")}`;
  const dealing = shopSig !== lastShopSig;
  lastShopSig = shopSig;
  const justFroze = s.frozen && !wasFrozen;
  wasFrozen = s.frozen;
  const tavern = h(
    "div",
    { class: `tavern ${s.frozen ? "frozen" : ""} ${justFroze ? "just-frozen" : ""}`, on: { dragover: allowDrop, drop: tavernDrop(ctx, view) } },
    s.frozen && h("div", { class: "frozen-stamp", text: "❄ Frozen: kept for next turn" }),
    upgrade,
    h("div", { class: `cards shop-cards ${dealing ? "dealing" : ""}` }, ...s.shop.map((key, i) => draggableCard(cardEl(ctx.ix, { key, cost: me.limits.buyCost, classes: [canBuy ? "" : "unaffordable"], onClick: () => recruiting && void ctx.act({ type: "BUY", index: i }) }), recruiting, "shop", i)), s.shop.length === 0 && h("p", { class: "muted", text: "The tavern is empty." })),
    gearSlot(ctx, view),
    side,
  );

  const boardSlots: Child[] = s.board.map((_u, i) => boardCard(ctx, view, i));
  const board = h(
    "div",
    { class: "warband" },
    h("div", { class: "band-head" }, h("span", { class: "band-count", text: `${s.board.length}/${me.limits.boardSize}` }), gaugeBars(ctx, view), sellZone(ctx, view)),
    h("div", { class: "board-row" }, h("div", { class: "cards board-cards" }, ...boardSlots, endDrop(ctx, view)), giantSlot(ctx, view)),
  );

  const hand = h("div", { class: "hand" }, ...s.hand.map((_u, i) => handCard(ctx, view, i)), s.hand.length === 0 && h("p", { class: "muted hand-empty", text: "Buy a card from the tavern, then drag it onto your warband." }));

  board.addEventListener("dragover", allowDrop);
  board.addEventListener("drop", (e) => void warbandDrop(ctx, view, board)(e));
  const bottom = bottomBar(ctx, view, hand);
  bottom.addEventListener("dragover", allowDrop);
  bottom.addEventListener("drop", buyDrop(ctx, view));
  return h("div", { class: "stage table" }, tavern, board, bottom, offersModal(ctx, view));
}

/** Make a tavern card draggable (to the board to buy and play, to the hero or hand to buy). */
function draggableCard(el: HTMLElement, on: boolean, zone: "shop" | "gear", index: number): HTMLElement {
  if (!on) return el;
  el.draggable = true;
  el.addEventListener("dragstart", (e) => dragData(e, zone, index));
  el.addEventListener("dragend", endDrag);
  return el;
}

/** The tavern's Gear slot: one card at its own price, bought into the hand and used from there. */
function gearSlot(ctx: Ctx, view: View): HTMLElement | null {
  const me = view.me;
  const key = me.state.shopGear;
  const anyGear = [...ctx.ix.cards.values()].some((c) => c.kind === "GEAR" && !c.token);
  if (!key && !anyGear) return null; // content without tavern gear: no empty box either
  const recruiting = view.phase === "RECRUIT" && me.alive;
  const cost = key ? (ctx.ix.card(key)?.cost ?? me.limits.buyCost) : 0;
  const canBuy = recruiting && !!key && me.state.energy >= cost && me.state.hand.length < me.limits.handSize;
  return h(
    "div",
    { class: "gear-slot" },
    h("div", { class: "gear-slot-label", text: "Gear" }),
    key ? draggableCard(cardEl(ctx.ix, { key, cost, classes: [canBuy ? "" : "unaffordable"], onClick: () => recruiting && void ctx.act({ type: "BUY_GEAR" }) }), recruiting, "gear", 0) : h("div", { class: "gear-empty", text: "Sold out until the next refresh" }),
  );
}

/** Hero portrait with its power on the left, the hand in the middle, gold and the end-turn button on the right. */
function bottomBar(ctx: Ctx, view: View, hand: HTMLElement): HTMLElement {
  const me = view.me;
  const recruiting = view.phase === "RECRUIT" && me.alive;
  const hero = me.state.hero;
  const power = me.heroPower;
  const self = view.players.find((p) => p.id === me.id);
  const heroDef = hero ? ctx.ix.heroes.get(hero) : undefined;
  const name = hero ? ctx.ix.heroName(hero) : "Hero";

  const portrait = h(
    "div",
    { class: "hero-box" },
    h("div", { class: `portrait ${ctx.ix.heroArt(hero) ? "has-art" : ""}`, style: bg(ctx.ix.heroArt(hero)), title: `${name}${heroDef?.text ? `\n${heroDef.text}` : ""}` }, !ctx.ix.heroArt(hero) && h("span", { text: initialsOf(name) }), h("span", { class: "hpgem", text: String(Math.max(0, self?.hp ?? 0)) }), (self?.armor ?? 0) > 0 && h("span", { class: "armorgem", text: String(self?.armor) })),
    h("div", { class: "hero-name", text: name }),
  );

  // What the hero power and relics do, in words, next to the portrait.
  const info = h(
    "div",
    { class: "hero-info" },
    h(
      "div",
      { class: "power-panel" },
      h("div", { class: "pc-label", text: powerHeader(power?.mode, power?.cost) }),
      h("div", { class: "power-text", text: heroDef ? powerBody(heroDef.text) || "No hero power." : "" }),
      power && power.mode !== "PASSIVE" && h("button", { class: `hero-power ${power.usable ? "ready" : ""}`, disabled: !power.usable, on: { click: () => void ctx.act({ type: "HERO_POWER" }) } }, h("span", { text: powerButtonLabel(power, recruiting, me.state.energy) }), h("span", { class: "coin", text: String(power.cost) })),
    ),
    (self?.relics.length ?? 0) > 0 && h("div", { class: "relic-panel" }, h("div", { class: "pc-label", text: "Relics" }), relicList(ctx, self?.relics ?? [])),
  );

  const gold = h(
    "div",
    { class: "gold", title: `Energy ${me.state.energy}/${me.limits.maxEnergy}` },
    h("div", { class: "gold-num" }, h("span", { class: "coin big-coin", text: String(me.state.energy) }), h("span", { class: "gold-max", text: `/${me.limits.maxEnergy}` })),
    h("div", { class: "pips" }, ...Array.from({ length: me.limits.maxEnergy }, (_, i) => h("span", { class: `pip ${i < me.state.energy ? "full" : ""}` }))),
    // No Ready button: every turn runs its full clock so everyone starts the next one together.
    h("div", { class: "next-turn-box" }, h("div", { class: "muted", text: view.phase === "RECRUIT" ? "Battle in" : "Next turn in" }), h("div", { class: "countdown-big", id: "timer-big", text: formatClock(ctx.clock.remaining(view.deadline)) })),
  );

  return h("div", { class: "bottom" }, h("div", { class: "hero-zone" }, portrait, info), hand, gold);
}

function dragData(e: DragEvent, zone: string, index: number): void {
  e.dataTransfer?.setData("text/plain", JSON.stringify({ zone, index }));
  e.dataTransfer && (e.dataTransfer.effectAllowed = "move");
  document.body.classList.add(DRAGGING);
  // Lets CSS light up the places this card can go (sell, buy, board).
  document.body.dataset.drag = zone;
}

function endDrag(): void {
  document.body.classList.remove(DRAGGING);
  delete document.body.dataset.drag;
}

/** Where on the board a drop at `x` lands: the number of units whose middle is left of it. */
function boardIndexAt(board: HTMLElement, x: number): number {
  const slots = [...board.querySelectorAll<HTMLElement>(".board-cards > .slot")];
  return slots.filter((s) => {
    const r = s.getBoundingClientRect();
    return r.left + r.width / 2 < x;
  }).length;
}

/** The whole warband takes drops: play from hand, reorder, or buy straight from the tavern and play. */
function warbandDrop(ctx: Ctx, view: View, board: HTMLElement) {
  return async (e: DragEvent): Promise<void> => {
    e.preventDefault();
    const d = readDrag(e);
    endDrag();
    if (!d || view.phase !== "RECRUIT" || !view.me.alive) return;
    const at = boardIndexAt(board, e.clientX);
    const s = view.me.state;
    if (d.zone === "hand") {
      void ctx.act(isGear(ctx, view, d.index) ? { type: "USE_GEAR", handIndex: d.index } : { type: "PLAY", handIndex: d.index, position: Math.min(at, s.board.length) });
    } else if (d.zone === "board") {
      const to = Math.min(at > d.index ? at - 1 : at, s.board.length - 1);
      if (to !== d.index) void ctx.act({ type: "REORDER", from: d.index, to });
    } else if (d.zone === "shop" || d.zone === "gear") {
      const key = d.zone === "shop" ? s.shop[d.index] : s.shopGear;
      if (!key) return;
      const bought = await ctx.act(d.zone === "shop" ? { type: "BUY", index: d.index } : { type: "BUY_GEAR" });
      // Then play (or use) it: it is the last copy of that card in the hand, unless a triple swallowed it.
      const hand = ctx.store.state.view?.me.state.hand ?? [];
      const i = hand.map((u) => u.key).lastIndexOf(key);
      if (!bought || i < 0) return;
      void ctx.act(d.zone === "gear" ? { type: "USE_GEAR", handIndex: i } : { type: "PLAY", handIndex: i, position: Math.min(at, ctx.store.state.view?.me.state.board.length ?? at) });
    }
  };
}

/** Dropping a unit anywhere on the tavern sells it. */
function tavernDrop(ctx: Ctx, view: View) {
  return (e: DragEvent): void => {
    e.preventDefault();
    const d = readDrag(e);
    endDrag();
    if (d && (d.zone === "hand" || d.zone === "board") && view.phase === "RECRUIT") void ctx.act({ type: "SELL", from: d.zone, index: d.index });
  };
}

/** Dropping a tavern card on your hero or hand buys it. */
function buyDrop(ctx: Ctx, view: View) {
  return (e: DragEvent): void => {
    e.preventDefault();
    const d = readDrag(e);
    endDrag();
    if (!d || view.phase !== "RECRUIT") return;
    if (d.zone === "shop") void ctx.act({ type: "BUY", index: d.index });
    else if (d.zone === "gear") void ctx.act({ type: "BUY_GEAR" });
  };
}

function readDrag(e: DragEvent): { zone: string; index: number } | undefined {
  try {
    const d = JSON.parse(e.dataTransfer?.getData("text/plain") ?? "") as { zone: string; index: number };
    return typeof d.index === "number" ? d : undefined;
  } catch {
    return undefined;
  }
}

const isGear = (ctx: Ctx, view: View, handIndex: number): boolean => ctx.ix.card(view.me.state.hand[handIndex]?.key ?? "")?.kind === "GEAR";
const allowDrop = (e: DragEvent): void => e.preventDefault();

function boardCard(ctx: Ctx, view: View, i: number): HTMLElement {
  const u = view.me.state.board[i]!;
  const st = view.me.boardStats[i] ?? { atk: 0, hp: 0 };
  const recruiting = view.phase === "RECRUIT" && view.me.alive;
  const last = view.me.state.board.length - 1;
  const canCombine = recruiting && (view.me.combinable ?? []).includes(i);
  const form = ctx.ix.card(u.key)?.gattaiInto;
  const el = cardEl(ctx.ix, { key: u.key, atk: st.atk, hp: st.hp, golden: u.golden, extraKeywords: u.keywords ?? [], small: true, minion: true, buffs: u.buffs ?? [], classes: canCombine ? ["core-ready"] : [] });
  return h(
    "div",
    { class: "slot", draggable: recruiting, on: { dragstart: (e) => dragData(e, "board", i), dragend: endDrag } },
    el,
    recruiting && h("div", { class: "slot-actions" },
      h("button", { class: "mini", text: "<", disabled: i === 0, title: "Move left", on: { click: () => void ctx.act({ type: "REORDER", from: i, to: i - 1 }) } }),
      h("button", { class: "mini", text: `Sell +${view.me.limits.sellValue}`, on: { click: () => void ctx.act({ type: "SELL", from: "board", index: i }) } }),
      h("button", { class: "mini", text: ">", disabled: i === last, title: "Move right", on: { click: () => void ctx.act({ type: "REORDER", from: i, to: i + 1 }) } })),
    // A Gattai core says what its group becomes; when the group is complete it offers to combine for good.
    form && h("div", { class: `core-tag ${canCombine ? "ready" : ""}`, title: `Gattai core: lead a Gattai group (it must be the leftmost) to become ${ctx.ix.cardName(form)}` }, `Core → ${ctx.ix.cardName(form)}`),
    canCombine && h("button", { class: "combine-btn", title: `Merge this group into ${ctx.ix.cardName(form ?? "")} for good (frees board slots)`, on: { click: () => void ctx.act({ type: "COMBINE", index: i }) } }, "⚙ Combine"),
    (u.turns ?? 0) > 0 && ctx.ix.card(u.key)?.henshin && h("div", { class: "henshin", text: `henshin ${u.turns}/${ctx.ix.card(u.key)?.henshin?.afterTurns}` }),
  );
}

function endDrop(ctx: Ctx, view: View): HTMLElement {
  void ctx;
  void view;
  return h("div", { class: "end-drop", title: "Drop anywhere on the board" }, h("span", { text: "+" }));
}

function handCard(ctx: Ctx, view: View, i: number): HTMLElement {
  const u = view.me.state.hand[i]!;
  const st = view.me.handStats[i] ?? { atk: 0, hp: 0 };
  const recruiting = view.phase === "RECRUIT" && view.me.alive;
  const gear = isGear(ctx, view, i);
  const full = view.me.state.board.length >= view.me.limits.boardSize;
  return h(
    "div",
    { class: "slot", draggable: recruiting, on: { dragstart: (e) => dragData(e, "hand", i), dragend: endDrag } },
    cardEl(ctx.ix, { key: u.key, atk: st.atk, hp: st.hp, golden: u.golden, extraKeywords: u.keywords ?? [], small: true, buffs: u.buffs ?? [] }),
    recruiting && h("div", { class: "slot-actions" },
      h("button", { class: "mini primary", text: gear ? "Use" : "Play", disabled: !gear && full, on: { click: () => void ctx.act(gear ? { type: "USE_GEAR", handIndex: i } : { type: "PLAY", handIndex: i, position: view.me.state.board.length }) } }),
      !gear && h("button", { class: "mini", text: `Sell +${view.me.limits.sellValue}`, on: { click: () => void ctx.act({ type: "SELL", from: "hand", index: i }) } })),
  );
}

function sellZone(ctx: Ctx, view: View): HTMLElement {
  const sell = (e: DragEvent): void => {
    e.preventDefault();
    document.body.classList.remove(DRAGGING);
    const d = readDrag(e);
    if (d && (d.zone === "hand" || d.zone === "board") && view.phase === "RECRUIT") void ctx.act({ type: "SELL", from: d.zone, index: d.index });
  };
  // A recycler console: quiet until a card is dragged, then it lights up; brighter still while the card is over it.
  const zone = h(
    "div",
    { class: "sell-zone", title: "Drag a unit here to sell it", on: { dragover: allowDrop, drop: sell, dragenter: () => zone.classList.add("over"), dragleave: (e) => !zone.contains(e.relatedTarget as Node | null) && zone.classList.remove("over") } },
    h("span", { class: "sell-icon", text: "♻" }),
    h("span", { class: "sell-copy" }, h("span", { class: "sell-title", text: "Sell" }), h("span", { class: "sell-hint idle-hint", text: "drag a unit here" }), h("span", { class: "sell-hint drag-hint", text: "release to sell" })),
    h("span", { class: "sell-value" }, h("span", { text: `+${view.me.limits.sellValue}` }), h("span", { class: "sell-unit", text: "Energy" })),
  );
  return zone;
}

function giantSlot(ctx: Ctx, view: View): HTMLElement {
  const g = view.me.state.giant;
  return h("div", { class: "giant-slot" }, h("div", { class: "muted small", text: "Giant Robo" }), g ? cardEl(ctx.ix, { key: g.key, small: true, minion: true }) : h("div", { class: "empty-giant", text: "empty" }));
}

function gaugeBars(ctx: Ctx, view: View): HTMLElement {
  return h(
    "div",
    { class: "gauges" },
    ...ctx.ix.snapshot.gauges.map((g) => {
      const value = view.me.state.gauges[g.key] ?? 0;
      const t = gaugeText(g, ctx.ix.cardName);
      const tip = [`${g.name}: ${value}/${g.max}`, "Fills:", ...t.fills.map((f) => `  ${f}`), "Rewards:", ...t.rewards.map((r) => `  ${r}`)].join("\n");
      return h("div", { class: "gauge", title: tip }, h("span", { class: "gname", text: g.name }), h("div", { class: "gbar" }, h("div", { class: "gfill", style: `width:${(value / g.max) * 100}%` }), ...g.thresholds.map((t) => h("div", { class: "gmark", style: `left:${(t.at / g.max) * 100}%` }))), h("span", { class: "gnum", text: `${value}/${g.max}` }), h("span", { class: "ghint", text: t.short }));
    }),
  );
}

// -------------------------------------------------------- discover / relics

function offersModal(ctx: Ctx, view: View): HTMLElement | null {
  const s = view.me.state;
  const state = ctx.store.state;
  if (state.hideOffers || view.phase !== "RECRUIT" || !view.me.alive) return null;
  const hide = h("button", { class: "btn", text: "Decide later", on: { click: () => ctx.store.set({ hideOffers: true }) } });

  if (s.relicOffer) {
    const offer = s.relicOffer;
    return h(
      "div",
      { class: "modal" },
      h("div", { class: "modal-box" }, h("h2", { text: `Choose a ${offer.tier === "LESSER" ? "Lesser" : "Greater"} Relic` }), h("p", { class: "muted", text: "It stays with you for the rest of the game. Free ones are always safe; the rest cost Energy now." }),
        h("div", { class: "cards" }, ...offer.options.map((key, i) => {
          const r = ctx.ix.relics.get(key);
          const cost = r?.cost ?? 0;
          return h("div", { class: `relic-card ${cost > s.energy ? "unaffordable" : ""}`, title: r?.text ?? "", on: { click: () => cost <= s.energy && void ctx.act({ type: "CHOOSE_RELIC", index: i }) } }, h("div", { class: "cost", text: String(cost) }), artBox("relic-art", ctx.ix.relicArt(key), r?.name ?? key), h("h3", { text: r?.name ?? key }), h("p", { text: r?.text ?? "" }), (r?.factions.length ?? 0) > 0 && h("p", { class: "muted small", text: r?.factions.map(ctx.ix.factionName).join(", ") }));
        })), hide),
    );
  }

  const discover = s.discovers[0];
  if (discover) {
    const giant = discover.destination === "GIANT";
    return h(
      "div",
      { class: "modal" },
      h("div", { class: "modal-box" }, h("h2", { text: giant ? "Choose a Giant Robo" : "Discover a card" }), giant && h("p", { class: "muted", text: "It waits in your Giant Slot and joins the fight when your team is nearly beaten." }),
        h("div", { class: "cards" }, ...discover.options.map((key, i) => cardEl(ctx.ix, { key, onClick: () => void ctx.act({ type: "PICK_DISCOVER", index: i }) }))), hide),
    );
  }
  return null;
}

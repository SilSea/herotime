import { formatClock } from "../clock.js";
import { ordinal, PHASE_LABEL, stars } from "../format.js";
import type { MatchView } from "../protocol.js";
import type { AppState } from "../store.js";
import { cardEl } from "./card.js";
import type { Ctx } from "./ctx.js";
import { h, mount, type Child } from "./dom.js";

type View = NonNullable<AppState["view"]>;
type Player = MatchView["players"][number];

/** Marks that a drag is in progress, so the app does not redraw underneath the player's hand. */
export const DRAGGING = "dragging";

export function renderMatch(root: HTMLElement, ctx: Ctx): void {
  const view = ctx.store.state.view as View;
  if (view.phase === "HERO_SELECT") return mount(root, matchFrame(ctx, view, heroSelect(ctx, view)));
  if (view.phase === "ENDED") return mount(root, matchFrame(ctx, view, endScreen(ctx, view)));
  mount(root, matchFrame(ctx, view, table(ctx, view)));
}

function matchFrame(ctx: Ctx, view: View, center: HTMLElement): HTMLElement {
  return h(
    "div",
    { class: "match" },
    topBar(ctx, view),
    h("div", { class: "match-body" }, playersPanel(ctx, view), center, sidePanel(ctx, view)),
  );
}

// ------------------------------------------------------------------ top bar

function topBar(ctx: Ctx, view: View): HTMLElement {
  const me = view.me;
  const power = me.heroPower;
  const hero = me.state.hero;
  const recruiting = view.phase === "RECRUIT" && me.alive;
  const timer = h("span", { class: "timer", id: "timer", data: { deadline: String(view.deadline ?? "") }, text: formatClock(ctx.clock.remaining(view.deadline)) });

  const energy = h("div", { class: "energy", title: `Energy ${me.state.energy}/${me.limits.maxEnergy}` }, ...Array.from({ length: me.limits.maxEnergy }, (_, i) => h("span", { class: `pip ${i < me.state.energy ? "full" : ""}` })), h("span", { class: "energy-num", text: `${me.state.energy}` }));

  return h(
    "div",
    { class: "topbar" },
    h("div", { class: "phase" }, h("strong", { text: PHASE_LABEL[view.phase] ?? view.phase }), view.turn > 0 && h("span", { class: "muted", text: ` - turn ${view.turn}` }), " ", timer),
    energy,
    h("div", { class: "factions" }, ...view.factions.map((f) => h("span", { class: "chip", style: `--c:${ctx.ix.factionColor(f)}`, title: ctx.ix.factions.get(f)?.text ?? "", text: ctx.ix.factionName(f) }))),
    h(
      "div",
      { class: "top-actions" },
      hero && h("span", { class: "hero-name", title: ctx.ix.heroes.get(hero)?.text ?? "", text: ctx.ix.heroName(hero) }),
      power && power.mode !== "PASSIVE" && h("button", { class: "btn", disabled: !power.usable, title: ctx.ix.heroes.get(hero ?? "")?.text ?? "", text: `Hero power (${power.cost})`, on: { click: () => void ctx.act({ type: "HERO_POWER" }) } }),
      h("button", { class: "btn", disabled: !recruiting || me.upgradeCost === null, text: me.upgradeCost === null ? "Max rank" : `Upgrade ${stars(me.state.rank + 1)} (${me.upgradeCost})`, title: "U", on: { click: () => void ctx.act({ type: "UPGRADE" }) } }),
      h("button", { class: `btn ${me.ready ? "on" : "primary"}`, disabled: !recruiting || me.ready, text: me.ready ? "Ready!" : "Ready", title: "Enter", on: { click: () => void ctx.act({ type: "READY" }) } }),
    ),
  );
}

// ------------------------------------------------------------ left: players

function playersPanel(ctx: Ctx, view: View): HTMLElement {
  const opp = ctx.store.state.combat?.opponentId;
  const sorted = [...view.players].sort((a, b) => Number(b.alive) - Number(a.alive) || (a.placement ?? 0) - (b.placement ?? 0) || b.hp - a.hp);
  return h(
    "div",
    { class: "panel players" },
    h("h3", { text: "Players" }),
    ...sorted.map((p) => playerRow(ctx, p, p.id === view.me.id, p.id === opp)),
  );
}

function playerRow(ctx: Ctx, p: Player, mine: boolean, opponent: boolean): HTMLElement {
  const hpPct = Math.max(0, Math.min(100, (p.hp / 30) * 100));
  return h(
    "div",
    { class: `player ${mine ? "me" : ""} ${p.alive ? "" : "dead"} ${opponent ? "opponent" : ""}` },
    h("div", { class: "pname" }, h("span", { text: p.name }), p.isBot && h("span", { class: "tag", text: "bot" }), mine && h("span", { class: "tag you", text: "you" }), opponent && h("span", { class: "tag", text: "last foe" }), !p.alive && p.placement !== undefined && h("span", { class: "tag", text: ordinal(p.placement) }), p.ready && p.alive && !p.isBot && h("span", { class: "tag", text: "ready" })),
    h("div", { class: "hp-bar", title: `${p.hp} HP${p.armor ? ` + ${p.armor} armor` : ""}` }, h("div", { class: "hp-fill", style: `width:${hpPct}%` }), h("span", { class: "hp-text", text: `${Math.max(0, p.hp)}${p.armor ? ` +${p.armor}` : ""}` })),
    h("div", { class: "pmeta muted", text: `${stars(p.rank)}${p.hero ? ` - ${ctx.ix.heroName(p.hero)}` : ""}` }),
    p.relics.length > 0 && h("div", { class: "relics" }, ...p.relics.map((r) => h("span", { class: "relic-chip", title: ctx.ix.relics.get(r)?.text ?? "", text: ctx.ix.relicName(r) }))),
  );
}

// ------------------------------------------------------------ right: log

function sidePanel(ctx: Ctx, view: View): HTMLElement {
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
    { class: "panel side" },
    h("h3", { text: "Match log" }),
    h("div", { class: "log", id: "log" }, ...state.log.map((l) => h("div", { text: l }))),
    h("p", { class: "muted small", text: "R refresh - F freeze - U upgrade - Enter ready - D debug" }),
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
      return h("div", { class: `hero-card ${chosen === key ? "picked" : ""} ${chosen ? "locked" : ""}`, on: { click: () => !chosen && void ctx.act({ type: "CHOOSE_HERO", index: i }) } }, h("h3", { text: def?.name ?? key }), h("p", { text: def?.text || "No hero power." }), (def?.armor ?? 0) > 0 && h("p", { class: "muted", text: `${def?.armor} armor` }));
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

function table(ctx: Ctx, view: View): HTMLElement {
  const me = view.me;
  const recruiting = view.phase === "RECRUIT" && me.alive;
  const s = me.state;
  const energy = s.energy;

  const shop = h(
    "div",
    { class: "zone shop" },
    h("div", { class: "zone-head" }, h("strong", { text: `Shop ${stars(s.rank)}` }), h("span", { class: "spacer" }),
      h("button", { class: "btn", disabled: !recruiting || energy < me.limits.refreshCost, text: `Refresh (${me.limits.refreshCost})`, title: "R", on: { click: () => void ctx.act({ type: "REFRESH" }) } }),
      h("button", { class: `btn ${s.frozen ? "on" : ""}`, disabled: !recruiting, text: s.frozen ? "Frozen" : "Freeze", title: "F", on: { click: () => void ctx.act({ type: "FREEZE" }) } })),
    h("div", { class: "cards" }, ...s.shop.map((key, i) => cardEl(ctx.ix, { key, cost: me.limits.buyCost, classes: [recruiting && energy >= me.limits.buyCost && s.hand.length < me.limits.handSize ? "" : "unaffordable"], onClick: () => recruiting && void ctx.act({ type: "BUY", index: i }) })), s.shop.length === 0 && h("p", { class: "muted", text: "The shop is empty." })),
  );

  const boardSlots: Child[] = s.board.map((u, i) => boardCard(ctx, view, i));
  const board = h(
    "div",
    { class: "zone board" },
    h("div", { class: "zone-head" }, h("strong", { text: `Board ${s.board.length}/${me.limits.boardSize}` }), h("span", { class: "spacer" }), gaugeBars(ctx, view)),
    h("div", { class: "board-row" }, h("div", { class: "cards" }, ...boardSlots, endDrop(ctx, view)), giantSlot(ctx, view)),
  );

  const hand = h(
    "div",
    { class: "zone hand" },
    h("div", { class: "zone-head" }, h("strong", { text: `Hand ${s.hand.length}/${me.limits.handSize}` }), h("span", { class: "spacer" }), sellZone(ctx, view)),
    h("div", { class: "cards" }, ...s.hand.map((u, i) => handCard(ctx, view, i)), s.hand.length === 0 && h("p", { class: "muted", text: "Buy cards from the shop; click one here to play it." })),
  );

  const offers = offersModal(ctx, view);
  return h("div", { class: "center table" }, shop, board, hand, offers);
}

function dragData(e: DragEvent, zone: string, index: number): void {
  e.dataTransfer?.setData("text/plain", JSON.stringify({ zone, index }));
  e.dataTransfer && (e.dataTransfer.effectAllowed = "move");
  document.body.classList.add(DRAGGING);
}

function readDrag(e: DragEvent): { zone: string; index: number } | undefined {
  try {
    const d = JSON.parse(e.dataTransfer?.getData("text/plain") ?? "") as { zone: string; index: number };
    return typeof d.index === "number" ? d : undefined;
  } catch {
    return undefined;
  }
}

function dropOn(ctx: Ctx, view: View, target: number) {
  return (e: DragEvent): void => {
    e.preventDefault();
    const d = readDrag(e);
    document.body.classList.remove(DRAGGING);
    if (!d || view.phase !== "RECRUIT") return;
    if (d.zone === "hand") {
      void ctx.act(isGear(ctx, view, d.index) ? { type: "USE_GEAR", handIndex: d.index } : { type: "PLAY", handIndex: d.index, position: Math.min(target, view.me.state.board.length) });
    } else if (d.zone === "board") {
      const to = Math.min(target, view.me.state.board.length - 1);
      if (to !== d.index) void ctx.act({ type: "REORDER", from: d.index, to });
    }
  };
}

const isGear = (ctx: Ctx, view: View, handIndex: number): boolean => ctx.ix.card(view.me.state.hand[handIndex]?.key ?? "")?.kind === "GEAR";
const allowDrop = (e: DragEvent): void => e.preventDefault();

function boardCard(ctx: Ctx, view: View, i: number): HTMLElement {
  const u = view.me.state.board[i]!;
  const st = view.me.boardStats[i] ?? { atk: 0, hp: 0 };
  const recruiting = view.phase === "RECRUIT" && view.me.alive;
  const last = view.me.state.board.length - 1;
  const el = cardEl(ctx.ix, { key: u.key, atk: st.atk, hp: st.hp, golden: u.golden, extraKeywords: u.keywords ?? [], small: true });
  return h(
    "div",
    { class: "slot", draggable: recruiting, on: { dragstart: (e) => dragData(e, "board", i), dragend: () => document.body.classList.remove(DRAGGING), dragover: allowDrop, drop: dropOn(ctx, view, i) } },
    el,
    recruiting && h("div", { class: "slot-actions" },
      h("button", { class: "mini", text: "<", disabled: i === 0, title: "Move left", on: { click: () => void ctx.act({ type: "REORDER", from: i, to: i - 1 }) } }),
      h("button", { class: "mini", text: `Sell +${view.me.limits.sellValue}`, on: { click: () => void ctx.act({ type: "SELL", from: "board", index: i }) } }),
      h("button", { class: "mini", text: ">", disabled: i === last, title: "Move right", on: { click: () => void ctx.act({ type: "REORDER", from: i, to: i + 1 }) } })),
    (u.turns ?? 0) > 0 && ctx.ix.card(u.key)?.henshin && h("div", { class: "henshin", text: `henshin ${u.turns}/${ctx.ix.card(u.key)?.henshin?.afterTurns}` }),
  );
}

function endDrop(ctx: Ctx, view: View): HTMLElement {
  return h("div", { class: "end-drop", title: "Drop here to put a card at the end", on: { dragover: allowDrop, drop: dropOn(ctx, view, view.me.state.board.length) } }, h("span", { text: "+" }));
}

function handCard(ctx: Ctx, view: View, i: number): HTMLElement {
  const u = view.me.state.hand[i]!;
  const st = view.me.handStats[i] ?? { atk: 0, hp: 0 };
  const recruiting = view.phase === "RECRUIT" && view.me.alive;
  const gear = isGear(ctx, view, i);
  const full = view.me.state.board.length >= view.me.limits.boardSize;
  return h(
    "div",
    { class: "slot", draggable: recruiting, on: { dragstart: (e) => dragData(e, "hand", i), dragend: () => document.body.classList.remove(DRAGGING) } },
    cardEl(ctx.ix, { key: u.key, atk: st.atk, hp: st.hp, golden: u.golden, extraKeywords: u.keywords ?? [], small: true }),
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
  return h("div", { class: "sell-zone", text: `Drop here to sell (+${view.me.limits.sellValue})`, on: { dragover: allowDrop, drop: sell } });
}

function giantSlot(ctx: Ctx, view: View): HTMLElement {
  const g = view.me.state.giant;
  return h("div", { class: "giant-slot" }, h("div", { class: "muted small", text: "Giant Robo" }), g ? cardEl(ctx.ix, { key: g.key, small: true }) : h("div", { class: "empty-giant", text: "empty" }));
}

function gaugeBars(ctx: Ctx, view: View): HTMLElement {
  return h(
    "div",
    { class: "gauges" },
    ...ctx.ix.snapshot.gauges.map((g) => {
      const value = view.me.state.gauges[g.key] ?? 0;
      const marks = g.thresholds.map((t) => `${t.at}`).join("/");
      return h("div", { class: "gauge", title: `${g.name}: ${value}/${g.max}. Rewards at ${marks}.` }, h("span", { class: "gname", text: g.name }), h("div", { class: "gbar" }, h("div", { class: "gfill", style: `width:${(value / g.max) * 100}%` }), ...g.thresholds.map((t) => h("div", { class: "gmark", style: `left:${(t.at / g.max) * 100}%` }))), h("span", { class: "gnum", text: `${value}/${g.max}` }));
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
          return h("div", { class: `relic-card ${cost > s.energy ? "unaffordable" : ""}`, title: r?.text ?? "", on: { click: () => cost <= s.energy && void ctx.act({ type: "CHOOSE_RELIC", index: i }) } }, h("div", { class: "cost", text: String(cost) }), h("h3", { text: r?.name ?? key }), h("p", { text: r?.text ?? "" }), (r?.factions.length ?? 0) > 0 && h("p", { class: "muted small", text: r?.factions.map(ctx.ix.factionName).join(", ") }));
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

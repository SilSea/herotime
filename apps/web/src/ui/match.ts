import { formatClock } from "../clock.js";
import { boardLabel, byName, gaugeText, gearTargetSlots, KEYWORDS, keywordName, ordinal, phaseLabel, stars } from "../format.js";
import { tr } from "../i18n.js";
import { play, slotForPlace } from "../sound.js";
import { langToggle, muteToggle } from "./lang.js";
import type { CardDef, MatchView } from "../protocol.js";
import type { AppState } from "../store.js";
import { cardEl } from "./card.js";
import type { Ctx } from "./ctx.js";
import { artBox, bg, initialsOf } from "./art.js";
import { h, mount, type Child } from "./dom.js";

type View = NonNullable<AppState["view"]>;
type Player = MatchView["players"][number];

import { aimMode, hideDragImage, startAim, stopAim } from "./aim.js";

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
      h("div", { class: "defeat-title", text: tr("Defeated", "แพ้แล้ว") }),
      h("p", { class: "defeat-place", text: place ? tr(`You finished ${ordinal(place)}`, `คุณได้อันดับ${ordinal(place)}`) : tr("You are out of the match", "คุณตกรอบแล้ว") }),
      h("p", { class: "muted", text: tr("The match goes on without you. You can watch the other players' boards from their last fight, or leave.", "เกมยังเล่นต่อโดยไม่มีคุณ ดูบอร์ดของผู้เล่นคนอื่นจากการต่อสู้ล่าสุดได้ หรือออกจากเกม") }),
      h("div", { class: "row center-row" },
        h("button", { class: "btn primary big", text: tr("Watch other players", "ดูผู้เล่นคนอื่น"), on: { click: () => ctx.store.set({ defeatAck: state.matchId, spectating: state.spectating ?? firstAlive }) } }),
        h("button", { class: "btn big", text: tr("Leave match", "ออกจากเกม"), on: { click: () => void ctx.leaveMatch() } }),
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
      h("span", { class: "spectate-tag", text: tr("Spectating", "กำลังดู") }),
      h("div", { class: "spectate-tabs" }, ...others.map((p) => h("button", { class: `tab ${p.id === target?.id ? "active" : ""} ${p.alive ? "" : "out"}`, text: `${p.name}${p.alive ? ` · ${Math.max(0, p.hp)} HP` : ` · ${p.placement ? ordinal(p.placement) : tr("out", "ตกรอบ")}`}`, on: { click: () => ctx.store.set({ spectating: p.id }) } }))),
      h("span", { class: "spacer" }),
      h("button", { class: "btn", text: tr("Leave match", "ออกจากเกม"), on: { click: () => void ctx.leaveMatch() } }),
    ),
    target
      ? h("div", { class: "spectate-body" },
          h("div", { class: "spectate-hero" },
            artBox("pc-portrait", ctx.ix.heroArt(target.hero), heroDef?.name ?? target.name),
            h("div", null, h("div", { class: "pc-name", text: target.name }), h("div", { class: "pc-hero", text: heroDef?.name ?? "" }), h("div", { class: "pc-stats", text: `${Math.max(0, target.hp)} HP${target.armor ? ` + ${target.armor} ${tr("armor", "เกราะ")}` : ""} · ${tr("Tavern rank", "rank ร้าน")} ${target.rank}` }))),
          h("div", { class: "pc-label", text: target.lastBoard ? `${tr("Board in their last fight", "บอร์ดในการต่อสู้ล่าสุด")} (${tr("turn", "เทิร์น")} ${target.lastBoard.turn})${label ? ` · ${label.headline}` : ""}` : tr("No fight seen yet", "ยังไม่เห็นการต่อสู้") }),
          h("div", { class: "cards board-cards spectate-board" }, ...units.map((u) => cardEl(ctx.ix, { key: u.cardKey, atk: u.atk, hp: u.hp, golden: u.golden, extraKeywords: u.keywords, small: true, minion: true })), units.length === 0 && h("p", { class: "muted", text: target.lastBoard ? tr("They fought with an empty board.", "สู้ด้วยบอร์ดว่าง") : tr("Boards appear after a fight.", "บอร์ดจะแสดงหลังการต่อสู้") })),
          h("div", { class: "spectate-info" },
            h("div", { class: "power-panel" }, h("div", { class: "pc-label", text: powerHeader(heroDef?.power?.mode, heroDef?.power?.cost) }), h("div", { class: "power-text", text: heroDef ? powerBody(ctx.ix.heroText(heroDef.key)) || tr("No hero power.", "ไม่มีพลัง Hero") : "" })),
            target.relics.length > 0 && h("div", { class: "relic-panel" }, h("div", { class: "pc-label", text: "Relics" }), relicList(ctx, target.relics)),
          ),
        )
      : h("p", { class: "muted", text: tr("Nobody else is left.", "ไม่เหลือผู้เล่นคนอื่น") }),
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
    h("div", { class: "phase" }, h("strong", { text: phaseLabel(view.phase) }), view.turn > 0 && h("span", { class: "turn", text: `${tr("Turn", "เทิร์น")} ${view.turn}` }), timer),
    h("div", { class: "factions" }, ...view.factions.map((f) => h("span", { class: "chip", style: `--c:${ctx.ix.factionColor(f)}`, title: ctx.ix.factionText(f), text: ctx.ix.factionName(f) }))),
    h(
      "div",
      { class: "top-actions" },
      h("button", { class: `btn ${state.showBook ? "on" : ""}`, text: tr("Book", "หนังสือ"), title: tr("Every card in this match, by rank (B)", "การ์ดทั้งหมดในเกมนี้ แยกตาม rank (B)"), on: { click: () => ctx.store.set({ showBook: !state.showBook, bookRank: state.bookRank || me.state.rank }) } }),
      h("button", { class: `btn ${state.showLog ? "on" : ""}`, text: tr("Log", "บันทึก"), title: "L", on: { click: () => ctx.store.set({ showLog: !state.showLog }) } }),
      view.phase !== "ENDED" && me.alive && h("button", { class: "btn danger", text: tr("Surrender", "ยอมแพ้"), title: tr("Give up and take your current place", "ยอมแพ้และรับอันดับปัจจุบัน"), on: { click: () => void surrender(ctx, view) } }),
      out && h("button", { class: "btn", text: tr("Leave match", "ออกจากเกม"), on: { click: () => void ctx.leaveMatch() } }),
      muteToggle(ctx.store),
      langToggle(ctx.store),
    ),
  );
}

async function surrender(ctx: Ctx, view: View): Promise<void> {
  const place = view.players.filter((p) => p.alive).length;
  if (!window.confirm(tr(`Surrender? You will finish ${ordinal(place)} and the match goes on without you.`, `ยอมแพ้? คุณจะได้อันดับ${ordinal(place)} และเกมจะเล่นต่อโดยไม่มีคุณ`))) return;
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
    h("div", { class: `portrait small-portrait ${ctx.ix.heroArt(p.hero) ? "has-art" : ""}`, style: bg(ctx.ix.heroArt(p.hero)) }, !ctx.ix.heroArt(p.hero) && h("span", { text: initialsOf(hero) }), h("span", { class: "tier-badge", title: `${tr("Tavern rank", "rank ร้าน")} ${p.rank}`, text: String(p.rank) }), h("span", { class: "hpgem", text: String(Math.max(0, p.hp)) }), p.armor > 0 && h("span", { class: "armorgem", text: String(p.armor) })),
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
  if (power.usable) return tr("Use power", "ใช้พลัง");
  if (!recruiting) return tr("Recruit phase only", "ใช้ได้ช่วงซื้อของเท่านั้น");
  if (energy < power.cost) return tr(`Need ${power.cost} Energy`, `ต้องมี ${power.cost} Energy`);
  return power.mode === "ONCE" ? tr("Already used", "ใช้ไปแล้ว") : tr("Used this turn", "ใช้แล้วเทิร์นนี้");
}

function powerHeader(mode: string | undefined, cost: number | undefined): string {
  if (mode === "ACTIVE") return `Hero Power · ${cost ?? 0} Energy · ${tr("once per turn", "เทิร์นละครั้ง")}`;
  if (mode === "ONCE") return `Hero Power · ${cost ?? 0} Energy · ${tr("once per game", "ครั้งเดียวต่อเกม")}`;
  if (mode === "PASSIVE") return "Passive";
  return tr("No hero power", "ไม่มีพลัง Hero");
}

/** Relics as small readable entries: picture, name and what it does. */
function relicList(ctx: Ctx, keys: readonly string[]): HTMLElement {
  return h(
    "div",
    { class: "relic-list" },
    ...keys.map((k) => {
      const r = ctx.ix.relics.get(k);
      return h("div", { class: "relic-entry" }, artBox("relic-thumb", ctx.ix.relicArt(k), ctx.ix.relicName(k)), h("div", null, h("div", { class: "relic-name", text: `${ctx.ix.relicName(k)}${r ? ` · ${r.tier === "GREATER" ? "Greater" : "Lesser"}` : ""}` }), h("div", { class: "relic-text", text: ctx.ix.relicText(k) })));
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
    h("div", { class: "pc-head" }, artBox("pc-portrait", ctx.ix.heroArt(p.hero), heroDef?.name ?? p.name), h("div", null, h("div", { class: "pc-name", text: `${p.name}${p.isBot ? " (bot)" : ""}${mine ? tr(" (you)", " (คุณ)") : ""}` }), h("div", { class: "pc-hero", text: heroDef?.name ?? tr("Choosing a hero...", "กำลังเลือก Hero...") }), h("div", { class: "pc-stats", text: `${Math.max(0, p.hp)} HP${p.armor ? ` + ${p.armor} ${tr("armor", "เกราะ")}` : ""} · ${tr("Tavern", "ร้าน")} ${stars(p.rank)}` }))),
    !p.alive && p.placement !== undefined && h("div", { class: "pc-out", text: tr(`Out in ${ordinal(p.placement)} place`, `ตกรอบ อันดับ${ordinal(p.placement)}`) }),
    opponent && h("div", { class: "pc-note", text: tr("Your last opponent", "คู่ต่อสู้ล่าสุดของคุณ") }),
    h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: board ? `${tr("Board in their last fight", "บอร์ดในการต่อสู้ล่าสุด")} (${tr("turn", "เทิร์น")} ${p.lastBoard?.turn}) · ${p.lastBoard?.units} ${tr(`unit${p.lastBoard?.units === 1 ? "" : "s"}`, "ตัว")}` : tr("Board", "บอร์ด") }),
      board ? h("div", null, h("div", { class: "pc-headline", text: board.headline }), board.parts.length > 0 && h("div", { class: "pc-parts" }, ...board.parts.map((t) => h("span", { class: "pc-part", text: t })))) : h("div", { class: "muted", text: tr("Not seen yet: boards show up after the first fight.", "ยังไม่เห็น: บอร์ดจะแสดงหลังการต่อสู้ครั้งแรก") })),
    h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: powerHeader(heroDef?.power?.mode, heroDef?.power?.cost) }), h("div", { class: "pc-text", text: heroDef ? powerBody(ctx.ix.heroText(heroDef.key)) || tr("No hero power.", "ไม่มีพลัง Hero") : "-" })),
    h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: `Relics (${p.relics.length})` }), p.relics.length > 0 ? relicList(ctx, p.relics) : h("div", { class: "muted", text: tr("None yet: relics are offered on turns 5 and 9.", "ยังไม่มี: Relic จะให้เลือกในเทิร์น 5 และ 9") })),
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

/** Whether a card can turn up in this match: one of its factions is in play (or it has none) and its series is featured. */
const inMatchOf =
  (view: View) =>
  (c: { factions: string[]; series?: string }): boolean =>
    (c.factions.length === 0 || c.factions.some((f) => view.factions.includes(f))) && (view.series === undefined || c.series === undefined || view.series.includes(c.series));

/** Book tab for tavern gear (ranks are 1-6, so 7 cannot clash). */
const GEAR_TAB = 7;
/** Book tab for cards that never come from the tavern: forms, tokens, gauge rewards and the Giant Robos. */
const SPECIAL_TAB = 8;

/** The cards `src` turns into or brings in, each with a line saying so from that card's side ("Henshin of X"). */
function formsOf(src: CardDef): { key: string; how: string }[] {
  const out: { key: string; how: string }[] = [];
  const add = (key: string | undefined, how: string): void => {
    if (key && key !== src.key) out.push({ key, how });
  };
  add(src.henshin?.into, tr(`Henshin of ${src.name} (after ${src.henshin?.afterTurns} turns)`, `ร่าง Henshin ของ ${src.name} (หลัง ${src.henshin?.afterTurns} เทิร์น)`));
  add(src.ultimateInto, tr(`Final Form of ${src.name}`, `ร่าง Final Form ของ ${src.name}`));
  add(src.gattaiInto, tr(`Gattai form of ${src.name}'s group`, `ร่าง Gattai ของกลุ่ม ${src.name}`));
  for (const e of src.effects) {
    for (const a of e.actions) {
      if (a.type === "SUMMON") add(a.cardKey, tr(`Summoned by ${src.name}`, `${src.name} เรียกออกมา`));
      if (a.type === "ADD_TO_HAND") add(a.cardKey, tr(`Given by ${src.name}`, `ได้เข้ามือจาก ${src.name}`));
      if (a.type === "TRANSFORM") add(a.into, tr(`${src.name} transforms into it`, `${src.name} แปลงร่างเป็นใบนี้`));
    }
  }
  return out;
}

/** Cards of this match the tavern never sells (gauge rewards, Giants, forms, tokens), each with a line saying how you get it. */
function specialCards(ctx: Ctx, view: View): { key: string; how: string }[] {
  const out: { key: string; how: string }[] = [];
  for (const g of ctx.ix.snapshot.gauges) {
    for (const t of [...g.thresholds].sort((a, b) => a.at - b.at)) {
      for (const r of t.reward) {
        if (r.type === "ADD_TO_HAND" && ctx.ix.card(r.cardKey) && !out.some((o) => o.key === r.cardKey)) {
          out.push({ key: r.cardKey, how: `${g.name} ${t.once ? tr("at", "ถึง") : tr("every", "ทุก")} ${t.at}${t.once ? tr(" (once per game)", " (ครั้งเดียวต่อเกม)") : ""}` });
        }
      }
    }
  }
  const series = new Set([...ctx.ix.cards.values()].filter((c) => c.kind === "UNIT" && !c.token && inMatchOf(view)(c)).flatMap((c) => (c.series ? [c.series] : [])));
  const giants = [...ctx.ix.cards.values()].filter((c) => c.kind === "GIANT" && (c.series === undefined || series.has(c.series))).sort((a, b) => a.name.localeCompare(b.name));
  for (const c of giants) out.push({ key: c.key, how: tr("Giant Robo: chosen with Kyodai Gattai!, waits in the Giant Slot", "Giant Robo: เลือกได้จาก Kyodai Gattai! แล้วรออยู่ในช่อง Giant") });

  // Forms and tokens: Henshin / Final Form / Gattai forms, and what cards summon, hand out or turn into,
  // followed from the cards of this match (a form's own form too). Each says where it comes from.
  const hows = new Map<string, string[]>();
  const note = (key: string, how: string): void => {
    const list = hows.get(key) ?? [];
    if (!list.includes(how)) list.push(how);
    hows.set(key, list);
  };
  for (const o of out) note(o.key, o.how);
  const queue = [...ctx.ix.cards.values()].filter((c) => !c.token && c.kind !== "GIANT" && inMatchOf(view)(c)).sort(byName);
  const seen = new Set(queue.map((c) => c.key));
  for (let i = 0; i < queue.length; i++) {
    const src = queue[i] as CardDef;
    for (const r of formsOf(src)) {
      const def = ctx.ix.card(r.key);
      // Only cards the tavern never sells need explaining here.
      if (!def || (!def.token && def.kind !== "GIANT")) continue;
      note(r.key, r.how);
      if (!seen.has(r.key)) {
        seen.add(r.key);
        queue.push(def);
      }
    }
  }
  // Tokens of this match's factions that nothing above leads to still belong in the book.
  for (const c of [...ctx.ix.cards.values()].filter((x) => x.token && x.kind !== "GIANT" && inMatchOf(view)(x)).sort(byName)) {
    if (!hows.has(c.key)) note(c.key, tr("Token: only other cards bring it in", "Token: ได้จากการ์ดอื่นเท่านั้น"));
  }
  const order = [...out.map((o) => o.key), ...[...hows.keys()].filter((k) => !out.some((o) => o.key === k))];
  return order.map((key) => ({ key, how: (hows.get(key) ?? []).join(" · ") }));
}

/** Every shop card this match can offer, by rank: only this match's factions, plus neutrals. */
function bookModal(ctx: Ctx, view: View): HTMLElement {
  const state = ctx.store.state;
  const rank = state.bookRank || view.me.state.rank || 1;
  const inMatch = inMatchOf(view);
  const pool = [...ctx.ix.cards.values()].filter((c) => c.kind === "UNIT" && !c.token && inMatch(c));
  const gear = [...ctx.ix.cards.values()].filter((c) => c.kind === "GEAR" && !c.token && inMatch(c)).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const fac = state.bookFaction;
  const kw = state.bookKeyword;
  const pass = (c: { factions: string[]; keywords: string[]; effects: { actions: { type: string; keyword?: string }[] }[] }): boolean =>
    (fac === "" || (fac === "_neutral" ? c.factions.length === 0 : c.factions.includes(fac))) &&
    (kw === "" || c.keywords.includes(kw) || c.effects.some((e) => e.actions.some((a) => a.type === "GIVE_KEYWORD" && a.keyword === kw)));
  const special = specialCards(ctx, view);
  const ofRank = (rank === GEAR_TAB ? gear : rank === SPECIAL_TAB ? [] : pool.filter((c) => c.rank === rank)).filter(pass).sort((a, b) => (a.factions[0] ?? "~").localeCompare(b.factions[0] ?? "~") || a.name.localeCompare(b.name));
  const close = (): void => ctx.store.set({ showBook: false });
  return h(
    "div",
    { class: "modal book", on: { click: (e) => e.target === e.currentTarget && close() } },
    h(
      "div",
      { class: "modal-box book-box" },
      h("div", { class: "row" }, h("h2", { text: tr("Card book", "หนังสือการ์ด") }), h("span", { class: "spacer" }), h("span", { class: "muted", text: `${tr("Factions this match", "เผ่าในเกมนี้")}: ${view.factions.map(ctx.ix.factionName).join(", ") || tr("all", "ทั้งหมด")} · ${tr("your tavern is rank", "ร้านของคุณ rank")} ${view.me.state.rank}`, title: view.series ? `${tr("Series this match", "ซีรีส์ในเกมนี้")}: ${view.series.map((k) => ctx.ix.snapshot.series.find((s) => s.key === k)?.name ?? k).join(", ")}` : "" }), h("button", { class: "btn", text: tr("Close", "ปิด"), on: { click: close } })),
      h("div", { class: "book-tabs" }, ...[1, 2, 3, 4, 5, 6].map((r) => h("button", { class: `tab ${r === rank ? "active" : ""} ${r > view.me.state.rank ? "locked" : ""}`, title: r > view.me.state.rank ? tr("Upgrade your tavern to be offered these", "อัปเกรดร้านเพื่อให้สุ่มเจอการ์ดเหล่านี้") : "", on: { click: () => ctx.store.set({ bookRank: r }) } }, `${stars(r)} Rank ${r}`, h("span", { class: "book-count", text: String(pool.filter((c) => c.rank === r).length) }))),
        gear.length > 0 && h("button", { class: `tab ${rank === GEAR_TAB ? "active" : ""}`, title: tr("Gear the tavern can offer (from the rank shown on each card)", "Gear ที่ร้านสุ่มให้ได้ (ตั้งแต่ rank ที่เขียนบนการ์ด)"), on: { click: () => ctx.store.set({ bookRank: GEAR_TAB }) } }, "Gear", h("span", { class: "book-count", text: String(gear.length) })),
        special.length > 0 && h("button", { class: `tab ${rank === SPECIAL_TAB ? "active" : ""}`, title: tr("Cards the tavern never sells: transformed forms, tokens, gauge cards and the Giant Robos, each with where it comes from", "การ์ดที่ร้านไม่ขาย: ร่างแปลง, Token, การ์ดจาก gauge และ Giant Robo พร้อมบอกว่าได้มาจากไหน"), on: { click: () => ctx.store.set({ bookRank: SPECIAL_TAB }) } }, tr("Forms & special", "ร่างแปลง & พิเศษ"), h("span", { class: "book-count", text: String(special.length) }))),
      h(
        "div",
        { class: "book-filters" },
        h("span", { class: "muted small", text: tr("Faction", "เผ่า") }),
        ...[["", tr("All", "ทั้งหมด")], ...view.factions.map((f) => [f, ctx.ix.factionName(f)]), ["_neutral", tr("Neutral", "ไม่มีเผ่า")]].map(([k, label]) => h("button", { class: `chip filter-chip ${fac === k ? "active" : ""}`, style: k && k !== "_neutral" ? `--c:${ctx.ix.factionColor(k as string)}` : "--c:#8296bb", text: label as string, on: { click: () => ctx.store.set({ bookFaction: k as string }) } })),
        h("span", { class: "muted small", text: "Keyword" }),
        (() => {
          const sel = h("select", null, h("option", { value: "", text: tr("Any", "ทั้งหมด"), selected: kw === "" }), ...Object.keys(KEYWORDS).map((k) => h("option", { value: k, text: keywordName(k), selected: kw === k })));
          sel.addEventListener("change", () => ctx.store.set({ bookKeyword: sel.value }));
          return sel;
        })(),
      ),
      rank === SPECIAL_TAB
        ? h("div", { class: "book-cards" }, ...special.map((s) => h("div", { class: "book-special" }, cardEl(ctx.ix, { key: s.key }), h("div", { class: "book-how", text: s.how }))))
        : h("div", { class: "book-cards" }, ...ofRank.map((c) => cardEl(ctx.ix, { key: c.key, ...(c.kind === "GEAR" ? { cost: c.cost ?? view.me.limits.buyCost, costHealth: c.costType === "HEALTH" } : {}) })), ofRank.length === 0 && h("p", { class: "muted", text: fac || kw ? tr("No cards match these filters at this rank.", "ไม่มีการ์ดที่ตรงกับตัวกรองใน rank นี้") : tr("No cards of this rank in this match.", "ไม่มีการ์ด rank นี้ในเกมนี้") })),
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
    h("div", { class: "row" }, h("h3", { text: tr("Match log", "บันทึกเกม") }), h("span", { class: "spacer" }), h("button", { class: "btn", text: tr("Close", "ปิด"), on: { click: () => ctx.store.set({ showLog: false }) } })),
    h("div", { class: "log", id: "log" }, ...state.log.map((l) => h("div", { text: l }))),
    h("p", { class: "muted small", text: tr("R refresh - F freeze - U upgrade - B book - L log - D debug", "R รีเฟรช - F แช่ร้าน - U อัปเกรด - B หนังสือ - L บันทึก - D debug") }),
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
    h("h2", { text: chosen ? tr("Waiting for the other players...", "รอผู้เล่นคนอื่น...") : tr("Choose your hero", "เลือก Hero") }),
    h("div", { class: "hero-options" }, ...view.me.heroOptions.map((key, i) => {
      const def = ctx.ix.heroes.get(key);
      return h("div", { class: `hero-card ${chosen === key ? "picked" : ""} ${chosen ? "locked" : ""}`, on: { click: () => !chosen && void ctx.act({ type: "CHOOSE_HERO", index: i }) } }, artBox("hero-art", ctx.ix.heroArt(key), def?.name ?? key), h("h3", { text: def?.name ?? key }), h("p", { text: ctx.ix.heroText(key) || tr("No hero power.", "ไม่มีพลัง Hero") }), def?.power && (def?.armor ?? 0) > 0 && h("p", { class: "muted", text: `${tr("Armor", "เกราะ")} ${def?.armor}` }));
    })),
    view.factions.length > 0 && h("p", { class: "muted", text: `${tr("Factions this game", "เผ่าในเกมนี้")}: ${view.factions.map(ctx.ix.factionName).join(", ")}` }),
  );
}

// -------------------------------------------------------------- end screen

/** My place from the ENDED event, before the view has it. */
const placeOf0 = (ctx: Ctx, view: View): number | undefined => ctx.store.state.placements?.find((p) => p.playerId === view.me.id)?.placement;

/** Title, colour and words for a finishing place. */
function placeTier(place: number | undefined): { cls: string; title: string; sub: string } {
  if (place === 1) return { cls: "gold", title: tr("VICTORY!", "ชนะเลิศ!"), sub: tr("Last hero standing", "ฮีโร่คนสุดท้ายที่ยืนอยู่") };
  if (place === 2) return { cls: "silver", title: tr("RUNNER-UP", "รองแชมป์"), sub: tr("So close", "อีกนิดเดียว") };
  if (place === 3) return { cls: "bronze", title: tr("TOP 3", "อันดับ 3"), sub: tr("On the podium", "ขึ้นโพเดียม") };
  if (place === 4) return { cls: "top4", title: tr("TOP 4", "ท็อป 4"), sub: tr("A strong finish", "จบได้สวย") };
  if (place) return { cls: "out", title: tr("DEFEATED", "ตกรอบ"), sub: tr("Regroup and go again", "รวมทีมใหม่แล้วลุยอีกครั้ง") };
  return { cls: "out", title: tr("MATCH OVER", "จบเกม"), sub: "" };
}

/** When the end screen first appeared (per match): redraws continue its animations instead of restarting them. */
let endShown: { match: string; at: number } | undefined;

/** The end of a match: your place in big, the podium, then everyone with the board they finished with. */
function endScreen(ctx: Ctx, view: View): HTMLElement {
  const matchId = ctx.store.state.matchId ?? "";
  if (endShown?.match !== matchId) {
    endShown = { match: matchId, at: Date.now() };
    play(slotForPlace(view.me.placement ?? placeOf0(ctx, view)));
  }
  const since = Date.now() - endShown.at;
  const placements = ctx.store.state.placements ?? view.players.filter((p) => p.placement !== undefined).map((p) => ({ playerId: p.id, placement: p.placement as number }));
  const placeOf = (id: string): number | undefined => placements.find((x) => x.playerId === id)?.placement ?? view.players.find((p) => p.id === id)?.placement;
  const ranked = [...view.players].sort((a, b) => (placeOf(a.id) ?? 99) - (placeOf(b.id) ?? 99));
  const mine = placeOf(view.me.id);
  const tier = placeTier(mine);
  const me = view.players.find((p) => p.id === view.me.id);

  const portrait = (p: Player, cls: string): HTMLElement => {
    const art = ctx.ix.heroArt(p.hero);
    const name = p.hero ? ctx.ix.heroName(p.hero) : p.name;
    return h("div", { class: `${cls} ${art ? "has-art" : ""}`, style: bg(art) }, !art && h("span", { text: initialsOf(name) }));
  };
  const miniBoard = (p: Player): HTMLElement =>
    h("div", { class: "end-board" }, ...(p.lastFightBoard ?? []).map((u) => cardEl(ctx.ix, { key: u.cardKey, atk: u.atk, hp: u.hp, golden: u.golden, extraKeywords: u.keywords, small: true, minion: true, hideText: true })));

  // Podium: 2nd, 1st, 3rd
  const podiumOrder = [2, 1, 3].map((n) => ranked.find((p) => placeOf(p.id) === n)).filter((p): p is Player => !!p);
  const podium = h(
    "div",
    { class: "podium" },
    ...podiumOrder.map((p) => {
      const n = placeOf(p.id) as number;
      return h(
        "div",
        { class: `podium-spot p${n} ${p.id === view.me.id ? "me" : ""}` },
        portrait(p, "podium-portrait"),
        h("div", { class: "podium-name", text: p.name }),
        h("div", { class: "podium-hero muted small", text: p.hero ? ctx.ix.heroName(p.hero) : "" }),
        h("div", { class: "podium-block" }, h("span", { class: "podium-num", text: String(n) })),
      );
    }),
  );

  const rows = h(
    "div",
    { class: "end-list" },
    ...ranked.map((p) => {
      const n = placeOf(p.id);
      const label = p.lastBoard ? boardLabel(p.lastBoard, ctx.ix.factionName).headline : "";
      return h(
        "div",
        { class: `end-row ${p.id === view.me.id ? "me" : ""} ${placeTier(n).cls}` },
        h("div", { class: "end-place", text: n ? String(n) : "-" }),
        portrait(p, "end-portrait"),
        h("div", { class: "end-who" }, h("div", { class: "end-name", text: `${p.name}${p.isBot ? " (bot)" : ""}${p.id === view.me.id ? tr(" (you)", " (คุณ)") : ""}` }), h("div", { class: "muted small", text: [p.hero ? ctx.ix.heroName(p.hero) : "", label, p.relics.length > 0 ? `Relic ${p.relics.length}` : ""].filter(Boolean).join(" · ") })),
        miniBoard(p),
      );
    }),
  );

  return h(
    "div",
    { class: `end-screen end-${tier.cls}`, style: `--since: -${since}ms` },
    tier.cls === "gold" && h("div", { class: "confetti" }, ...Array.from({ length: 36 }, (_, i) => h("i", { style: `--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.35}s;--h:${(i * 53) % 360}` }))),
    h(
      "div",
      { class: "end-hero" },
      me && portrait(me, "end-hero-portrait"),
      h("div", { class: "end-medal" }, h("span", { text: mine ? String(mine) : "-" })),
      h("div", { class: "end-title", text: tier.title }),
      h("div", { class: "end-sub", text: mine ? `${tr(`You finished ${ordinal(mine)}`, `คุณได้อันดับ${ordinal(mine)}`)} · ${tier.sub}` : tier.sub }),
      h("div", { class: "end-stats muted" }, `${tr("Turns", "เทิร์น")} ${view.turn}`, me ? ` · ${Math.max(0, me.hp)} HP` : "", me?.relics.length ? ` · Relic ${me.relics.length}` : ""),
    ),
    podiumOrder.length > 1 && podium,
    rows,
    h("div", { class: "row center-row end-actions" }, h("button", { class: "btn primary big", text: tr("Back to lobby", "กลับล็อบบี้"), on: { click: () => void ctx.leaveMatch() } })),
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
    { class: `tier-btn ${me.upgradeCost === null ? "maxed" : ""}`, disabled: !recruiting || me.upgradeCost === null || energy < (me.upgradeCost ?? 0), title: me.upgradeCost === null ? tr("Your tavern is at the highest rank", "ร้านอยู่ rank สูงสุดแล้ว") : tr("Upgrade the tavern (U)", "อัปเกรดร้าน (U)"), on: { click: () => void ctx.act({ type: "UPGRADE" }) } },
    h("span", { class: "tier-stars", text: stars(s.rank) }),
    // At the top rank there is nothing to buy: no price, just the rank.
    me.upgradeCost === null ? h("span", { class: "tier-label", text: tr("Max rank", "rank สูงสุด") }) : h("span", { class: "tier-label", text: tr(`Upgrade to ${s.rank + 1}`, `อัปเป็น ${s.rank + 1}`) }),
    me.upgradeCost !== null && h("span", { class: "coin", text: String(me.upgradeCost) }),
  );
  const side = h(
    "div",
    { class: "tavern-side" },
    h("button", { class: "round-btn", disabled: !recruiting || energy < me.limits.refreshCost, title: tr("Refresh the tavern (R)", "รีเฟรชร้าน (R)"), on: { click: () => void ctx.act({ type: "REFRESH" }) } }, h("span", { class: "round-icon", text: "↻" }), h("span", { class: "coin", text: String(me.limits.refreshCost) })),
    h("button", { class: `round-btn ${s.frozen ? "on" : ""}`, disabled: !recruiting, title: tr("Freeze the tavern (F)", "แช่ร้านไว้เทิร์นหน้า (F)"), on: { click: () => void ctx.act({ type: "FREEZE" }) } }, h("span", { class: "round-icon", text: "❄" })),
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
    s.frozen && h("div", { class: "frozen-stamp", text: tr("❄ Frozen: kept for next turn", "❄ แช่ไว้: เก็บร้านไว้เทิร์นหน้า") }),
    upgrade,
    h("div", { class: `cards shop-cards ${dealing ? "dealing" : ""}` }, ...s.shop.map((key, i) => draggableCard(cardEl(ctx.ix, { key, cost: me.limits.buyCost, ...(s.shopBonus ? { atk: (ctx.ix.card(key)?.atk ?? 0) + s.shopBonus.atk, hp: (ctx.ix.card(key)?.hp ?? 0) + s.shopBonus.hp } : {}), classes: [canBuy ? "" : "unaffordable"], onClick: () => recruiting && void ctx.act({ type: "BUY", index: i }) }), recruiting, "shop", i)), s.shop.length === 0 && h("p", { class: "muted", text: tr("The tavern is empty.", "ร้านว่าง") })),
    gearSlot(ctx, view),
    side,
  );

  const boardSlots: Child[] = s.board.map((_u, i) => boardCard(ctx, view, i));
  const aim = aimedGear(ctx, view);
  const aimBanner =
    aim !== undefined &&
    h("div", { class: "aim-banner" }, h("span", { text: tr(`Choose a unit for ${ctx.ix.cardName(s.hand[aim]?.key ?? "")}`, `เลือกยูนิตที่จะใช้ ${ctx.ix.cardName(s.hand[aim]?.key ?? "")}`) }), h("button", { class: "mini", text: tr("Cancel (Esc)", "ยกเลิก (Esc)"), on: { click: () => ctx.store.set({ selected: undefined }) } }));
  const board = h(
    "div",
    { class: "warband" },
    aimBanner,
    h("div", { class: "band-head" }, gaugeBars(ctx, view), h("span", { class: "spacer" }), h("span", { class: "band-count", title: tr("Units on your board", "ยูนิตบนบอร์ด"), text: `${s.board.length}/${me.limits.boardSize}` }), sellZone(ctx, view)),
    // The Giant Slot sits at the far right; the whole row is the drop target (no dashed box), with a marker where a card will land.
    h("div", { class: "board-row" }, h("div", { class: "cards board-cards" }, ...boardSlots, h("div", { class: "drop-marker" })), giantSlot(ctx, view)),
  );

  const hand = h("div", { class: "hand" }, ...s.hand.map((_u, i) => handCard(ctx, view, i)));

  board.addEventListener("dragover", (e) => {
    allowDrop(e);
    placeGhost(board, e.clientX, s.board.length >= me.limits.boardSize);
  });
  board.addEventListener("dragleave", (e) => {
    if (!board.contains(e.relatedTarget as Node | null)) board.querySelector(".drop-ghost")?.remove();
  });
  board.addEventListener("drop", (e) => void warbandDrop(ctx, view, board)(e));
  const bottom = bottomBar(ctx, view, hand);
  bottom.addEventListener("dragover", allowDrop);
  bottom.addEventListener("drop", buyDrop(ctx, view));
  // Waiting for a click on a unit: keep the reticle on screen across redraws (it is drawn over the page).
  if (aim !== undefined) {
    setTimeout(() => {
      const src = document.querySelector<HTMLElement>(`.hand .slot[data-hand="${aim}"]`);
      if (src && aimedGear(ctx, ctx.store.state.view ?? view) === aim) startAim(src, gearSlots(ctx, view, aim) ?? [], "click");
    }, 0);
  } else if (aimMode() === "click") stopAim();
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
  const health = key ? ctx.ix.card(key)?.costType === "HEALTH" : false;
  const hp = view.players.find((p) => p.id === me.id)?.hp ?? 0;
  // Health can pay only while the hero keeps at least 1.
  const canBuy = recruiting && !!key && (health ? hp > cost : me.state.energy >= cost) && me.state.hand.length < me.limits.handSize;
  return h(
    "div",
    { class: "gear-slot" },
    h("div", { class: "gear-slot-label", text: "Gear" }),
    key ? draggableCard(cardEl(ctx.ix, { key, cost, costHealth: health, ...gearNote(ctx, view, key), classes: [canBuy ? "" : "unaffordable"], onClick: () => recruiting && void ctx.act({ type: "BUY_GEAR" }) }), recruiting, "gear", 0) : h("div", { class: "gear-empty", text: tr("Sold out until the next refresh", "หมดแล้ว รอรีเฟรชครั้งหน้า") }),
  );
}

/** BUFF_GEAR: a Gear that gives stats shows how much more it gives now. */
function gearNote(ctx: Ctx, view: View, key: string): { note?: { text: string; title: string } } {
  const bonus = view.me.state.gearBonus;
  const def = ctx.ix.card(key);
  if (!bonus || (bonus.atk === 0 && bonus.hp === 0) || def?.kind !== "GEAR" || !def.effects.some((e) => e.actions.some((a) => a.type === "BUFF"))) return {};
  const sign = (n: number): string => (n >= 0 ? `+${n}` : String(n));
  return { note: { text: `${sign(bonus.atk)}/${sign(bonus.hp)}`, title: tr(`Powered up: gives ${sign(bonus.atk)}/${sign(bonus.hp)} more to each unit it buffs`, `เสริมพลังแล้ว: ให้เพิ่มอีก ${sign(bonus.atk)}/${sign(bonus.hp)} กับทุกตัวที่บัฟ`) } };
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
  const heroText = hero ? ctx.ix.heroText(hero) : "";

  const portrait = h(
    "div",
    { class: "hero-box" },
    h("div", { class: `portrait ${ctx.ix.heroArt(hero) ? "has-art" : ""}`, style: bg(ctx.ix.heroArt(hero)), title: `${name}${heroText ? `\n${heroText}` : ""}` }, !ctx.ix.heroArt(hero) && h("span", { text: initialsOf(name) }), h("span", { class: "hpgem", text: String(Math.max(0, self?.hp ?? 0)) }), (self?.armor ?? 0) > 0 && h("span", { class: "armorgem", text: String(self?.armor) })),
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
      h("div", { class: "power-text", text: heroDef ? powerBody(ctx.ix.heroText(heroDef.key)) || tr("No hero power.", "ไม่มีพลัง Hero") : "" }),
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
    h("div", { class: "next-turn-box" }, h("div", { class: "muted", text: view.phase === "RECRUIT" ? tr("Battle in", "ต่อสู้ใน") : tr("Next turn in", "เทิร์นถัดไปใน") }), h("div", { class: "countdown-big", id: "timer-big", text: formatClock(ctx.clock.remaining(view.deadline)) })),
  );

  return h("div", { class: "bottom" }, h("div", { class: "hero-zone" }, portrait, info), hand, gold);
}

function dragData(e: DragEvent, zone: string, index: number, kind: "unit" | "gear" = "unit"): void {
  e.dataTransfer?.setData("text/plain", JSON.stringify({ zone, index }));
  e.dataTransfer && (e.dataTransfer.effectAllowed = "move");
  document.body.classList.add(DRAGGING);
  // Lets CSS light up the places this card can go (sell, buy, board).
  document.body.dataset.drag = zone;
  // A unit gets a frame where it would land on the board; a gear does not (it goes on a unit).
  document.body.dataset.dragKind = kind;
  if (zone === "board") (e.currentTarget as HTMLElement | null)?.classList.add("drag-source");
}

function endDrag(): void {
  document.body.classList.remove(DRAGGING);
  delete document.body.dataset.drag;
  delete document.body.dataset.dragKind;
  for (const g of document.querySelectorAll(".drop-ghost")) g.remove();
  for (const el of document.querySelectorAll(".drag-source")) el.classList.remove("drag-source");
  if (aimMode() === "drag") stopAim();
}

/** Where on the board a drop at `x` lands: the number of units whose middle is left of it. */
function boardIndexAt(board: HTMLElement, x: number): number {
  const slots = [...board.querySelectorAll<HTMLElement>(".board-cards > .slot")];
  // The landing frame pushes the units after it to the right; measure them where they were without it.
  const ghost = board.querySelector<HTMLElement>(".drop-ghost");
  const shift = ghost ? ghost.getBoundingClientRect().width + 16 : 0;
  return slots.filter((s) => {
    const r = s.getBoundingClientRect();
    const pushed = ghost !== null && (ghost.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    return r.left + r.width / 2 - (pushed ? shift : 0) < x;
  }).length;
}

/**
 * Show a card-sized frame where a dragged unit would land (the units around it make room). Gear gets no
 * frame: it goes on a unit, and the aim reticle shows which. A full board shows none (except reordering).
 */
function placeGhost(board: HTMLElement, x: number, full: boolean): void {
  const row = board.querySelector<HTMLElement>(".board-cards");
  if (!row) return;
  const kind = document.body.dataset.dragKind;
  const zone = document.body.dataset.drag;
  let ghost = row.querySelector<HTMLElement>(".drop-ghost");
  if (kind === "gear" || (full && zone !== "board")) {
    ghost?.remove();
    return;
  }
  const at = boardIndexAt(board, x);
  const slots = [...row.querySelectorAll<HTMLElement>(":scope > .slot")];
  if (!ghost) {
    ghost = document.createElement("div");
    ghost.className = "drop-ghost";
    const sample = slots.find((el) => !el.classList.contains("drag-source"))?.querySelector(".card") ?? slots[0]?.querySelector(".card");
    if (sample) {
      const r = sample.getBoundingClientRect();
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
    }
  }
  const before = slots[at] ?? row.querySelector(":scope > .drop-marker");
  if (ghost.parentElement !== row || ghost.nextElementSibling !== before) row.insertBefore(ghost, before);
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
      if (isGear(ctx, view, d.index)) useGearFromHand(ctx, view, d.index, gearSlots(ctx, view, d.index) ? slotUnder(e) : undefined);
      else void ctx.act({ type: "PLAY", handIndex: d.index, position: Math.min(at, s.board.length) });
    } else if (d.zone === "board") {
      const to = Math.min(at > d.index ? at - 1 : at, s.board.length - 1);
      if (to !== d.index) void ctx.act({ type: "REORDER", from: d.index, to });
    } else if (d.zone === "shop" || d.zone === "gear") {
      const key = d.zone === "shop" ? s.shop[d.index] : s.shopGear;
      const onUnit = slotUnder(e);
      if (!key) return;
      const bought = await ctx.act(d.zone === "shop" ? { type: "BUY", index: d.index } : { type: "BUY_GEAR" });
      // Then play (or use) it: it is the last copy of that card in the hand, unless a triple swallowed it.
      const hand = ctx.store.state.view?.me.state.hand ?? [];
      const i = hand.map((u) => u.key).lastIndexOf(key);
      if (!bought || i < 0) return;
      const now = ctx.store.state.view ?? view;
      if (d.zone === "gear") useGearFromHand(ctx, now, i, gearSlots(ctx, now, i) ? onUnit : undefined);
      else void ctx.act({ type: "PLAY", handIndex: i, position: Math.min(at, now.me.state.board.length) });
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

/** Whether the hand gear at `handIndex` has something to act on (same rule as the server's: no unit / no Giant = no). */
function gearUsableHere(ctx: Ctx, view: View, handIndex: number): boolean {
  const def = ctx.ix.card(view.me.state.hand[handIndex]?.key ?? "");
  if (def?.effects.some((e) => e.target?.selector === "GIANT_SLOT") && !view.me.state.giant) return false;
  const slots = gearSlots(ctx, view, handIndex);
  return slots === null || slots.length > 0;
}

/** Slots the hand gear at `handIndex` can go on (null: it needs no unit). */
const gearSlots = (ctx: Ctx, view: View, handIndex: number): number[] | null =>
  gearTargetSlots(ctx.ix.card(view.me.state.hand[handIndex]?.key ?? ""), view.me.state.board.map((u) => ctx.ix.card(u.key)), ctx.ix.lineage);

/** The hand gear being aimed at a unit, if any (it must still be a gear in that slot). */
function aimedGear(ctx: Ctx, view: View): number | undefined {
  const sel = ctx.store.state.selected;
  return sel?.zone === "hand" && view.phase === "RECRUIT" && isGear(ctx, view, sel.index) ? sel.index : undefined;
}

/** Use a hand gear: straight away if it needs no unit or only one fits, otherwise wait for a click on a unit. */
function useGearFromHand(ctx: Ctx, view: View, handIndex: number, target?: number): void {
  const slots = gearSlots(ctx, view, handIndex);
  if (target === undefined && slots && slots.length > 1) {
    ctx.store.set({ selected: { zone: "hand", index: handIndex } });
    return;
  }
  if (slots && slots.length === 0) {
    ctx.toast(tr(`${ctx.ix.cardName(view.me.state.hand[handIndex]?.key ?? "")} has no unit to go on`, `${ctx.ix.cardName(view.me.state.hand[handIndex]?.key ?? "")} ไม่มียูนิตที่ใช้ได้`), "error");
    return;
  }
  ctx.store.set({ selected: undefined });
  void ctx.act(target === undefined ? { type: "USE_GEAR", handIndex } : { type: "USE_GEAR", handIndex, target });
}

/** The board slot under a drop, if the pointer is over a unit. */
function slotUnder(e: DragEvent): number | undefined {
  const slot = (e.target as HTMLElement | null)?.closest<HTMLElement>(".board-cards > .slot");
  if (!slot?.parentElement) return undefined;
  const i = [...slot.parentElement.querySelectorAll(":scope > .slot")].indexOf(slot);
  return i >= 0 ? i : undefined;
}
const allowDrop = (e: DragEvent): void => e.preventDefault();

function boardCard(ctx: Ctx, view: View, i: number): HTMLElement {
  const u = view.me.state.board[i]!;
  const st = view.me.boardStats[i] ?? { atk: 0, hp: 0 };
  const recruiting = view.phase === "RECRUIT" && view.me.alive;
  const last = view.me.state.board.length - 1;
  const canCombine = recruiting && (view.me.combinable ?? []).includes(i);
  const form = ctx.ix.card(u.key)?.gattaiInto;
  const el = cardEl(ctx.ix, { key: u.key, atk: st.atk, hp: st.hp, golden: u.golden, extraKeywords: u.keywords ?? [], small: true, minion: true, buffs: u.buffs ?? [], classes: canCombine ? ["core-ready"] : [] });
  const aim = aimedGear(ctx, view);
  const aimable = aim !== undefined && (gearSlots(ctx, view, aim) ?? []).includes(i);
  return h(
    "div",
    {
      class: `slot ${aim === undefined ? "" : aimable ? "aim-ok" : "aim-no"}`,
      draggable: recruiting && aim === undefined,
      on: {
        dragstart: (e) => dragData(e, "board", i),
        dragend: endDrag,
        click: (e) => {
          if (!aimable || aim === undefined) return;
          e.stopPropagation();
          useGearFromHand(ctx, view, aim, i);
        },
      },
    },
    el,
    recruiting && h("div", { class: "slot-actions" },
      h("button", { class: "mini", text: "<", disabled: i === 0, title: tr("Move left", "ย้ายไปซ้าย"), on: { click: () => void ctx.act({ type: "REORDER", from: i, to: i - 1 }) } }),
      h("button", { class: "mini", text: `${tr("Sell", "ขาย")} +${view.me.limits.sellValue}`, on: { click: () => void ctx.act({ type: "SELL", from: "board", index: i }) } }),
      h("button", { class: "mini", text: ">", disabled: i === last, title: tr("Move right", "ย้ายไปขวา"), on: { click: () => void ctx.act({ type: "REORDER", from: i, to: i + 1 }) } })),
    // A Gattai core says what its group becomes; when the group is complete it offers to combine for good.
    form && h("div", { class: `core-tag ${canCombine ? "ready" : ""}`, title: tr(`Gattai core: lead a Gattai group (it must be the leftmost) to become ${ctx.ix.cardName(form)}`, `Gattai core: วางไว้ซ้ายสุดของกลุ่ม Gattai เพื่อรวมเป็น ${ctx.ix.cardName(form)}`) }, `Core → ${ctx.ix.cardName(form)}`),
    canCombine && h("button", { class: "combine-btn", title: tr(`Merge this group into ${ctx.ix.cardName(form ?? "")} for good (frees board slots)`, `รวมกลุ่มนี้เป็น ${ctx.ix.cardName(form ?? "")} ถาวร (บอร์ดว่างขึ้น)`), on: { click: () => void ctx.act({ type: "COMBINE", index: i }) } }, "⚙ Combine"),
    (u.turns ?? 0) > 0 && ctx.ix.card(u.key)?.henshin && h("div", { class: "henshin", text: `henshin ${u.turns}/${ctx.ix.card(u.key)?.henshin?.afterTurns}` }),
  );
}

function endDrop(ctx: Ctx, view: View): HTMLElement {
  void ctx;
  void view;
  return h("div", { class: "end-drop", title: tr("Drop anywhere on the board", "วางตรงไหนบนบอร์ดก็ได้") }, h("span", { text: "+" }));
}

function handCard(ctx: Ctx, view: View, i: number): HTMLElement {
  const u = view.me.state.hand[i]!;
  const st = view.me.handStats[i] ?? { atk: 0, hp: 0 };
  const recruiting = view.phase === "RECRUIT" && view.me.alive;
  const gear = isGear(ctx, view, i);
  const full = view.me.state.board.length >= view.me.limits.boardSize;
  return h(
    "div",
    {
      class: "slot",
      draggable: recruiting,
      attrs: { "data-hand": String(i) },
      on: {
        dragstart: (e) => {
          dragData(e, "hand", i, gear ? "gear" : "unit");
          // A gear that goes on a chosen unit: drag a reticle instead of the card.
          const slots = gear ? gearSlots(ctx, view, i) : null;
          if (slots && slots.length > 0) {
            hideDragImage(e);
            startAim(e.currentTarget as HTMLElement, slots, "drag");
          }
        },
        dragend: endDrag,
      },
    },
    cardEl(ctx.ix, { key: u.key, atk: st.atk, hp: st.hp, golden: u.golden, extraKeywords: u.keywords ?? [], small: true, buffs: u.buffs ?? [], ...gearNote(ctx, view, u.key) }),
    recruiting && h("div", { class: "slot-actions" },
      h("button", { class: "mini primary", text: gear ? (aimedGear(ctx, view) === i ? tr("Cancel", "ยกเลิก") : tr("Use", "ใช้")) : tr("Play", "ลงบอร์ด"), disabled: !gear && full, on: { click: () => (gear ? (aimedGear(ctx, view) === i ? ctx.store.set({ selected: undefined }) : useGearFromHand(ctx, view, i)) : void ctx.act({ type: "PLAY", handIndex: i, position: view.me.state.board.length })) } }),
      (!gear || !gearUsableHere(ctx, view, i)) && h("button", { class: "mini", text: `${tr("Sell", "ขาย")} +${view.me.limits.sellValue}`, title: gear ? tr("This gear has nothing to act on right now, so it can be sold", "Gear นี้ยังใช้ไม่ได้ตอนนี้ จึงขายได้") : "", on: { click: () => void ctx.act({ type: "SELL", from: "hand", index: i }) } })),
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
    { class: "sell-zone", title: tr("Drag a unit here to sell it", "ลากยูนิตมาที่นี่เพื่อขาย"), on: { dragover: allowDrop, drop: sell, dragenter: () => zone.classList.add("over"), dragleave: (e) => !zone.contains(e.relatedTarget as Node | null) && zone.classList.remove("over") } },
    h("span", { class: "sell-icon", text: "♻" }),
    h("span", { class: "sell-copy" }, h("span", { class: "sell-title", text: tr("Sell", "ขาย") }), h("span", { class: "sell-hint idle-hint", text: tr("drag a unit here", "ลากยูนิตมาที่นี่") }), h("span", { class: "sell-hint drag-hint", text: tr("release to sell", "ปล่อยเพื่อขาย") })),
    h("span", { class: "sell-value" }, h("span", { text: `+${view.me.limits.sellValue}` }), h("span", { class: "sell-unit", text: "Energy" })),
  );
  return zone;
}

function giantSlot(ctx: Ctx, view: View): HTMLElement {
  const g = view.me.state.giant;
  const sg = view.me.state.superGattai;
  const extraOnBoard = view.me.state.board.some((u) => ctx.ix.card(u.key)?.colors.includes("EXTRA"));
  return h("div", { class: `giant-slot ${sg && extraOnBoard ? "super" : ""}` }, h("div", { class: "muted small", text: "Giant Robo" }),
    sg && h("div", { class: `super-tag ${extraOnBoard ? "on" : ""}`, title: tr(`Super Gattai: +${sg.atk}/+${sg.hp} and the Extra Ranger's keywords in fights with an Extra Ranger on your board`, `Super Gattai: +${sg.atk}/+${sg.hp} และ keyword ของ Extra Ranger ในการต่อสู้ที่มี Extra Ranger บนบอร์ด`), text: extraOnBoard ? "SUPER GATTAI" : tr("Super Gattai: needs an Extra Ranger", "Super Gattai: ต้องมี Extra Ranger") }), g ? cardEl(ctx.ix, { key: g.key, small: true, minion: true }) : h("div", { class: "empty-giant", text: tr("empty", "ว่าง") }));
}

function gaugeBars(ctx: Ctx, view: View): HTMLElement {
  return h(
    "div",
    { class: "gauges" },
    ...ctx.ix.snapshot.gauges.map((g) => {
      const value = view.me.state.gauges[g.key] ?? 0;
      const t = gaugeText(g, ctx.ix.cardName, ctx.ix.rollCallColors);
      const el = h("div", { class: "gauge" }, h("span", { class: "gname", text: g.name }), h("div", { class: "gbar" }, h("div", { class: "gfill", style: `width:${(value / g.max) * 100}%` }), ...g.thresholds.map((th) => h("div", { class: "gmark", style: `left:${(th.at / g.max) * 100}%` }))), h("span", { class: "gnum", text: `${value}/${g.max}` }), h("span", { class: "ghint", text: t.short }));
      el.addEventListener("mouseenter", () => showGaugeCard(ctx, view, el, g));
      el.addEventListener("mouseleave", hidePlayerCard);
      return el;
    }),
  );
}

/** A gauge explained: how it fills, what it pays, the reward card, and cards in this match that fill it. */
function showGaugeCard(ctx: Ctx, view: View, anchor: HTMLElement, g: (typeof ctx.ix.snapshot.gauges)[number]): void {
  hidePlayerCard();
  const t = gaugeText(g, ctx.ix.cardName, ctx.ix.rollCallColors);
  const inMatch = inMatchOf(view);
  const shopUnits = [...ctx.ix.cards.values()].filter((c) => c.kind === "UNIT" && !c.token && inMatch(c));
  const triggers = new Set(g.sources.map((s) => s.trigger));
  // Units that feed it: Sentai colours for Roll Call, Henshin units for transformations.
  const feeders = shopUnits.filter((c) => ((triggers.has("ON_ROLL_CALL") || triggers.has("ON_ROLL_CALL_WIN")) && c.colors.length > 0) || (triggers.has("HENSHIN") && c.henshin !== undefined));
  const seenColors = new Set<string>();
  const examples = feeders.filter((c) => {
    const key = c.colors[0] ?? c.key;
    if (seenColors.has(key)) return false;
    seenColors.add(key);
    return true;
  }).slice(0, 5);
  const rewardKeys = g.thresholds.flatMap((th) => th.reward.flatMap((r) => (r.type === "ADD_TO_HAND" ? [r.cardKey] : [])));
  const value = view.me.state.gauges[g.key] ?? 0;
  const card = h(
    "div",
    { class: "player-card gauge-card" },
    h("div", { class: "pc-name", text: `${g.name} · ${value}/${g.max}` }),
    h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: tr("How it fills", "เติมยังไง") }), ...t.fills.map((f) => h("div", { class: "pc-text", text: f }))),
    h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: tr("What it gives", "ได้อะไร") }), ...t.rewards.map((r) => h("div", { class: "pc-text", text: r })), ...rewardKeys.map((k) => h("div", { class: "pc-text gauge-reward-text" }, h("strong", { text: `${ctx.ix.cardName(k)}: ` }), ctx.ix.cardText(k))), rewardKeys.length > 0 && h("div", { class: "gauge-examples" }, ...rewardKeys.map((k) => cardEl(ctx.ix, { key: k, small: true }))), rewardKeys.length > 0 && h("div", { class: "pc-text muted", text: tr("All of them are in the Book, Special tab.", "ดูทั้งหมดได้ในหนังสือ แท็บพิเศษ") })),
    examples.length > 0 && h("div", { class: "pc-section" }, h("div", { class: "pc-label", text: tr("Cards in this match that fill it", "การ์ดในเกมนี้ที่เติม gauge นี้") }), h("div", { class: "gauge-examples" }, ...examples.map((c) => cardEl(ctx.ix, { key: c.key, small: true })))),
    examples.length === 0 && h("div", { class: "pc-section muted", text: tr("No card in this match's factions fills it.", "ไม่มีการ์ดของเผ่าในเกมนี้ที่เติม gauge นี้") }),
  );
  document.body.append(card);
  playerCard = card;
  const r = anchor.getBoundingClientRect();
  card.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - card.offsetWidth - 8))}px`;
  card.style.top = `${Math.min(r.bottom + 8, window.innerHeight - card.offsetHeight - 8)}px`;
}

// -------------------------------------------------------- discover / relics

function offersModal(ctx: Ctx, view: View): HTMLElement | null {
  const s = view.me.state;
  const state = ctx.store.state;
  if (view.phase !== "RECRUIT" || !view.me.alive) return null;
  // Hidden to look at the board and the tavern first: a button brings the choice back.
  if (state.hideOffers) {
    if (!s.relicOffer && s.discovers.length === 0) return null;
    return h("button", { class: "btn primary offers-reopen", text: s.relicOffer ? tr("Choose your Relic", "เลือก Relic") : tr("Choose your card", "เลือกการ์ด"), on: { click: () => ctx.store.set({ hideOffers: false }) } });
  }
  const hide = h("button", { class: "btn", text: tr("Hide (look at the board)", "ซ่อน (ดูบอร์ดและร้านก่อน)"), title: tr("A button brings it back. If time runs out, the free option is taken.", "กดปุ่มเพื่อเปิดกลับได้ ถ้าหมดเวลาจะได้ตัวเลือกที่ฟรีอัตโนมัติ"), on: { click: () => ctx.store.set({ hideOffers: true }) } });

  if (s.relicOffer) {
    const offer = s.relicOffer;
    return h(
      "div",
      { class: "modal" },
      h("div", { class: "modal-box" }, h("h2", { text: tr(`Choose a ${offer.tier === "LESSER" ? "Lesser" : "Greater"} Relic`, `เลือก ${offer.tier === "LESSER" ? "Lesser" : "Greater"} Relic`) }), h("p", { class: "muted", text: tr("It stays with you for the rest of the game. Free ones are always safe; the rest cost Energy now.", "อยู่กับคุณจนจบเกม ตัวฟรีเลือกได้เสมอ ตัวอื่นจ่าย Energy ตอนนี้") }),
        h("div", { class: "cards" }, ...offer.options.map((key, i) => {
          const r = ctx.ix.relics.get(key);
          const cost = r?.cost ?? 0;
          return h("div", { class: `relic-card ${cost > s.energy ? "unaffordable" : ""}`, title: ctx.ix.relicText(key), on: { click: () => cost <= s.energy && void ctx.act({ type: "CHOOSE_RELIC", index: i }) } }, h("div", { class: "cost", text: String(cost) }), artBox("relic-art", ctx.ix.relicArt(key), r?.name ?? key), h("h3", { text: r?.name ?? key }), h("p", { text: ctx.ix.relicText(key) }), (r?.factions.length ?? 0) > 0 && h("p", { class: "muted small", text: r?.factions.map(ctx.ix.factionName).join(", ") }));
        })), hide),
    );
  }

  const discover = s.discovers[0];
  if (discover) {
    const giant = discover.destination === "GIANT";
    return h(
      "div",
      { class: "modal" },
      h("div", { class: "modal-box" }, h("h2", { text: giant ? tr("Choose a Giant Robo", "เลือก Giant Robo") : tr("Discover a card", "เลือกรับการ์ด") }), giant && h("p", { class: "muted", text: tr("It waits in your Giant Slot and joins the fight when your team is nearly beaten.", "รออยู่ในช่อง Giant และลงสนามเมื่อทีมเกือบแพ้") }),
        h("div", { class: "cards" }, ...discover.options.map((key, i) => cardEl(ctx.ix, { key, onClick: () => void ctx.act({ type: "PICK_DISCOVER", index: i }) }))), hide),
    );
  }
  return null;
}

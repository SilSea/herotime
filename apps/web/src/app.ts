import { ServerClock, formatClock } from "./clock.js";
import { ContentIndex } from "./content-index.js";
import { Api, Net } from "./net.js";
import type { AuthResult, Intent, MatchView, PracticeOptions } from "./protocol.js";
import { addToast, applyEvent, applyStatus, applyView, removeToast, Store } from "./store.js";
import { adminHasFocus, renderAdmin, resetAdmin } from "./ui/admin.js";
import { cardEl, KEYWORD_ICON_OF, triggerInfo } from "./ui/card.js";
import { keywordName, keywordText, relatedCards } from "./format.js";
import { serverText, tr } from "./i18n.js";
import { cardSound, hasUploaded, play, playMusic, setContentSounds, slotForIntent } from "./sound.js";
import { langToggle, muteToggle } from "./ui/lang.js";
import { renderAuth } from "./ui/auth.js";
import type { Ctx } from "./ui/ctx.js";
import { h, mount } from "./ui/dom.js";
import { renderLibrary } from "./ui/library.js";
import { invalidateStats, renderLobby } from "./ui/lobby.js";
import { DRAGGING, hidePlayerCard, renderMatch } from "./ui/match.js";
import { ReplayView } from "./ui/replay-view.js";
import { userMessage } from "./errors.js";

const TOKEN_KEY = "herotime.token";

const storage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      // private mode: you will just have to log in again next time
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // nothing stored, nothing to clear
    }
  },
};

export function startApp(root: HTMLElement): void {
  const store = new Store();
  const clock = new ServerClock();
  const api = new Api();
  const net = new Net((token) => io({ auth: { token }, transports: ["websocket"] }));
  const replayHost = document.getElementById("replay-host") as HTMLElement;
  const toastHost = document.getElementById("toasts") as HTMLElement;
  let replay: ReplayView | undefined;
  let replayTurn = 0;
  /** The match we walked out of: anything still arriving for it is ignored. */
  let leftMatch: string | undefined;
  let content: ContentIndex | undefined;
  let wantedVersion = 0;
  const pendingIntents = new Set<string>();

  const toast = (text: string, kind: "info" | "error" = "info"): void => {
    store.update((s) => addToast(s, text, kind));
    const id = store.state.toasts.at(-1)?.id;
    if (id !== undefined) window.setTimeout(() => store.update((s) => removeToast(s, id)), kind === "error" ? 6000 : 3500);
  };

  const ctx = (): Ctx => ({
    store,
    net,
    api,
    clock,
    ix: content as ContentIndex,
    toast,
    async act(intent: Intent) {
      // A double click would send the same intent twice; the second one refers to a slot that has already changed.
      const key = JSON.stringify(intent);
      if (pendingIntents.has(key)) return false;
      pendingIntents.add(key);
      // The card being played, read before the hand changes: it may have its own sound.
      const played = intent.type === "PLAY" ? store.state.view?.me.state.hand[intent.handIndex]?.key : undefined;
      try {
        const ack = await net.intent(intent);
        if (!ack.ok) {
          toast(serverText(ack.error), "error");
          play("denied");
        } else {
          const slot = slotForIntent(intent.type);
          if (slot) play(slot, played ? unitSound(played, "play") : undefined);
          // Combining a Gattai group in the recruit phase gets the same burst as a merge in a fight.
          if (intent.type === "COMBINE") {
            const el = h("div", { class: "vfx-splash vfx-gattai vfx-screen", text: "GATTAI!" });
            document.body.append(el);
            window.setTimeout(() => el.remove(), 1200);
          }
        }
        return ack.ok;
      } finally {
        pendingIntents.delete(key);
      }
    },
    async refreshContent(version?: number) {
      try {
        content = new ContentIndex(await api.content(version));
        setContentSounds(content.snapshot.sounds);
        store.set({ content });
      } catch {
        // keep what we have: a stale card list is better than a blank screen
      }
    },
    async login(result: AuthResult) {
      storage.set(result.token);
      resetAdmin();
      invalidateStats();
      store.set({ token: result.token, user: { id: result.user.id, username: result.user.username, role: result.user.role }, screen: "lobby" });
      net.connect(result.token);
    },
    logout() {
      storage.clear();
      resetAdmin();
      net.disconnect();
      store.set({ token: undefined, user: undefined, view: undefined, matchId: undefined, status: { state: "idle" }, screen: "auth", connected: false });
    },
    async startPractice(options: PracticeOptions) {
      const ack = await net.practice(options);
      if (!ack.ok) toast(serverText(ack.error), "error");
    },
    async joinQueue(kind = "standard") {
      const ack = await net.joinQueue(kind);
      if (!ack.ok) toast(serverText(ack.error), "error");
    },
    async leaveQueue() {
      const ack = await net.leaveQueue();
      if (!ack.ok) toast(serverText(ack.error), "error");
      else if (ack.status) store.update((s) => applyStatus(s, ack.status as never));
    },
    async createRoom() {
      const ack = await net.createRoom();
      if (!ack.ok) toast(serverText(ack.error), "error");
      else if (ack.status) store.update((s) => applyStatus(s, ack.status as never));
    },
    async joinRoom(code: string) {
      const ack = await net.joinRoom(code);
      if (!ack.ok) toast(serverText(ack.error), "error");
      else if (ack.status) store.update((s) => applyStatus(s, ack.status as never));
    },
    async startRoom(bots: number) {
      const ack = await net.startRoom(bots);
      if (!ack.ok) toast(serverText(ack.error), "error");
    },
    async leaveMatch() {
      // Messages for the match already on their way must not pull us back into it.
      leftMatch = store.state.matchId;
      await net.leaveMatch();
      invalidateStats();
      wantedVersion = 0;
      void ctx().refreshContent();
      store.set({ screen: "lobby", view: undefined, matchId: undefined, combat: undefined, replayPending: undefined, placements: undefined, status: { state: "idle" } });
    },
    go(screen) {
      store.set({ screen });
    },
  });

  /** A card's own sound (or its faction's), if the content has one. */
  const unitSound = (cardKey: string, kind: "play" | "attack" | "death" | "transform"): string | undefined =>
    content ? cardSound(content.card(cardKey), (f) => content?.factions.get(f), kind) : undefined;

  /** Sounds for what a new view says happened: a triple, a transformation, a discard, being knocked out. */
  const soundChanges = (before: MatchView | undefined, after: MatchView): void => {
    if (!before || before.me.id !== after.me.id) return;
    const a = before.me.state.moments;
    const b = after.me.state.moments;
    if ((b?.triples ?? 0) > (a?.triples ?? 0)) play("triple");
    if ((b?.transforms ?? 0) > (a?.transforms ?? 0)) play("transform", b?.lastForm ? unitSound(b.lastForm, "transform") : undefined);
    if ((b?.discards ?? 0) > (a?.discards ?? 0)) play("discard");
    if (before.me.alive && !after.me.alive && after.phase !== "ENDED") play("eliminated");
  };

  // ----------------------------------------------------------- server messages
  net.on("connection", (connected) => store.set({ connected }));
  net.on("status", (status) => store.update((s) => applyStatus(s, status)));
  net.on("view", (m) => {
    if (m.matchId === leftMatch) return;
    const before = store.state.view;
    store.update((s) => applyView(s, m, clock));
    if (store.state.view) soundChanges(before, store.state.view);
    const shown = content?.snapshot.version;
    if (m.contentVersion !== undefined && shown !== undefined && m.contentVersion !== shown && wantedVersion !== m.contentVersion) {
      wantedVersion = m.contentVersion; // once per version, not on every view message
      void ctx().refreshContent(m.contentVersion);
    }
  });
  net.on("event", (m) => {
    if (m.matchId !== leftMatch) store.update((s) => applyEvent(s, m));
  });
  net.on("matchError", (e) => toast(serverText(e), "error"));
  net.on("authError", () => {
    toast(tr("Your login expired. Please log in again.", "การล็อกอินหมดอายุ กรุณาล็อกอินใหม่"), "error");
    ctx().logout();
  });

  // ---------------------------------------------------------------- rendering
  const frame = (inner: HTMLElement): HTMLElement => {
    const s = store.state;
    const nav = (id: "lobby" | "library" | "admin", label: string) => h("button", { class: `tab ${s.screen === id ? "active" : ""}`, text: label, on: { click: () => store.set({ screen: id }) } });
    return h(
      "div",
      { class: "shell" },
      h(
        "header",
        { class: "app-header" },
        h("span", { class: "logo small", text: "HeroTime" }),
        h("nav", { class: "tabs" }, nav("lobby", tr("Play", "เล่น")), nav("library", tr("Library", "คลังการ์ด")), s.user?.role === "ADMIN" && nav("admin", "Admin")),
        h("span", { class: "spacer" }),
        !s.connected && h("span", { class: "conn bad", text: tr("reconnecting...", "กำลังเชื่อมต่อใหม่...") }),
        muteToggle(store),
        langToggle(store),
        h("span", { class: "muted", text: s.user?.username ?? "" }),
        h("button", { class: "btn", text: tr("Log out", "ออกจากระบบ"), on: { click: () => ctx().logout() } }),
      ),
      inner,
    );
  };

  const draw = (): void => {
    const s = store.state;
    if (document.body.classList.contains(DRAGGING)) return; // never redraw under a card being dragged
    if (!content || !s.user) {
      renderAuth(root, api, (r) => ctx().login(r));
      return;
    }
    if (s.screen === "admin" && adminHasFocus()) return; // someone is typing: leave the form alone
    const inner = h("div", { class: "screen" });
    if (s.screen === "match" && s.view) {
      renderMatch(inner, ctx());
      mount(root, inner);
    } else if (s.screen === "library") {
      renderLibrary(inner, ctx());
      mount(root, frame(inner));
    } else if (s.screen === "admin" && s.user.role === "ADMIN") {
      renderAdmin(inner, ctx());
      mount(root, frame(inner));
    } else {
      renderLobby(inner, ctx());
      mount(root, frame(inner));
    }
    syncReplay();
    hidePreview();
    hidePlayerCard();
    announce();
    playMusic(musicFor(s));
    const log = document.getElementById("log");
    if (log) log.scrollTop = log.scrollHeight;
  };

  /** Which music fits where the player is. */
  const musicFor = (s: typeof store.state): string => {
    if (s.screen !== "match" || !s.view) return "lobby";
    if (s.view.phase === "BATTLE") return "battle";
    if (s.view.phase === "ENDED") return s.view.me.placement === 1 ? "endWin" : "endLose";
    return "recruit";
  };

  const syncReplay = (): void => {
    const phase = store.state.view?.phase;
    if (phase === "RECRUIT" || !store.state.view) {
      // The next turn has begun (or we left the match): any fight still on screen, or waiting to be shown, is old news.
      replay?.close();
      replay = undefined;
      if (store.state.replayPending) store.set({ replayPending: undefined });
      return;
    }
    const s = store.state;
    const pending = s.replayPending;
    if (pending && (!replay || replayTurn !== pending.turn)) {
      replay?.close();
      replayTurn = pending.turn;
      const budget = Math.max(3000, (clock.remaining(s.view?.deadline ?? null) ?? 15_000) - 2500);
      replay = new ReplayView(replayHost, pending, content as ContentIndex, {
        budgetMs: budget,
        nextTurnText: () => `${tr("Next turn in", "เทิร์นถัดไปใน")} ${formatClock(clock.remaining(store.state.view?.deadline ?? null))}`,
        onClose: () => {
          replay = undefined;
          store.update((st) => (st.replayPending?.turn === pending.turn ? { ...st, replayPending: undefined } : st));
        },
      });
    }
  };

  // ---- phase banner: a short "Turn 3" / "Battle!" splash when a phase begins
  let bannerKey = "";
  const announce = (): void => {
    const s = store.state;
    if (!s.view || s.screen !== "match") return;
    const key = `${s.matchId}:${s.view.turn}:${s.view.phase}`;
    if (key === bannerKey) return;
    bannerKey = key;
    // No banner for battles: the replay opens at that moment and would be covered by it.
    const text = s.view.phase === "RECRUIT" ? `${tr("Turn", "เทิร์น")} ${s.view.turn}` : s.view.phase === "HERO_SELECT" ? tr("Choose your hero", "เลือก Hero") : "";
    if (!text) return;
    if (s.view.phase === "RECRUIT" && s.view.me.alive) play("turnStart");
    for (const old of document.querySelectorAll(".banner")) old.remove(); // a new phase replaces the last banner
    const el = h("div", { class: "banner", text });
    document.body.append(el);
    window.setTimeout(() => el.remove(), 1700);
  };

  // ---- big card preview: point at any card to read it at a comfortable size
  const preview = h("div", { class: "card-preview", id: "card-preview" });
  document.body.append(preview);
  function hidePreview(): void {
    preview.classList.remove("show");
    preview.replaceChildren();
  }
  document.addEventListener("mouseover", (e) => {
    const card = (e.target as Element | null)?.closest?.(".card") as HTMLElement | null;
    if (!card || !card.dataset.key || card.closest(".card-preview") || document.body.classList.contains(DRAGGING)) return hidePreview();
    const big = card.cloneNode(true) as HTMLElement;
    big.classList.remove("small", "minion", "clickable", "unaffordable", "attacking", "hit", "focus", "dying", "entering", "huge");
    big.classList.add("preview-card");
    big.style.transform = "";
    // Battlegrounds-style: one box per keyword and per kind of ability, next to the big card.
    const kws = (card.dataset.kws ?? "").split(",").filter(Boolean);
    const triggers = (card.dataset.triggers ?? "").split(",").filter((t) => t && triggerInfo(t));
    const box = (icon: string, title: string, text: string): HTMLElement => h("div", { class: "kw-box" }, h("div", { class: "kw-box-title" }, h("span", { class: "pi-icon", text: icon }), title), h("div", { class: "kw-box-text", text }));
    const [turns, form] = (card.dataset.henshin ?? "").split("|");
    const boxes = [
      ...triggers.map((t) => box(triggerInfo(t)?.icon ?? "•", triggerInfo(t)?.name ?? t, triggerInfo(t)?.text ?? "")),
      ...(turns ? [box("✧", `Henshin (${turns})`, tr(`After ${turns} turn${turns === "1" ? "" : "s"} on your board, transforms into ${form}.`, `อยู่บนบอร์ดครบ ${turns} เทิร์น จะแปลงร่างเป็น ${form}`))] : []),
      ...(card.dataset.core ? [box("◈", "Gattai core", tr(`Put it leftmost of enough adjacent Gattai units and press Combine: the group becomes ${card.dataset.core} for good.`, `วางไว้ซ้ายสุดของยูนิต Gattai ที่ติดกันให้ครบจำนวน แล้วกด Combine ทั้งกลุ่มจะรวมเป็น ${card.dataset.core} ถาวร`))] : []),
      ...(card.dataset.ultimate ? [box("★", "Final Form", tr(`A Final Form card (Gear, or a Gauge reward) can turn this into ${card.dataset.ultimate}. It keeps its bonuses and keywords.`, `การ์ด Final Form (Gear หรือรางวัลจาก Gauge) เปลี่ยนการ์ดนี้เป็นร่าง Final Form ${card.dataset.ultimate} ได้ บัฟและ keyword เดิมติดไปด้วย`))] : []),
      ...kws.map((k) => box(KEYWORD_ICON_OF(k), keywordName(k), keywordText(k))),
    ];
    // The cards it brings in (summons, adds to hand, its forms...) or points at, so a player sees them before choosing.
    const ix = content;
    const related = ix ? relatedCards(ix.card(card.dataset.key)).filter((r) => ix.card(r.key)) : [];
    const relatedEl =
      ix && related.length > 0
        ? h("div", { class: "related-cards" }, ...related.map((r) => h("div", { class: "related-card" }, h("div", { class: "related-label", text: r.label }), cardEl(ix, { key: r.key, small: true }))))
        : null;
    const info = h("div", { class: "kw-boxes" }, ...boxes, relatedEl);
    preview.replaceChildren(big, info);
    preview.classList.toggle("left", card.getBoundingClientRect().left + card.offsetWidth / 2 > window.innerWidth / 2);
    preview.classList.add("show");
  });
  document.addEventListener("dragstart", hidePreview);

  let queued = false;
  const schedule = (): void => {
    if (queued) return;
    queued = true;
    const run = (): void => {
      if (!queued) return; // the other of the two timers already ran
      queued = false;
      draw();
      mount(toastHost, ...store.state.toasts.map((t) => h("div", { class: `toast ${t.kind}`, text: t.text })));
    };
    // rAF is paused in background/occluded tabs; the timer keeps the UI (and replay lifecycle) moving.
    requestAnimationFrame(run);
    window.setTimeout(run, 100);
  };
  store.subscribe(schedule);

  // A handle for testers: open the console and look at window.__herotime.store.state
  (window as unknown as { __herotime?: unknown }).__herotime = { store, clock, net };

  document.addEventListener("dragend", () => {
    document.body.classList.remove(DRAGGING);
    delete document.body.dataset.drag;
    schedule();
  });

  // ---------------------------------------------------------------- countdowns
  let fuseKey = "";
  let timeLowKey = "";
  // A click sound only when one was uploaded (no built-in click: it would be noise).
  document.addEventListener("click", (e) => {
    if ((e.target as Element | null)?.closest?.("button") && hasUploaded("click")) play("click");
  });
  let fuseTotal = 1;
  window.setInterval(() => {
    const s = store.state;
    const timer = document.getElementById("timer");
    if (timer && s.view) timer.textContent = formatClock(clock.remaining(s.view.deadline));
    const left = s.view ? formatClock(clock.remaining(s.view.deadline)) : "";
    for (const id of ["timer-big", "replay-timer"]) {
      const el = document.getElementById(id);
      if (el) el.textContent = id === "replay-timer" ? `${tr("Next turn in", "เทิร์นถัดไปใน")} ${left}` : left;
    }
    const fuse = document.getElementById("fuse-fill");
    if (fuse && s.view) {
      const remaining = clock.remaining(s.view.deadline) ?? 0;
      const key = `${s.matchId}:${s.view.turn}:${s.view.phase}`;
      if (fuseKey !== key) ((fuseKey = key), (fuseTotal = Math.max(remaining, 1)));
      fuse.style.width = `${Math.max(0, Math.min(100, (remaining / fuseTotal) * 100))}%`;
      fuse.classList.toggle("low", remaining < 8000 && s.view.phase === "RECRUIT");
      // One warning tick when the recruit clock is nearly out.
      if (s.view.phase === "RECRUIT" && s.view.me.alive && remaining > 0 && remaining <= 5000 && timeLowKey !== key) {
        timeLowKey = key;
        play("timeLow");
      }
    }
    const fill = document.getElementById("fill-countdown");
    if (fill && s.status.state === "queued" && s.status.fillAt) fill.textContent = `${tr("Bots join in", "bot จะเข้าใน")} ${formatClock(clock.remaining(s.status.fillAt))}`;
  }, 250);

  // ----------------------------------------------------------------- shortcuts
  document.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    const s = store.state;
    if (s.screen !== "match" || !s.view) return;
    const intent: Intent | undefined = { r: { type: "REFRESH" }, f: { type: "FREEZE" }, u: { type: "UPGRADE" } }[e.key.toLowerCase() as "r" | "f" | "u"] as Intent | undefined;
    if (e.key.toLowerCase() === "d") store.set({ showDebug: !s.showDebug });
    else if (e.key.toLowerCase() === "l") store.set({ showLog: !s.showLog });
    else if (e.key.toLowerCase() === "b") store.set({ showBook: !s.showBook, bookRank: s.bookRank || s.view.me.state.rank });
    else if (e.key === "Escape") store.set({ showBook: false, showLog: false, selected: undefined });
    else if (intent) void ctx().act(intent);
  });

  // ------------------------------------------------------------------- startup
  void (async () => {
    mount(root, h("p", { class: "muted center-text", text: "Loading..." }));
    try {
      content = new ContentIndex(await api.content());
      setContentSounds(content.snapshot.sounds);
    } catch (e) {
      mount(root, h("p", { class: "form-error center-text", text: userMessage(e, "startup", tr("Cannot reach the game server.", "เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้")) }));
      return;
    }
    store.set({ content });
    const token = storage.get();
    if (token) {
      try {
        const me = await api.me(token);
        store.set({ token, user: { id: me.id, username: me.username, role: me.role }, screen: "lobby" });
        net.connect(token);
        return;
      } catch {
        storage.clear();
      }
    }
    schedule();
  })();
}

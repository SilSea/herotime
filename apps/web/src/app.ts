import { ServerClock, formatClock } from "./clock.js";
import { ContentIndex } from "./content-index.js";
import { Api, Net } from "./net.js";
import type { AuthResult, Intent, PracticeOptions } from "./protocol.js";
import { addToast, applyEvent, applyStatus, applyView, removeToast, Store } from "./store.js";
import { renderAuth } from "./ui/auth.js";
import type { Ctx } from "./ui/ctx.js";
import { h, mount } from "./ui/dom.js";
import { renderLibrary } from "./ui/library.js";
import { renderLobby } from "./ui/lobby.js";
import { DRAGGING, renderMatch } from "./ui/match.js";
import { ReplayView } from "./ui/replay-view.js";

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
  let content: ContentIndex | undefined;

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
      const ack = await net.intent(intent);
      if (!ack.ok) toast(ack.error, "error");
      return ack.ok;
    },
    async login(result: AuthResult) {
      storage.set(result.token);
      store.set({ token: result.token, user: { id: result.user.id, username: result.user.username }, screen: "lobby" });
      net.connect(result.token);
    },
    logout() {
      storage.clear();
      net.disconnect();
      store.set({ token: undefined, user: undefined, view: undefined, matchId: undefined, status: { state: "idle" }, screen: "auth", connected: false });
    },
    async startPractice(options: PracticeOptions) {
      const ack = await net.practice(options);
      if (!ack.ok) toast(ack.error, "error");
    },
    async joinQueue() {
      const ack = await net.joinQueue();
      if (!ack.ok) toast(ack.error, "error");
    },
    async leaveQueue() {
      const ack = await net.leaveQueue();
      if (!ack.ok) toast(ack.error, "error");
    },
    async leaveMatch() {
      await net.leaveMatch();
      store.set({ screen: "lobby", view: undefined, matchId: undefined, combat: undefined, replayPending: undefined, placements: undefined, status: { state: "idle" } });
    },
    go(screen) {
      store.set({ screen });
    },
  });

  // ----------------------------------------------------------- server messages
  net.on("connection", (connected) => store.set({ connected }));
  net.on("status", (status) => store.update((s) => applyStatus(s, status)));
  net.on("view", (m) => store.update((s) => applyView(s, m, clock)));
  net.on("event", (m) => store.update((s) => applyEvent(s, m)));
  net.on("matchError", (e) => toast(e, "error"));
  net.on("authError", () => {
    toast("Your login expired. Please log in again.", "error");
    ctx().logout();
  });

  // ---------------------------------------------------------------- rendering
  const frame = (inner: HTMLElement): HTMLElement => {
    const s = store.state;
    const nav = (id: "lobby" | "library", label: string) => h("button", { class: `tab ${s.screen === id ? "active" : ""}`, text: label, on: { click: () => store.set({ screen: id }) } });
    return h(
      "div",
      { class: "shell" },
      h(
        "header",
        { class: "app-header" },
        h("span", { class: "logo small", text: "HeroTime" }),
        h("nav", { class: "tabs" }, nav("lobby", "Play"), nav("library", "Library")),
        h("span", { class: "spacer" }),
        !s.connected && h("span", { class: "conn bad", text: "reconnecting..." }),
        h("span", { class: "muted", text: s.user?.username ?? "" }),
        h("button", { class: "btn", text: "Log out", on: { click: () => ctx().logout() } }),
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
    const inner = h("div", { class: "screen" });
    if (s.screen === "match" && s.view) {
      renderMatch(inner, ctx());
      mount(root, inner);
    } else if (s.screen === "library") {
      renderLibrary(inner, ctx());
      mount(root, frame(inner));
    } else {
      renderLobby(inner, ctx());
      mount(root, frame(inner));
    }
    syncReplay();
    hidePreview();
    announce();
    const log = document.getElementById("log");
    if (log) log.scrollTop = log.scrollHeight;
  };

  const syncReplay = (): void => {
    const phase = store.state.view?.phase;
    if (phase === "RECRUIT") {
      // The next turn has begun: any fight still on screen, or waiting to be shown, is old news.
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
        nextTurnText: () => `Next turn in ${formatClock(clock.remaining(store.state.view?.deadline ?? null))}`,
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
    const text = s.view.phase === "RECRUIT" ? `Turn ${s.view.turn}` : s.view.phase === "BATTLE" ? "Battle!" : s.view.phase === "HERO_SELECT" ? "Choose your hero" : "";
    if (!text) return;
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
    big.classList.remove("small", "clickable", "unaffordable", "attacking", "hit", "focus", "dying", "entering", "huge");
    big.classList.add("preview-card");
    big.style.transform = "";
    const info = h("div", { class: "preview-info" }, ...(card.dataset.tip ?? "").split("\n").slice(1).filter(Boolean).map((line) => h("div", { text: line })));
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
    schedule();
  });

  // ---------------------------------------------------------------- countdowns
  let fuseKey = "";
  let fuseTotal = 1;
  window.setInterval(() => {
    const s = store.state;
    const timer = document.getElementById("timer");
    if (timer && s.view) timer.textContent = formatClock(clock.remaining(s.view.deadline));
    const left = s.view ? formatClock(clock.remaining(s.view.deadline)) : "";
    for (const id of ["timer-big", "replay-timer"]) {
      const el = document.getElementById(id);
      if (el) el.textContent = id === "replay-timer" ? `Next turn in ${left}` : left;
    }
    const fuse = document.getElementById("fuse-fill");
    if (fuse && s.view) {
      const remaining = clock.remaining(s.view.deadline) ?? 0;
      const key = `${s.matchId}:${s.view.turn}:${s.view.phase}`;
      if (fuseKey !== key) ((fuseKey = key), (fuseTotal = Math.max(remaining, 1)));
      fuse.style.width = `${Math.max(0, Math.min(100, (remaining / fuseTotal) * 100))}%`;
      fuse.classList.toggle("low", remaining < 8000 && s.view.phase === "RECRUIT");
    }
    const fill = document.getElementById("fill-countdown");
    if (fill && s.status.state === "queued" && s.status.fillAt) fill.textContent = `Bots join in ${formatClock(clock.remaining(s.status.fillAt))}`;
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
    else if (intent) void ctx().act(intent);
  });

  // ------------------------------------------------------------------- startup
  void (async () => {
    mount(root, h("p", { class: "muted center-text", text: "Loading..." }));
    try {
      content = new ContentIndex(await api.content());
    } catch (e) {
      mount(root, h("p", { class: "form-error center-text", text: `Cannot reach the game server (${e instanceof Error ? e.message : "unknown error"}).` }));
      return;
    }
    store.set({ content });
    const token = storage.get();
    if (token) {
      try {
        const me = await api.me(token);
        store.set({ token, user: { id: me.id, username: me.username }, screen: "lobby" });
        net.connect(token);
        return;
      } catch {
        storage.clear();
      }
    }
    schedule();
  })();
}

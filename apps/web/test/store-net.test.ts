import { describe, expect, it, vi } from "vitest";
import { ServerClock } from "../src/clock.js";
import { Api, ApiError, Net, type SocketLike } from "../src/net.js";
import type { CombatRecord, QueueStatus, ViewMessage } from "../src/protocol.js";
import { addToast, applyEvent, applyStatus, applyView, initialState, removeToast, Store, type AppState , unitsDestroyed } from "../src/store.js";

const record = (turn: number, over: Partial<CombatRecord> = {}): CombatRecord =>
  ({ turn, opponentName: "Bot 1", meSide: "A", damageTaken: 0, damageDealt: 4, result: { winner: "A", events: [{ type: "ATTACK" }] }, ...over }) as unknown as CombatRecord;

const viewMsg = (over: Record<string, unknown> = {}, matchId = "m1", serverNow = 5000): ViewMessage =>
  ({
    matchId,
    serverNow,
    view: { phase: "RECRUIT", turn: 1, deadline: 9000, factions: ["rider"], players: [{ id: "u1", name: "Me" }, { id: "b1", name: "Bot 1" }], me: {}, ...over },
  }) as unknown as ViewMessage;

describe("applyView", () => {
  const clock = () => new ServerClock();

  it("shows the match screen, remembers the view and syncs the clock", () => {
    const c = clock();
    const s = applyView(initialState(), viewMsg(), c, 1000);
    expect(s.screen).toBe("match");
    expect(s.matchId).toBe("m1");
    expect(s.view?.turn).toBe(1);
    expect(s.status).toEqual({ state: "playing", matchId: "m1", ended: false });
    expect(c.now(1000)).toBe(5000);
  });

  it("starts a fresh log for a new match, naming the factions", () => {
    const s = applyView(initialState(), viewMsg(), clock());
    expect(s.log[0]).toBe("Match started (2 players, factions: rider)");
    expect(s.log).toContain("Turn 1: recruit phase");
  });

  it("logs each new recruit turn once", () => {
    const c = clock();
    let s = applyView(initialState(), viewMsg(), c);
    s = applyView(s, viewMsg({ turn: 1 }), c); // an ordinary update
    expect(s.log.filter((l) => l.startsWith("Turn 1: recruit"))).toHaveLength(1);
    s = applyView(s, viewMsg({ phase: "BATTLE" }), c);
    s = applyView(s, viewMsg({ phase: "RECRUIT", turn: 2 }), c);
    expect(s.log.filter((l) => l.startsWith("Turn 2: recruit"))).toHaveLength(1);
  });

  it("logs but does not queue a fight with nothing to watch", () => {
    const c = new ServerClock();
    let s = applyView(initialState(), viewMsg(), c);
    s = applyView(s, viewMsg({ phase: "BATTLE", lastCombat: record(1, { result: { winner: "DRAW", events: [] } } as never) }), c);
    expect(s.replayPending).toBeUndefined();
    expect(s.combat?.turn).toBe(1);
    expect(s.replayedTurn).toBe(1);
  });

  it("queues a fight replay the first time a turn's combat arrives, and only once", () => {
    const c = clock();
    let s = applyView(initialState(), viewMsg(), c);
    s = applyView(s, viewMsg({ phase: "BATTLE", lastCombat: record(1) }), c);
    expect(s.replayPending?.turn).toBe(1);
    expect(s.combat?.turn).toBe(1);
    expect(s.log).toContain("Turn 1 vs Bot 1: Won, dealt 4 damage");

    s = { ...s, replayPending: undefined }; // the UI played it
    s = applyView(s, viewMsg({ phase: "BATTLE", lastCombat: record(1) }), c); // e.g. a reconnect re-sending it
    expect(s.replayPending).toBeUndefined();
    expect(s.log.filter((l) => l.startsWith("Turn 1 vs"))).toHaveLength(1);

    s = applyView(s, viewMsg({ phase: "BATTLE", turn: 2, lastCombat: record(2) }), c);
    expect(s.replayPending?.turn).toBe(2);
  });

  it("an ordinary update without replay data keeps the last fight", () => {
    const c = clock();
    let s = applyView(initialState(), viewMsg({ phase: "BATTLE", lastCombat: record(1) }), c);
    s = applyView(s, viewMsg({ phase: "RECRUIT", turn: 2 }), c);
    expect(s.combat?.turn).toBe(1);
  });

  it("a different match resets everything match-specific", () => {
    const c = clock();
    let s = applyView(initialState(), viewMsg({ phase: "BATTLE", lastCombat: record(3) }), c);
    s = { ...s, placements: [{ playerId: "u1", placement: 2 }], hideOffers: true, selected: { zone: "hand", index: 1 } };
    s = applyView(s, viewMsg({}, "m2"), c);
    expect(s).toMatchObject({ matchId: "m2", combat: undefined, replayPending: undefined, replayedTurn: 0, placements: undefined, hideOffers: false, selected: undefined });
    expect(s.log[0]).toMatch(/^Match started/);
  });

  it("changing phase or turn clears the selection and re-shows offers", () => {
    const c = clock();
    let s = applyView(initialState(), viewMsg(), c);
    s = { ...s, selected: { zone: "board", index: 0 }, hideOffers: true };
    s = applyView(s, viewMsg(), c);
    expect(s.selected).toBeDefined(); // same phase: kept
    s = applyView(s, viewMsg({ phase: "BATTLE" }), c);
    expect(s).toMatchObject({ selected: undefined, hideOffers: false });
  });

  it("marks the status as ended when the match is over", () => {
    expect(applyView(initialState(), viewMsg({ phase: "ENDED", deadline: null }), clock()).status).toMatchObject({ ended: true });
  });

  it("does not mutate the state it is given", () => {
    const before = initialState();
    const frozen = JSON.stringify(before);
    applyView(before, viewMsg(), clock());
    expect(JSON.stringify(before)).toBe(frozen);
  });
});

describe("applyEvent", () => {
  const base = (): AppState => ({ ...applyView(initialState(), viewMsg(), new ServerClock()), user: { id: "u1", username: "me" } });

  it("logs eliminations by name", () => {
    const s = applyEvent(base(), { matchId: "m1", event: { type: "ELIMINATED", playerId: "b1", placement: 8 } });
    expect(s.log.at(-1)).toBe("Bot 1 was eliminated (8th)");
  });

  it("records the final placements and says how you did", () => {
    const placements = [{ playerId: "b1", placement: 1 }, { playerId: "u1", placement: 2 }];
    const s = applyEvent(base(), { matchId: "m1", event: { type: "ENDED", placements } });
    expect(s.placements).toEqual(placements);
    expect(s.log.at(-1)).toBe("Match over: you finished 2nd");
  });

  it("ignores events it does not care about", () => {
    const s = base();
    expect(applyEvent(s, { matchId: "m1", event: { type: "PHASE", phase: "BATTLE", turn: 1, deadline: 1 } })).toBe(s);
  });
});

describe("status, toasts and the store", () => {
  it("applyStatus stores the status", () => {
    const s: QueueStatus = { state: "queued", waiting: 2, matchSize: 8, fillAt: 99 };
    expect(applyStatus(initialState(), s).status).toEqual(s);
  });

  it("keeps at most 5 toasts and removes one by id", () => {
    let s = initialState();
    for (let i = 0; i < 8; i++) s = addToast(s, `t${i}`, i % 2 ? "error" : "info");
    expect(s.toasts).toHaveLength(5);
    expect(s.toasts.map((t) => t.text)).toEqual(["t3", "t4", "t5", "t6", "t7"]);
    const id = s.toasts[1]?.id as number;
    expect(removeToast(s, id).toasts.map((t) => t.text)).toEqual(["t3", "t5", "t6", "t7"]);
  });

  it("Store notifies subscribers on change only, and can unsubscribe", () => {
    const store = new Store();
    const seen: string[] = [];
    const off = store.subscribe((s) => seen.push(s.screen));
    store.set({ screen: "lobby" });
    store.update((s) => s); // same object: no notification
    store.set({ screen: "match" });
    off();
    store.set({ screen: "auth" });
    expect(seen).toEqual(["lobby", "match"]);
    expect(store.state.screen).toBe("auth");
  });
});

class FakeSocket implements SocketLike {
  connected = true;
  handlers = new Map<string, (...a: any[]) => void>();
  sent: { event: string; payload?: unknown }[] = [];
  reply: ((event: string, payload: unknown, ack: (a: unknown) => void) => void) | undefined;
  on(event: string, fn: (...a: any[]) => void) {
    this.handlers.set(event, fn);
  }
  emit(event: string, ...args: any[]) {
    const ack = args.at(-1) as (a: unknown) => void;
    const payload = args.length > 1 ? args[0] : undefined;
    this.sent.push({ event, payload });
    this.reply?.(event, payload, ack);
  }
  disconnect() {
    this.connected = false;
  }
  fire(event: string, payload?: unknown) {
    this.handlers.get(event)?.(payload);
  }
}

describe("Net", () => {
  const make = () => {
    const socket = new FakeSocket();
    const net = new Net(() => socket);
    net.connect("tok");
    return { socket, net };
  };

  it("routes server messages to the right handler", () => {
    const { socket, net } = make();
    const got: string[] = [];
    net.on("connection", (c) => got.push(`conn:${c}`));
    net.on("status", (s) => got.push(`status:${s.state}`));
    net.on("view", (m) => got.push(`view:${m.matchId}`));
    net.on("event", (m) => got.push(`event:${m.event.type}`));
    net.on("authError", (e) => got.push(`auth:${e}`));
    net.on("matchError", (e) => got.push(`match:${e}`));
    socket.fire("connect");
    socket.fire("queue:status", { state: "idle" });
    socket.fire("match:view", { matchId: "m9" });
    socket.fire("match:event", { event: { type: "ENDED" } });
    socket.fire("auth:error", { error: "bad token" });
    socket.fire("match:error", { error: "crashed" });
    socket.fire("disconnect");
    expect(got).toEqual(["conn:true", "status:idle", "view:m9", "event:ENDED", "auth:bad token", "match:crashed", "conn:false"]);
  });

  it("an intent resolves with the server's ack", async () => {
    const { socket, net } = make();
    socket.reply = (_e, _p, ack) => ack({ ok: true });
    await expect(net.intent({ type: "BUY", index: 2 })).resolves.toEqual({ ok: true });
    expect(socket.sent).toEqual([{ event: "match:intent", payload: { type: "BUY", index: 2 } }]);
  });

  it("passes server errors through as acks", async () => {
    const { socket, net } = make();
    socket.reply = (_e, _p, ack) => ack({ ok: false, error: "not enough energy" });
    await expect(net.intent({ type: "UPGRADE" })).resolves.toEqual({ ok: false, error: "not enough energy" });
  });

  it("never throws: no connection and no answer become error acks", async () => {
    const { socket, net } = make();
    socket.connected = false;
    await expect(net.intent({ type: "READY" })).resolves.toEqual({ ok: false, error: "not connected to the server" });
    socket.connected = true;
    vi.useFakeTimers();
    const pending = net.call("queue:join", undefined, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ ok: false, error: "the server did not answer" });
    vi.useRealTimers();
  });

  it("helper calls use the right events", async () => {
    const { socket, net } = make();
    socket.reply = (_e, _p, ack) => ack({ ok: true });
    await net.joinQueue();
    await net.leaveQueue();
    await net.practice({ bots: 3 });
    await net.sync();
    await net.leaveMatch();
    expect(socket.sent.map((s) => s.event)).toEqual(["queue:join", "queue:leave", "queue:practice", "match:sync", "match:leave"]);
    expect(socket.sent[2]?.payload).toEqual({ bots: 3 });
  });

  it("connecting again drops the old socket", () => {
    const sockets: FakeSocket[] = [];
    const net = new Net(() => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    });
    net.connect("a");
    net.connect("b");
    expect(sockets[0]?.connected).toBe(false);
    expect(net.connected).toBe(true);
    net.disconnect();
    expect(net.connected).toBe(false);
  });
});

describe("Api", () => {
  const reply = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("sends credentials as JSON and returns the parsed result", async () => {
    let seen: { url: string; init?: RequestInit } | undefined;
    const api = new Api("http://h", async (url, init) => {
      seen = { url, ...(init ? { init } : {}) };
      return new Response(JSON.stringify({ token: "t", user: { id: "1", username: "u", role: "PLAYER" } }), { status: 201 });
    });
    const r = await api.login("u", "pw");
    expect(r.token).toBe("t");
    expect(seen?.url).toBe("http://h/auth/login");
    expect(JSON.parse(seen?.init?.body as string)).toEqual({ username: "u", password: "pw" });
    expect(seen?.init?.method).toBe("POST");
  });

  it("turns server errors into readable ApiErrors, joining validation lists", async () => {
    await expect(new Api("", reply(401, { message: "invalid username or password" })).login("u", "x")).rejects.toMatchObject({ status: 401, message: "invalid username or password" });
    await expect(new Api("", reply(400, { message: ["username: too short", "email: invalid"] })).register("u", "e", "p")).rejects.toThrow("username: too short; email: invalid");
    await expect(new Api("", async () => new Response("<html>", { status: 502 })).content()).rejects.toThrow("HTTP 502");
    await expect(new Api("", reply(500, {})).content()).rejects.toBeInstanceOf(ApiError);
  });

  it("me() sends the bearer token", async () => {
    let auth = "";
    await new Api("", async (_u, init) => {
      auth = (init?.headers as Record<string, string>).authorization ?? "";
      return new Response(JSON.stringify({ id: "1", username: "u", role: "PLAYER" }));
    }).me("abc");
    expect(auth).toBe("Bearer abc");
  });
});

describe("unitsDestroyed", () => {
  type Moments = { destroyed?: number; lastDestroyed?: string[] };
  const withMe = (hand: string[], board: { key: string; golden?: boolean }[], moments?: Moments, matchId = "m1") =>
    ({ matchId, serverNow: 1, view: { phase: "RECRUIT", turn: 1, deadline: 9, factions: [], players: [], me: { state: { hand: hand.map((key) => ({ key })), board, moments } } } }) as unknown as ViewMessage;
  const fold = (a: ViewMessage, b: ViewMessage) => {
    const s = applyView(initialState(), a, new ServerClock());
    return unitsDestroyed(s, b.view, a.matchId !== b.matchId);
  };

  it("names the units the server says an effect destroyed", () => {
    const before = withMe(["dr1"], [{ key: "a" }, { key: "b" }], { destroyed: 1, lastDestroyed: ["x"] });
    const after = withMe([], [{ key: "a" }, { key: "dr1" }], { destroyed: 2, lastDestroyed: ["x", "b"] });
    expect(fold(before, after)).toEqual(["b"]);
  });
  it("a transform from a played Gear, a sale, a triple or a new match name nothing", () => {
    // the Gear turned Nox into another form: the board lost the key but nothing was destroyed
    expect(fold(withMe(["capsem"], [{ key: "nox" }]), withMe([], [{ key: "nox_ultimate" }]))).toEqual([]);
    expect(fold(withMe(["a"], [{ key: "a" }, { key: "a" }]), withMe([], [{ key: "a", golden: true }]))).toEqual([]);
    expect(fold(withMe([], [{ key: "a" }], { destroyed: 3 }), withMe([], [], { destroyed: 4, lastDestroyed: ["a"] }, "m2"))).toEqual([]);
  });
  it("applyView raises an info toast and a log line", () => {
    const c = new ServerClock();
    let s = applyView(initialState(), withMe(["dr1"], [{ key: "a" }, { key: "b" }]), c);
    s = applyView(s, withMe([], [{ key: "b" }, { key: "dr1" }], { destroyed: 1, lastDestroyed: ["a"] }), c);
    expect(s.toasts.at(-1)).toMatchObject({ kind: "info" });
    expect(s.toasts.at(-1)?.text).toContain("a was destroyed");
    expect(s.log.at(-1)).toContain("destroyed by a card effect");
  });
});

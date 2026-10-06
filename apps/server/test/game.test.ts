import { RuleError } from "@herotime/engine";
import { describe, expect, it } from "vitest";
import { ContentService } from "../src/content/content.service.js";
import { LobbyService } from "../src/game/lobby.service.js";
import { MatchRegistry } from "../src/game/match.registry.js";
import { InMemoryMatchRepository } from "../src/persistence/in-memory.js";
import { FakeTimers, RecordingPublisher, starterContent, testConfig } from "./fakes.js";

const MIN = 60_000;

function setup(over: Parameters<typeof testConfig>[0] = {}) {
  const timers = new FakeTimers();
  const publisher = new RecordingPublisher();
  const repo = new InMemoryMatchRepository();
  const content = new ContentService(starterContent(), "prototype");
  const config = testConfig({ match: { maxTurns: 4, readyEndsRecruit: true }, ...over });
  const registry = new MatchRegistry(content, publisher, timers, config, repo);
  const lobby = new LobbyService(registry, publisher, timers, config, content);
  return { timers, publisher, repo, content, config, registry, lobby };
}

const user = (n: number) => ({ id: `u${n}`, name: `User ${n}` });
const playOut = (t: FakeTimers, runner: { ended: boolean }) => {
  for (let i = 0; i < 400 && !runner.ended; i++) t.advance(30_000);
};

describe("MatchRunner", () => {
  it("starts with every human getting their own first view (hero select, no replay data)", () => {
    const { registry, publisher } = setup();
    const runner = registry.startMatch([user(1), user(2)]);
    for (const id of ["u1", "u2"]) {
      const views = publisher.of(id, "match:view");
      expect(views).toHaveLength(1);
      expect(views[0]?.payload.matchId).toBe(runner.id);
      expect(views[0]?.payload.view.phase).toBe("HERO_SELECT");
      expect(views[0]?.payload.view.me.id).toBe(id);
    }
    expect(publisher.of("bot-1")).toEqual([]); // bots are not sockets
  });

  it("stamps every view with the server clock for countdowns", () => {
    const { registry, publisher, timers } = setup();
    const runner = registry.startMatch([user(1)]);
    expect(publisher.of("u1", "match:view")[0]?.payload.serverNow).toBe(timers.now());
    timers.advance(7_000);
    runner.dispatch("u1", { type: "CHOOSE_HERO", index: 0 });
    expect(publisher.of("u1", "match:view").at(-1)?.payload.serverNow).toBe(timers.now());
  });

  it("fills the seats with bots up to the match size", () => {
    const { registry } = setup();
    const runner = registry.startMatch([user(1), user(2), user(3)]);
    expect(runner.match.players).toHaveLength(8);
    expect(runner.match.players.filter((p) => !p.isBot).map((p) => p.id)).toEqual(["u1", "u2", "u3"]);
  });

  it("only updates the acting player while nothing else changed", () => {
    const { registry, publisher } = setup();
    const runner = registry.startMatch([user(1), user(2)]);
    publisher.clear();
    runner.dispatch("u1", { type: "CHOOSE_HERO", index: 0 });
    expect(publisher.of("u1", "match:view")).toHaveLength(1);
    expect(publisher.of("u2", "match:view")).toHaveLength(0);
  });

  it("when the phase changes, everyone gets a fresh view", () => {
    const { registry, publisher } = setup();
    const runner = registry.startMatch([user(1), user(2)]);
    runner.dispatch("u1", { type: "CHOOSE_HERO", index: 0 });
    publisher.clear();
    runner.dispatch("u2", { type: "CHOOSE_HERO", index: 0 }); // last choice -> recruit starts
    for (const id of ["u1", "u2"]) {
      const v = publisher.of(id, "match:view").at(-1)?.payload.view;
      expect(v.phase).toBe("RECRUIT");
      expect(v.turn).toBe(1);
    }
  });

  it("a rejected intent throws RuleError and sends nothing", () => {
    const { registry, publisher } = setup();
    const runner = registry.startMatch([user(1)]);
    publisher.clear();
    expect(() => runner.dispatch("u1", { type: "BUY", index: 0 })).toThrow(RuleError); // still hero select
    expect(publisher.sent).toEqual([]);
  });

  it("refuses intents from someone who is not in the match", () => {
    const { registry } = setup();
    const runner = registry.startMatch([user(1)]);
    expect(() => runner.dispatch("stranger", { type: "READY" })).toThrow(/not in this match/);
    expect(() => runner.dispatch("bot-1", { type: "READY" })).toThrow(/not in this match/); // bots cannot be driven by clients
  });

  it("includes the replay with battle and final views, but not with ordinary updates", () => {
    const { registry, publisher, timers } = setup();
    const runner = registry.startMatch([user(1)]);
    runner.dispatch("u1", { type: "CHOOSE_HERO", index: 0 }); // -> recruit
    expect(publisher.of("u1", "match:view").at(-1)?.payload.view.lastCombat).toBeUndefined();
    runner.dispatch("u1", { type: "READY" }); // everyone ready -> battle
    const battle = publisher.of("u1", "match:view").at(-1)?.payload.view;
    expect(battle.phase).toBe("BATTLE");
    expect(battle.lastCombat).toBeDefined();
    expect(battle.lastCombat.result.events).toBeDefined();

    timers.advance(60_000); // into the next recruit phase
    const recruit = publisher.of("u1", "match:view").at(-1)?.payload.view;
    expect(recruit.phase).toBe("RECRUIT");
    expect(recruit.lastCombat).toBeUndefined();
  });

  it("sync() sends the full view including the last fight", () => {
    const { registry, publisher } = setup();
    const runner = registry.startMatch([user(1)]);
    runner.dispatch("u1", { type: "CHOOSE_HERO", index: 0 });
    runner.dispatch("u1", { type: "READY" });
    publisher.clear();
    runner.sync("u1");
    expect(publisher.of("u1", "match:view")).toHaveLength(1);
    expect(publisher.of("u1", "match:view")[0]?.payload.view.lastCombat).toBeDefined();
    runner.sync("stranger");
    expect(publisher.sent).toHaveLength(1);
  });

  it("moves through the phases on its own timers", () => {
    const { registry, publisher, timers } = setup();
    registry.startMatch([user(1)]);
    const phases = () => publisher.of("u1", "match:view").map((s) => `${s.payload.view.phase}:${s.payload.view.turn}`);
    timers.advance(30_000); // hero select times out
    expect(phases().at(-1)).toBe("RECRUIT:1");
    timers.advance(40_000);
    expect(phases().at(-1)).toBe("BATTLE:1");
    timers.advance(20_000);
    expect(phases().at(-1)).toBe("RECRUIT:2");
  });

  it("plays a whole match to the end, reports it once and saves the result", async () => {
    const { registry, publisher, timers, repo } = setup();
    const runner = registry.startMatch([user(1)]);
    playOut(timers, runner);
    expect(runner.ended).toBe(true);

    const ended = publisher.of("u1", "match:event").filter((s) => s.payload.event.type === "ENDED");
    expect(ended).toHaveLength(1);
    expect(ended[0]?.payload.event.placements).toHaveLength(8);

    await Promise.resolve();
    expect(repo.results).toHaveLength(1);
    const saved = repo.results[0];
    expect(saved?.matchId).toBe(runner.id);
    expect(saved?.players.map((p) => p.placement).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(saved?.players.filter((p) => p.userId !== null).map((p) => p.userId)).toEqual(["u1"]);
    expect(saved?.players.filter((p) => p.isBot)).toHaveLength(7);
    expect(saved?.endedAt.getTime()).toBeGreaterThan(saved?.startedAt.getTime() as number);
    expect(saved?.seed).toBe(runner.meta.seed);

    timers.advance(60_000);
    expect(repo.results).toHaveLength(1); // never saved twice
    expect(runner.match.phase).toBe("ENDED");
  });

  it("an eliminated player's view says so", () => {
    const { registry, timers } = setup({ match: { maxTurns: 40, startHp: 1 } });
    const runner = registry.startMatch([user(1)]);
    playOut(timers, runner);
    const me = runner.match.view("u1").me;
    expect(me.placement).toBeDefined();
    expect(me.alive).toBe(me.placement === 1);
  });

  it("stop() cancels the pending timer", () => {
    const { registry, timers } = setup();
    const runner = registry.startMatch([user(1)]);
    expect(timers.pendingCount).toBeGreaterThan(0);
    runner.stop();
    expect(timers.pendingCount).toBe(0);
  });

  it("an engine crash tells the players and stops driving the match instead of throwing", () => {
    const { registry, publisher, timers } = setup();
    const runner = registry.startMatch([user(1)]);
    (runner as unknown as { log: () => void }).log = () => undefined; // keep the test output clean
    runner.match.tick = () => {
      throw new Error("boom");
    };
    publisher.clear();
    expect(() => timers.advance(30_000)).not.toThrow();
    expect(publisher.of("u1", "match:error")).toHaveLength(1);
    expect(timers.pendingCount).toBe(0);
  });
});

describe("MatchRegistry", () => {
  it("validates how many humans start a match", () => {
    const { registry } = setup();
    expect(() => registry.startMatch([])).toThrow(/1-8 humans/);
    expect(() => registry.startMatch(Array.from({ length: 9 }, (_, i) => user(i)))).toThrow(/1-8 humans/);
  });

  it("tracks a user's active match and lets a finished one be released", () => {
    const { registry, timers } = setup();
    const runner = registry.startMatch([user(1)]);
    expect(registry.activeFor("u1")).toBe(runner);
    expect(registry.activeFor("u2")).toBeUndefined();
    registry.release("u1"); // still running: nothing happens
    expect(registry.runnerFor("u1")).toBe(runner);

    playOut(timers, runner);
    expect(registry.activeFor("u1")).toBeUndefined();
    expect(registry.runnerFor("u1")).toBe(runner); // still there for final standings
    registry.release("u1");
    expect(registry.runnerFor("u1")).toBeUndefined();
  });

  it("garbage-collects a finished match after ten minutes", () => {
    const { registry, timers } = setup();
    const runner = registry.startMatch([user(1)]);
    playOut(timers, runner);
    expect(registry.count).toBe(1);
    timers.advance(9 * MIN);
    expect(registry.count).toBe(1);
    timers.advance(2 * MIN);
    expect(registry.count).toBe(0);
    expect(registry.runnerFor("u1")).toBeUndefined();
  });

  it("a running match keeps the content it started with when new content is published", () => {
    const { registry, content } = setup();
    const runner = registry.startMatch([user(1)]);
    const before = runner.match.env.content;
    const version = content.publish(starterContent());
    expect(version).toBe(2);
    expect(runner.match.env.content).toBe(before);
    expect(registry.startMatch([user(2)]).meta.contentVersion).toBe(2);
  });

  it("shutdown stops everything", () => {
    const { registry, timers } = setup();
    registry.startMatch([user(1)]);
    registry.startMatch([user(2)]);
    registry.shutdown();
    expect(timers.pendingCount).toBe(0);
    expect(registry.count).toBe(0);
  });
});

describe("LobbyService", () => {
  it("queues a player and tells them", () => {
    const { lobby, publisher, timers } = setup();
    const status = lobby.join(user(1));
    expect(status).toMatchObject({ state: "queued", waiting: 1, matchSize: 8 });
    expect((status as { fillAt: number }).fillAt).toBe(timers.now() + 5000);
    expect(publisher.of("u1", "queue:status").at(-1)?.payload.state).toBe("queued");
  });

  it("joining twice does not queue twice", () => {
    const { lobby } = setup();
    lobby.join(user(1));
    lobby.join(user(1));
    expect(lobby.waiting).toBe(1);
  });

  it("starts the match when the fill timer runs out, with bots in the empty seats", () => {
    const { lobby, registry, timers, publisher } = setup();
    lobby.join(user(1));
    lobby.join(user(2));
    expect(registry.count).toBe(0);
    timers.advance(5000);
    expect(registry.count).toBe(1);
    expect(registry.activeFor("u1")).toBe(registry.activeFor("u2"));
    expect(lobby.waiting).toBe(0);
    expect(lobby.statusFor("u1")).toMatchObject({ state: "playing", ended: false });
    expect(publisher.of("u1", "queue:status").at(-1)?.payload.state).toBe("playing");
  });

  it("the fill timer starts with the first player and is not reset by later ones", () => {
    const { lobby, registry, timers } = setup();
    lobby.join(user(1));
    timers.advance(3000);
    lobby.join(user(2));
    timers.advance(2000); // 5s after the FIRST join
    expect(registry.count).toBe(1);
  });

  it("starts at once when 8 humans are waiting", () => {
    const { lobby, registry } = setup();
    for (let i = 1; i <= 8; i++) lobby.join(user(i));
    expect(registry.count).toBe(1);
    expect(registry.activeFor("u8")?.match.players.every((p) => !p.isBot)).toBe(true);
  });

  it("extra players beyond a full lobby wait for the next one", () => {
    const { lobby, registry, timers } = setup();
    for (let i = 1; i <= 9; i++) lobby.join(user(i));
    expect(registry.count).toBe(1);
    expect(lobby.waiting).toBe(1);
    expect(lobby.statusFor("u9").state).toBe("queued");
    timers.advance(5000);
    expect(registry.count).toBe(2);
    expect(registry.activeFor("u9")).toBeDefined();
  });

  it("leaving removes the player, and the last one out cancels the timer", () => {
    const { lobby, registry, timers } = setup();
    lobby.join(user(1));
    lobby.join(user(2));
    lobby.leave("u1");
    expect(lobby.waiting).toBe(1);
    expect(lobby.statusFor("u1").state).toBe("idle");
    lobby.leave("u2");
    expect(timers.pendingCount).toBe(0);
    timers.advance(10_000);
    expect(registry.count).toBe(0);
  });

  it("leaving when not queued is harmless", () => {
    const { lobby } = setup();
    expect(() => lobby.leave("nobody")).not.toThrow();
  });

  it("remaining players hear when someone leaves", () => {
    const { lobby, publisher } = setup();
    lobby.join(user(1));
    lobby.join(user(2));
    publisher.clear();
    lobby.leave("u2");
    expect(publisher.of("u1", "queue:status").at(-1)?.payload.waiting).toBe(1);
  });

  it("cannot queue for a second match while one is running, but can once it has ended", () => {
    const { lobby, registry, timers } = setup();
    lobby.join(user(1));
    timers.advance(5000);
    const runner = registry.activeFor("u1");
    expect(() => lobby.join(user(1))).toThrow(/already in a match/);

    playOut(timers, runner as { ended: boolean });
    expect(lobby.statusFor("u1")).toMatchObject({ state: "playing", ended: true });
    expect(lobby.join(user(1)).state).toBe("queued");
    expect(registry.runnerFor("u1")).toBeUndefined();
  });

  it("statusFor is idle for strangers", () => {
    expect(setup().lobby.statusFor("who").state).toBe("idle");
  });
});

describe("LobbyService.practice (playtesting)", () => {
  it("starts a match for the player straight away, with a full table by default", () => {
    const { lobby, registry, publisher } = setup();
    const status = lobby.practice(user(1));
    expect(status).toMatchObject({ state: "playing", ended: false });
    expect(registry.count).toBe(1);
    expect(registry.activeFor("u1")?.match.players).toHaveLength(8);
    expect(publisher.of("u1", "queue:status").at(-1)?.payload.state).toBe("playing");
  });

  it("the number of bots decides the table size", () => {
    const { lobby, registry } = setup();
    lobby.practice(user(1), { bots: 3 });
    expect(registry.activeFor("u1")?.match.players).toHaveLength(4);
    lobby.practice(user(2), { bots: 1 });
    expect(registry.activeFor("u2")?.match.players).toHaveLength(2);
  });

  it("fixed factions are applied to that match", () => {
    const { lobby, registry } = setup();
    lobby.practice(user(1), { factions: ["rider", "kaijin"] });
    const m = registry.activeFor("u1")?.match;
    expect([...(m?.env.activeFactions ?? [])].sort()).toEqual(["kaijin", "rider"]);
    expect(m?.view("u1").factions).toEqual(["kaijin", "rider"]);
  });

  it("the fast preset shortens hero select, and nothing leaks into later matches", () => {
    const { lobby, registry, timers } = setup();
    lobby.practice(user(1), { speed: "fast" });
    expect(registry.activeFor("u1")?.match.deadline).toBe(timers.now() + 3000);

    lobby.practice(user(2));
    expect(registry.activeFor("u2")?.match.deadline).toBe(timers.now() + 30_000);
    lobby.join(user(3));
    timers.advance(5000);
    expect(registry.activeFor("u3")?.match.deadline as number).toBeGreaterThan(timers.now() + 20_000);
  });

  it("leaves the queue when starting a practice match", () => {
    const { lobby, timers, registry } = setup();
    lobby.join(user(1));
    lobby.practice(user(1));
    expect(lobby.waiting).toBe(0);
    timers.advance(10_000);
    expect(registry.count).toBe(1); // the abandoned queue did not start a second match
  });

  it("rejects unknown factions with the list of real ones, and changes nothing", () => {
    const { lobby, registry } = setup();
    expect(() => lobby.practice(user(1), { factions: ["rider", "ghost"] })).toThrow(/unknown faction: ghost \(available: rider, sentai/);
    expect(registry.count).toBe(0);
  });

  it("is refused while already playing, but fine again afterwards", () => {
    const { lobby, registry, timers } = setup();
    lobby.practice(user(1), { bots: 1 });
    expect(() => lobby.practice(user(1))).toThrow(/already in a match/);
    playOut(timers, registry.activeFor("u1") as { ended: boolean });
    expect(() => lobby.practice(user(1))).not.toThrow();
    expect(registry.count).toBe(2);
  });

  it("can be switched off (production)", () => {
    const { lobby, registry } = setup({ practice: false });
    expect(() => lobby.practice(user(1))).toThrow(/practice mode is disabled/);
    expect(registry.count).toBe(0);
  });
});

describe("the real server has no Ready", () => {
  it("with default match settings READY is refused and recruit waits for its deadline", () => {
    const { registry, timers } = setup({ match: { maxTurns: 4 } }); // replaces the test default, so readyEndsRecruit is off
    const runner = registry.startMatch([user(1)]);
    runner.dispatch("u1", { type: "CHOOSE_HERO", index: 0 });
    timers.advance(30_000);
    expect(runner.match.phase).toBe("RECRUIT");
    expect(() => runner.dispatch("u1", { type: "READY" })).toThrow(/no Ready/);
    expect(runner.match.phase).toBe("RECRUIT");
  });
});

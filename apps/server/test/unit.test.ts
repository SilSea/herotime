import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { getContentSet } from "@herotime/content";
import { parseContent } from "../src/content/content.service.js";
import { RateLimiter } from "../src/rate-limiter.js";
import { starterContent } from "./fakes.js";

describe("loadConfig", () => {
  const quiet = () => undefined;
  const dev = { JWT_SECRET: "x".repeat(40) };

  it("has sane local defaults", () => {
    const c = loadConfig(dev, quiet);
    expect(c).toMatchObject({ port: 3000, host: "0.0.0.0", production: false, corsOrigin: true, bcryptCost: 10 });
    expect(c.lobby).toEqual({ matchSize: 8, fillAfterMs: 20_000 });
    expect(c.match).toEqual({});
    expect(c.authLimits).toEqual({ registerPerMin: 10, loginPerMin: 10 });
    expect(c.databaseUrl).toBeUndefined();
  });

  it("generates a random dev secret and warns, differently each time", () => {
    const warnings: string[] = [];
    const a = loadConfig({}, (m) => warnings.push(m));
    const b = loadConfig({}, quiet);
    expect(a.jwtSecret).toHaveLength(64);
    expect(a.jwtSecret).not.toBe(b.jwtSecret);
    expect(warnings.join()).toMatch(/JWT_SECRET/);
  });

  it("warns about a short dev secret but accepts it", () => {
    const warnings: string[] = [];
    expect(loadConfig({ JWT_SECRET: "short" }, (m) => warnings.push(m)).jwtSecret).toBe("short");
    expect(warnings).toHaveLength(1);
  });

  describe("production refuses to start unsafe", () => {
    const prod = { NODE_ENV: "production", JWT_SECRET: "x".repeat(40), CORS_ORIGIN: "https://play.example" };

    it("accepts a complete configuration", () => {
      const c = loadConfig(prod, quiet);
      expect(c.production).toBe(true);
      expect(c.corsOrigin).toEqual(["https://play.example"]);
    });

    it("needs JWT_SECRET, of at least 32 characters", () => {
      expect(() => loadConfig({ ...prod, JWT_SECRET: undefined }, quiet)).toThrow(/JWT_SECRET must be set/);
      expect(() => loadConfig({ ...prod, JWT_SECRET: "short" }, quiet)).toThrow(/at least 32/);
    });

    it("needs an explicit CORS allow-list", () => {
      expect(() => loadConfig({ ...prod, CORS_ORIGIN: undefined }, quiet)).toThrow(/CORS_ORIGIN/);
    });
  });

  it("parses a comma separated CORS list", () => {
    expect(loadConfig({ ...dev, CORS_ORIGIN: "http://a.test, http://b.test," }, quiet).corsOrigin).toEqual(["http://a.test", "http://b.test"]);
  });

  it("reads numbers and rejects junk", () => {
    expect(loadConfig({ ...dev, PORT: "8080", BCRYPT_COST: "4", LOBBY_FILL_MS: "100" }, quiet)).toMatchObject({ port: 8080, bcryptCost: 4 });
    expect(() => loadConfig({ ...dev, PORT: "abc" }, quiet)).toThrow(/non-negative integer/);
    expect(() => loadConfig({ ...dev, PORT: "-1" }, quiet)).toThrow(/non-negative integer/);
    expect(() => loadConfig({ ...dev, PORT: "1.5" }, quiet)).toThrow(/non-negative integer/);
  });

  it("HEROTIME_FAST shrinks every timer", () => {
    const c = loadConfig({ ...dev, HEROTIME_FAST: "1" }, quiet);
    expect(c.match.recruitBaseMs).toBeLessThan(10_000);
    expect(c.match.battleMs).toBeLessThan(5_000);
    expect(c.lobby.fillAfterMs).toBe(1_000);
  });

  it("DATABASE_URL turns persistence on, an empty one does not", () => {
    expect(loadConfig({ ...dev, DATABASE_URL: "postgresql://x" }, quiet).databaseUrl).toBe("postgresql://x");
    expect(loadConfig({ ...dev, DATABASE_URL: "" }, quiet).databaseUrl).toBeUndefined();
  });
});

describe("RateLimiter", () => {
  const make = (max: number, windowMs: number) => {
    let t = 0;
    const limiter = new RateLimiter(max, windowMs, () => t);
    return { limiter, at: (ms: number) => void (t = ms) };
  };

  it("allows up to max hits per window, then refuses", () => {
    const { limiter } = make(3, 1000);
    expect([1, 2, 3, 4, 5].map(() => limiter.allow("k"))).toEqual([true, true, true, false, false]);
  });

  it("forgets hits as the window slides", () => {
    const { limiter, at } = make(2, 1000);
    limiter.allow("k");
    at(500);
    limiter.allow("k");
    at(900);
    expect(limiter.allow("k")).toBe(false);
    at(1001); // the first hit (t=0) has expired
    expect(limiter.allow("k")).toBe(true);
  });

  it("refused hits do not extend the lockout", () => {
    const { limiter, at } = make(1, 1000);
    limiter.allow("k");
    for (let t = 100; t < 1000; t += 100) {
      at(t);
      limiter.allow("k"); // hammering while blocked
    }
    at(1001);
    expect(limiter.allow("k")).toBe(true);
  });

  it("keys are independent, and forget() clears one", () => {
    const { limiter } = make(1, 1000);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("b")).toBe(true);
    expect(limiter.allow("a")).toBe(false);
    limiter.forget("a");
    expect(limiter.allow("a")).toBe(true);
  });

  it("sweep drops idle keys but keeps active ones", () => {
    const { limiter, at } = make(1, 1000);
    limiter.allow("old");
    at(5000);
    limiter.allow("fresh");
    limiter.sweep();
    expect(limiter.allow("old")).toBe(true); // was dropped, so a new hit is fine
    expect(limiter.allow("fresh")).toBe(false); // still inside its window
  });
});

describe("parseContent", () => {
  it("loads the starter content", () => {
    const c = starterContent();
    expect(c.cards.size).toBeGreaterThan(10);
    expect(c.heroes.size).toBeGreaterThanOrEqual(2);
  });

  it("keeps every part of the set (a dropped part would silently disable a rule)", () => {
    const set = getContentSet("prototype");
    const c = parseContent(set);
    expect(c.factions.size).toBe(set.factions.length);
    expect(c.series.size).toBe(set.series.length);
    expect(c.cards.size).toBe(set.cards.length);
    expect(c.gauges.size).toBe(set.gauges.length);
    expect(c.relics.size).toBe(set.relics.length);
    expect(c.heroes.size).toBe(set.heroes.length);
    expect(c.factions.size).toBeGreaterThanOrEqual(7);
  });

  it("reports dangling references", () => {
    const base = starterContent();
    const raw = JSON.parse(JSON.stringify({ factions: [...base.factions.values()], series: [...base.series.values()], gauges: [...base.gauges.values()], relics: [...base.relics.values()], cards: [...base.cards.values()], heroes: [...base.heroes.values()] }));
    raw.cards.find((c: { series?: string }) => c.series).series = "does-not-exist";
    expect(() => parseContent(raw)).toThrow(/unknown series "does-not-exist"/);
  });

  it("rejects malformed cards", () => {
    expect(() => parseContent({ cards: [{ key: "x" }], heroes: [] })).toThrow();
    expect(() => parseContent("nope")).toThrow();
  });

  it("needs two heroes and a shop unit to be playable", () => {
    const base = starterContent();
    const full = {
      factions: [...base.factions.values()],
      cards: [...base.cards.values()],
      series: [...base.series.values()],
      gauges: [...base.gauges.values()],
      relics: [...base.relics.values()],
      heroes: [...base.heroes.values()],
    };
    expect(() => parseContent(full)).not.toThrow();
    expect(() => parseContent({ ...full, heroes: full.heroes.slice(0, 1) })).toThrow(/at least 2 heroes/);
    const gearOnly = { key: "g", name: "g", rank: 1, atk: 0, hp: 1, kind: "GEAR", token: true };
    const heroes = [{ key: "h1", name: "h1" }, { key: "h2", name: "h2" }];
    expect(() => parseContent({ cards: [gearOnly], heroes })).toThrow(/shop unit/);
  });
});

describe("playtest settings", () => {
  const quiet = () => undefined;
  const dev = { JWT_SECRET: "x".repeat(40) };

  it("uses the prototype set and practice mode in development", () => {
    const c = loadConfig(dev, quiet);
    expect(c.contentSet).toBe("prototype");
    expect(c.practice).toBe(true);
    expect(c.webDir).toBeUndefined();
  });

  it("uses the production set and no practice mode in production", () => {
    const c = loadConfig({ NODE_ENV: "production", JWT_SECRET: "x".repeat(40), CORS_ORIGIN: "https://a.test" }, quiet);
    expect(c.contentSet).toBe("production");
    expect(c.practice).toBe(false);
  });

  it("CONTENT_SET and PRACTICE override those defaults", () => {
    expect(loadConfig({ ...dev, CONTENT_SET: "production" }, quiet).contentSet).toBe("production");
    expect(loadConfig({ ...dev, PRACTICE: "0" }, quiet).practice).toBe(false);
    expect(loadConfig({ NODE_ENV: "production", JWT_SECRET: "x".repeat(40), CORS_ORIGIN: "https://a.test", PRACTICE: "1" }, quiet).practice).toBe(true);
  });

  it("FACTIONS forces a matchup, FACTIONS_PER_MATCH narrows the random pick, MAX_TURNS caps the game", () => {
    const c = loadConfig({ ...dev, FACTIONS: "rider, sentai,", FACTIONS_PER_MATCH: "3", MAX_TURNS: "12" }, quiet);
    expect(c.match).toMatchObject({ fixedFactions: ["rider", "sentai"], factionsPerMatch: 3, maxTurns: 12 });
    expect(loadConfig({ ...dev, FACTIONS: "" }, quiet).match.fixedFactions).toBeUndefined();
    expect(() => loadConfig({ ...dev, MAX_TURNS: "x" }, quiet)).toThrow(/non-negative integer/);
  });

  it("WEB_DIR turns on static file serving", () => {
    expect(loadConfig({ ...dev, WEB_DIR: "apps/web/public" }, quiet).webDir).toBe("apps/web/public");
  });

  it("fast mode and a forced matchup combine", () => {
    const c = loadConfig({ ...dev, HEROTIME_FAST: "1", FACTIONS: "kaijin" }, quiet);
    expect(c.match.battleMs).toBe(2000);
    expect(c.match.fixedFactions).toEqual(["kaijin"]);
  });
});

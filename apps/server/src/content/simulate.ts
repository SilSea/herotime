import { grantRelic, Match, type Content, type Entrant, type MatchConfig } from "@herotime/engine";

export interface SimulateOptions {
  /** Matches to play (each has 8 bots). */
  matches: number;
  seed: number;
  /** Stop starting new matches after this long, and report what finished. */
  budgetMs?: number;
  match?: Partial<MatchConfig>;
  /** Give this relic to the first bot of every match from the start, to see what it does for them. */
  relic?: string;
}

export interface Row {
  key: string;
  name: string;
  /** Players counted (a hero picked, a card on a final board, a faction that led a board). */
  count: number;
  /** 1 = always wins, 8 = always first out. Compare against `expected`. */
  avgPlacement: number;
  winRate: number;
}

export interface SimulationReport {
  matches: number;
  requested: number;
  /** Average placement of a random player: (players + 1) / 2. */
  expected: number;
  avgTurns: number;
  heroes: Row[];
  cards: Row[];
  factions: Row[];
  /** Relics held at the end, by the players who held them. */
  relics: Row[];
  /** With options.relic: how the bot that started with it placed. */
  forced?: Row;
  /** Cards never seen on a final board in any match. */
  neverUsed: string[];
}

interface Acc {
  count: number;
  placements: number;
  wins: number;
}

const bump = (map: Map<string, Acc>, key: string, placement: number): void => {
  const a = map.get(key) ?? { count: 0, placements: 0, wins: 0 };
  a.count++;
  a.placements += placement;
  if (placement === 1) a.wins++;
  map.set(key, a);
};

const rows = (map: Map<string, Acc>, name: (key: string) => string): Row[] =>
  [...map]
    .map(([key, a]) => ({ key, name: name(key), count: a.count, avgPlacement: Math.round((a.placements / a.count) * 100) / 100, winRate: Math.round((a.wins / a.count) * 1000) / 1000 }))
    .sort((x, y) => x.avgPlacement - y.avgPlacement || y.count - x.count);

/**
 * Play full bot-only matches on `content` and summarise who does well. Not a balance verdict: bots play
 * simply, so read it as "does anything stand out", e.g. a card whose owners always win or always lose.
 */
export function simulate(content: Content, opts: SimulateOptions): SimulationReport {
  const heroes = new Map<string, Acc>();
  const cards = new Map<string, Acc>();
  const factions = new Map<string, Acc>();
  const relics = new Map<string, Acc>();
  const forced = new Map<string, Acc>();
  if (opts.relic !== undefined && !content.relics.has(opts.relic)) throw new Error(`unknown relic: ${opts.relic}`);
  const started = Date.now();
  let played = 0;
  let turns = 0;
  const size = 8;

  for (let i = 0; i < opts.matches; i++) {
    if (opts.budgetMs !== undefined && Date.now() - started > opts.budgetMs) break;
    const entrants: Entrant[] = Array.from({ length: size }, (_, n) => ({ id: `b${n}`, name: `Bot ${n}`, isBot: true }));
    const match = Match.create({ content, seed: opts.seed + i, entrants, now: 0, config: opts.match ?? {} });
    if (opts.relic !== undefined) grantRelic(match.player("b0").state, opts.relic, match.env);
    for (let guard = 0; match.phase !== "ENDED" && guard < 1000; guard++) match.tick((match.deadline as number) + 1);
    if (match.phase !== "ENDED") continue;
    played++;
    turns += match.turn;

    for (const p of match.players) {
      const place = p.placement as number;
      if (p.state.hero) bump(heroes, p.state.hero, place);
      for (const r of p.state.relics) bump(relics, r, place);
      if (opts.relic !== undefined && p.id === "b0") bump(forced, opts.relic, place);
      const seen = new Set<string>();
      const tally = new Map<string, number>();
      for (const u of p.state.board) {
        seen.add(u.key);
        for (const f of content.card(u.key).factions) tally.set(f, (tally.get(f) ?? 0) + 1);
      }
      for (const key of seen) bump(cards, key, place);
      const lead = [...tally].sort((a, b) => b[1] - a[1])[0];
      if (lead && lead[1] >= 3) bump(factions, lead[0], place); // a board "belongs" to a faction with 3 or more units
    }
  }

  const used = new Set(cards.keys());
  return {
    matches: played,
    requested: opts.matches,
    expected: (size + 1) / 2,
    avgTurns: played === 0 ? 0 : Math.round((turns / played) * 10) / 10,
    heroes: rows(heroes, (k) => content.heroes.get(k)?.name ?? k),
    cards: rows(cards, (k) => content.cards.get(k)?.name ?? k),
    factions: rows(factions, (k) => content.factions.get(k)?.name ?? k),
    relics: rows(relics, (k) => content.relics.get(k)?.name ?? k),
    ...(opts.relic !== undefined ? { forced: rows(forced, (k) => content.relics.get(k)?.name ?? k)[0] } : {}),
    neverUsed: [...content.cards.values()].filter((c) => c.kind === "UNIT" && !c.token && !used.has(c.key)).map((c) => c.key),
  };
}

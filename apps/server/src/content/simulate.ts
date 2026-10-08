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
  /** Half the 95% range of avgPlacement: with more matches the true average is very likely within ± this. */
  margin: number;
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
  /** Final boards with no faction of 3+ units (not counting summoned tokens), so in no faction row. */
  unassigned: number;
  /** Relics held at the end, by the players who held them. */
  relics: Row[];
  /** Giant Robos in the Giant Slot at the end, by the players who had them (the faction table never shows them). */
  giants: Row[];
  /** With options.relic: how the bot that started with it placed. */
  forced?: Row;
  /** Tavern cards never seen on a final board in any match, themselves or as a form they turn into. */
  neverUsed: string[];
}

interface Acc {
  count: number;
  placements: number;
  squares: number;
  wins: number;
}

const bump = (map: Map<string, Acc>, key: string, placement: number): void => {
  const a = map.get(key) ?? { count: 0, placements: 0, squares: 0, wins: 0 };
  a.count++;
  a.placements += placement;
  a.squares += placement * placement;
  if (placement === 1) a.wins++;
  map.set(key, a);
};

/** 1.96 standard errors of the mean placement (the spread of one player's place, over the root of the count). */
function margin(a: Acc): number {
  if (a.count < 2) return 8;
  const mean = a.placements / a.count;
  const variance = Math.max(0, (a.squares - a.count * mean * mean) / (a.count - 1));
  return Math.round(1.96 * Math.sqrt(variance / a.count) * 100) / 100;
}

const rows = (map: Map<string, Acc>, name: (key: string) => string): Row[] =>
  [...map]
    .map(([key, a]) => ({ key, name: name(key), count: a.count, avgPlacement: Math.round((a.placements / a.count) * 100) / 100, margin: margin(a), winRate: Math.round((a.wins / a.count) * 1000) / 1000 }))
    .sort((x, y) => x.avgPlacement - y.avgPlacement || y.count - x.count);

/**
 * Tokens that only ever come from SUMMON (e.g. a 2/2 called in by another card): a board full of them was not
 * built around their faction. Forms a unit turns into (Henshin, Final Form, Gattai, TRANSFORM, formOf) still count.
 */
export function summonedTokens(content: Content): Set<string> {
  const summoned = new Set<string>();
  const forms = new Set<string>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== "object") return;
    const o = x as Record<string, unknown>;
    if (o.type === "SUMMON" && typeof o.cardKey === "string") summoned.add(o.cardKey);
    if (o.type === "TRANSFORM" && typeof o.into === "string") forms.add(o.into);
    Object.values(o).forEach(walk);
  };
  for (const c of content.cards.values()) {
    walk(c.effects);
    for (const k of [c.henshin?.into, c.ultimateInto, c.gattaiInto]) if (k !== undefined) forms.add(k);
    if (c.formOf !== undefined) forms.add(c.key);
  }
  for (const x of [...content.heroes.values(), ...content.relics.values(), ...content.gauges.values()]) walk(x);
  return new Set([...summoned].filter((k) => content.card(k).token && !forms.has(k)));
}

/**
 * Play full bot-only matches on `content` and summarise who does well. Not a balance verdict: bots play
 * simply, so read it as "does anything stand out", e.g. a card whose owners always win or always lose.
 */
export function simulate(content: Content, opts: SimulateOptions): SimulationReport {
  const heroes = new Map<string, Acc>();
  const cards = new Map<string, Acc>();
  const factions = new Map<string, Acc>();
  const relics = new Map<string, Acc>();
  const giants = new Map<string, Acc>();
  const forced = new Map<string, Acc>();
  if (opts.relic !== undefined && !content.relics.has(opts.relic)) throw new Error(`unknown relic: ${opts.relic}`);
  const summonedOnly = summonedTokens(content);
  const started = Date.now();
  let played = 0;
  let turns = 0;
  let unassigned = 0;
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
      if (p.state.giant) bump(giants, p.state.giant.key, place);
      if (opts.relic !== undefined && p.id === "b0") bump(forced, opts.relic, place);
      const seen = new Set<string>();
      const tally = new Map<string, number>();
      for (const u of p.state.board) {
        seen.add(u.key);
        if (summonedOnly.has(u.key)) continue; // summoned helpers do not decide what a board is built around
        for (const f of content.card(u.key).factions) tally.set(f, (tally.get(f) ?? 0) + 1);
      }
      for (const key of seen) bump(cards, key, place);
      const lead = [...tally].sort((a, b) => b[1] - a[1])[0];
      if (lead && lead[1] >= 3) bump(factions, lead[0], place); // a board "belongs" to a faction with 3 or more units
      else unassigned++;
    }
  }

  // A card is used when it, or a form it turns into (Henshin, Final Form...), ended a match on a board.
  const used = new Set([...cards.keys()].flatMap((k) => content.lineage(k)));
  // A card whose every faction is switched off never reaches the tavern, so it cannot be used.
  const off = new Set([...content.factions.values()].filter((f) => f.enabled === false).map((f) => f.key));
  const playable = (c: { factions: readonly string[] }): boolean => c.factions.length === 0 || c.factions.some((f) => !off.has(f));
  return {
    matches: played,
    requested: opts.matches,
    expected: (size + 1) / 2,
    avgTurns: played === 0 ? 0 : Math.round((turns / played) * 10) / 10,
    heroes: rows(heroes, (k) => content.heroes.get(k)?.name ?? k),
    cards: rows(cards, (k) => content.cards.get(k)?.name ?? k),
    factions: rows(factions, (k) => content.factions.get(k)?.name ?? k),
    unassigned,
    relics: rows(relics, (k) => content.relics.get(k)?.name ?? k),
    giants: rows(giants, (k) => content.cards.get(k)?.name ?? k),
    ...(opts.relic !== undefined ? { forced: rows(forced, (k) => content.relics.get(k)?.name ?? k)[0] } : {}),
    neverUsed: [...content.cards.values()].filter((c) => c.kind === "UNIT" && !c.token && playable(c) && !used.has(c.key)).map((c) => c.key),
  };
}

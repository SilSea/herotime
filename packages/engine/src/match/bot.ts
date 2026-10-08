import { DEFAULT_COMBAT_RULES } from "../config.js";
import { combatRulesOf, withRules } from "../rules.js";
import { refresh, reorder, RuleError, toggleFreeze, upgrade, upgradeCost, type PlayerState, type Unit } from "../shop/economy.js";
import type { GameEnv } from "../game/env.js";
import {
  autoChooseRelic,
  buyGear,
  buyUnit,
  combineGattai,
  gattaiGroupAt,
  chooseRelic,
  pickDiscover,
  playUnit,
  sellUnit,
  gearTargets,
  gearUsable,
  useGear,
  useHeroPower,
} from "../game/session.js";

/** Run one intent, ignoring rule violations: a bot that cannot do something simply skips it. */
function attempt(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch (e) {
    if (e instanceof RuleError) return false;
    throw e;
  }
}

/** Whether a gear would do something right now (buying one that cannot is wasted Energy). */
const usableNow = (p: PlayerState, key: string, env: GameEnv): boolean => gearUsable(p, key, env);

/** Use a gear on the strongest unit it can go on (by current attack + health). */
function useGearWell(p: PlayerState, handIndex: number, env: GameEnv): void {
  const key = p.hand[handIndex]?.key;
  const valid = key === undefined ? null : gearTargets(p, key, env);
  if (!valid || valid.length === 0) return useGear(p, handIndex, env);
  const power = (i: number): number => {
    const u = p.board[i];
    if (!u) return 0;
    const d = env.content.card(u.key);
    return (d.atk + (u.bonusAtk ?? 0) + d.hp + (u.bonusHp ?? 0)) * (u.golden ? 2 : 1);
  };
  const best = [...valid].sort((a, b) => power(b) - power(a))[0];
  useGear(p, handIndex, env, best);
}

/** Faction most common among the units a player owns (ties broken alphabetically). */
function mainFaction(p: PlayerState, env: GameEnv): string | undefined {
  const counts = new Map<string, number>();
  for (const u of [...p.board, ...p.hand]) {
    for (const f of env.content.card(u.key).factions) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  let best: string | undefined;
  for (const f of [...counts.keys()].sort()) if (best === undefined || (counts.get(f) ?? 0) > (counts.get(best) ?? 0)) best = f;
  return best;
}

/** Sentai colours the player's units already have (Team-Up and Roll Call count distinct ones). */
function coloursOwned(p: PlayerState, env: GameEnv): Set<string> {
  return new Set([...p.board, ...p.hand].flatMap((u) => env.content.card(u.key).colors));
}

/**
 * How much a bot wants a shop card: pairs first (triples), then its main faction, then higher rank. A Sentai
 * colour the team does not have yet counts too, once it plays Sentai.
 */
function want(p: PlayerState, key: string, faction: string | undefined, env: GameEnv): number {
  const def = env.content.card(key);
  const owned = [...p.board, ...p.hand].filter((u) => u.key === key && !u.golden).length;
  const playsSentai = faction === "sentai" || [...p.board, ...p.hand].some((u) => env.content.card(u.key).colors.length > 0);
  const have = coloursOwned(p, env);
  const newColour = playsSentai && def.colors.some((c) => c === "EXTRA" || !have.has(c)) ? 3 : 0;
  return owned * 4 + (faction !== undefined && def.factions.includes(faction) ? 2 : 0) + newColour + def.rank;
}

/** The best option of a pending Discover: a Giant by size, a card by how much the bot wants it. */
function bestDiscover(p: PlayerState, env: GameEnv): number {
  const offer = p.discovers[0];
  if (!offer) return 0;
  const faction = mainFaction(p, env);
  const score = (key: string): number => {
    const d = env.content.card(key);
    return offer.destination === "GIANT" ? d.atk + d.hp : want(p, key, faction, env);
  };
  let best = 0;
  offer.options.forEach((key, i) => {
    if (score(key) > score(offer.options[best] as string)) best = i;
  });
  return best;
}

function takeDiscovers(p: PlayerState, env: GameEnv): void {
  for (let guard = 0; guard < 6 && p.discovers.length > 0; guard++) {
    if (!attempt(() => pickDiscover(p, bestDiscover(p, env), env))) break;
  }
}

/**
 * Line up a Gattai group so it can combine: a core (a card with a Gattai form) leftmost, the other Gattai
 * units right after it. Only when there are enough Gattai units on the board for a group.
 */
function arrangeGattai(p: PlayerState, env: GameEnv): void {
  const hasGattai = (u: Unit): boolean => !u.components && (env.content.card(u.key).keywords.includes("GATTAI") || (u.keywords ?? []).includes("GATTAI"));
  const size = combatRulesOf(p).gattaiSize ?? env.cfg.combatDefaults?.gattaiSize ?? DEFAULT_COMBAT_RULES.gattaiSize;
  const core = p.board.findIndex((u) => hasGattai(u) && env.content.card(u.key).gattaiInto !== undefined);
  if (core < 0 || p.board.filter(hasGattai).length < size) return;
  attempt(() => reorder(p, core, 0));
  let next = 1;
  for (let i = 1; i < p.board.length; i++) {
    if (!hasGattai(p.board[i] as Unit)) continue;
    const from = i;
    const to = next;
    if (from !== to) attempt(() => reorder(p, from, to));
    next++;
  }
}

/**
 * Tavern Gear worth buying before any unit: one made for particular cards the bot has (a Capsem for its
 * Rider, a Final Form for a unit that has one), rather than a plain buff it can pick up with spare Energy.
 */
function gearFitsBoard(p: PlayerState, key: string, env: GameEnv): boolean {
  const def = env.content.card(key);
  const special = def.effects.some((e) => (e.target?.cards?.length ?? 0) > 0 || e.actions.some((a) => a.type === "ULTIMATE_FORM" || a.type === "TRANSFORM"));
  if (!special || !gearUsable(p, key, env)) return false;
  // gearTargets refuses (throws) when the gear has nothing to act on, e.g. a Giant upgrade with no Giant.
  try {
    const targets = gearTargets(p, key, env);
    return Array.isArray(targets) && targets.length > 0;
  } catch {
    return false;
  }
}

function buyAndDeploy(p: PlayerState, env: GameEnv): boolean {
  const c = withRules(p, env.cfg);
  if (p.energy < c.buyCost || p.shop.length === 0) return false;
  if (p.hand.length >= c.handSize) return false;

  const faction = mainFaction(p, env);
  let best = 0;
  p.shop.forEach((key, i) => {
    if (want(p, key, faction, env) > want(p, p.shop[best] as string, faction, env)) best = i;
  });
  if (!attempt(() => buyUnit(p, best, env))) return false;

  // put every unit card in hand onto the board while there is room
  for (let guard = 0; guard < c.handSize; guard++) {
    const i = p.hand.findIndex((u) => env.content.card(u.key).kind === "UNIT");
    if (i < 0 || p.board.length >= c.boardSize) break;
    if (!attempt(() => playUnit(p, i, p.board.length, env))) break;
  }
  return true;
}

/** With a full board, swap the weakest board unit for a clearly better one waiting in hand. */
function upgradeBoard(p: PlayerState, env: GameEnv): boolean {
  const c = withRules(p, env.cfg);
  if (p.board.length < c.boardSize) return false;
  const rankOf = (key: string): number => env.content.card(key).rank;

  let best = -1;
  p.hand.forEach((u, i) => {
    if (env.content.card(u.key).kind !== "UNIT") return;
    if (best < 0 || rankOf(u.key) > rankOf((p.hand[best] as { key: string }).key)) best = i;
  });
  if (best < 0) return false;

  let weakest = 0;
  p.board.forEach((u, i) => {
    if (rankOf(u.key) < rankOf((p.board[weakest] as { key: string }).key)) weakest = i;
  });
  if (rankOf((p.hand[best] as { key: string }).key) <= rankOf((p.board[weakest] as { key: string }).key)) return false;

  if (!attempt(() => sellUnit(p, "board", weakest, env))) return false;
  return attempt(() => playUnit(p, best, p.board.length, env));
}

/** One recruit phase for a bot, using exactly the intents a human has. */
/** `payHealth` pays Health-priced gear; bots only do that while they have plenty of Health left. */
export function runBot(p: PlayerState, turn: number, env: GameEnv, payHealth?: (amount: number) => void): void {
  const c = withRules(p, env.cfg);

  if (p.relicOffer) {
    const faction = mainFaction(p, env);
    const options = p.relicOffer.options.map((key, i) => ({ key, i, def: env.content.relics.get(key) }));
    const pick = options
      .filter((o) => o.def !== undefined && o.def.cost <= p.energy)
      .sort((a, b) => Number(faction !== undefined && b.def?.factions.includes(faction)) - Number(faction !== undefined && a.def?.factions.includes(faction)))[0];
    if (!pick || !attempt(() => chooseRelic(p, pick.i, env))) autoChooseRelic(p, env);
  }

  takeDiscovers(p, env);
  for (let guard = 0; guard < 6; guard++) {
    const i = p.hand.findIndex((u) => env.content.card(u.key).kind === "GEAR");
    if (i < 0 || !attempt(() => useGearWell(p, i, env))) break;
  }

  // Gear made for a card on the board (a Capsem for its Rider, a Final Form) comes before any unit.
  if (p.shopGear && gearFitsBoard(p, p.shopGear, env) && attempt(() => buyGear(p, env, payHealth))) {
    const i = p.hand.findIndex((u) => env.content.card(u.key).kind === "GEAR");
    if (i >= 0) attempt(() => useGearWell(p, i, env));
  }

  // climb ranks on a schedule: about one rank every two turns
  const target = Math.min(c.maxRank, 1 + Math.floor(turn / 2));
  if (p.rank < target) {
    const cost = upgradeCost(p, c);
    if (cost !== undefined && cost <= p.energy) attempt(() => upgrade(p, env.cfg));
  }

  for (let round = 0; round < 3; round++) {
    for (let guard = 0; guard < 10 && buyAndDeploy(p, env); guard++);
    takeDiscovers(p, env);
    for (let guard = 0; guard < 4 && upgradeBoard(p, env); guard++);
    if (p.energy >= c.buyCost + c.refreshCost) attempt(() => refresh(p, env.pool, env.rng, env.cfg, env.gear));
    else break;
  }

  // Combine any Gattai group led by a core: it frees board slots and keeps the merged strength.
  arrangeGattai(p, env);
  for (let i = 0; i < p.board.length; i++) if (gattaiGroupAt(p, i, env)) attempt(() => combineGattai(p, i, env));

  attempt(() => useHeroPower(p, env));

  // Spare Energy goes on the tavern's Gear, used at once. Gear helps the units on the board, so only with some there.
  if (p.shopGear && p.board.length > 0 && usableNow(p, p.shopGear, env) && attempt(() => buyGear(p, env, payHealth))) {
    const i = p.hand.findIndex((u) => env.content.card(u.key).kind === "GEAR");
    if (i >= 0) attempt(() => useGearWell(p, i, env));
  }
  takeDiscovers(p, env);

  // Keep a tavern that holds the third copy of a pair: the triple can be bought next turn.
  const plain = [...p.board, ...p.hand].filter((u) => !u.golden).map((u) => u.key);
  const pairs = new Set(plain.filter((k) => plain.filter((x) => x === k).length >= 2));
  if (!p.frozen && p.shop.some((k) => pairs.has(k))) attempt(() => toggleFreeze(p));
}

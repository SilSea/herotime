import { DEFAULT_CONFIG, type GameConfig } from "../config.js";
import type { Unit } from "../content.js";
import type { Rng } from "../rng/rng.js";
import { withRules } from "../rules.js";
import type { Pool } from "./pool.js";

export type { Unit };

/** Thrown when a player intent breaks a rule; the server turns it into an error reply. */
export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

/** A Discover waiting for the player to pick. HAND picks come from the pool; GIANT picks go in the Giant Slot. */
export interface DiscoverOffer {
  options: string[];
  destination: "HAND" | "GIANT";
}

export interface RelicOffer {
  tier: "LESSER" | "GREATER";
  options: string[];
}

export interface PlayerState {
  energy: number;
  rank: number;
  /** Turns waited since the last rank-up; each one makes the next upgrade 1 cheaper. */
  upgradeDiscount: number;
  shop: string[];
  /** The tavern's Gear slot: a key, or null when empty (bought, or nothing to offer). */
  shopGear: string | null;
  frozen: boolean;
  hand: Unit[];
  board: Unit[];
  /** Pending Discover offers, oldest first. Resolved with chooseDiscover. */
  discovers: DiscoverOffer[];
  /** Per-player rule overrides set by MODIFY_RULE (relics, heroes). */
  rules: Record<string, number>;
  /** Refreshes left this turn that cost nothing (rule: freeRefreshesPerTurn). */
  freeRefreshes: number;
  /** Gauge values by gauge key. */
  gauges: Record<string, number>;
  /** The Giant Robo in the Giant Slot (outside the 7 board slots). */
  giant?: Unit;
  hero?: string;
  heroPowerUsed: boolean;
  heroPowerSpent: boolean;
  relics: string[];
  relicOffer?: RelicOffer;
}

export function newPlayer(): PlayerState {
  return {
    energy: 0,
    rank: 1,
    upgradeDiscount: 0,
    shop: [],
    shopGear: null,
    frozen: false,
    hand: [],
    board: [],
    discovers: [],
    rules: {},
    freeRefreshes: 0,
    gauges: {},
    heroPowerUsed: false,
    heroPowerSpent: false,
    relics: [],
  };
}

/** Pool copies a unit is worth: a Final Form consumed 3 copies. */
export function copiesOf(unit: Unit): number {
  return unit.golden ? 3 : 1;
}

/** Put a unit's pooled copies back, including the parts a combined Gattai form was made of. */
export function returnToPool(unit: Unit, pool: Pool): void {
  if (pool.has(unit.key)) pool.give(unit.key, copiesOf(unit));
  for (const part of unit.components ?? []) returnToPool(part, pool);
}

export function energyForTurn(turn: number, cfg: GameConfig = DEFAULT_CONFIG): number {
  return Math.min(cfg.startEnergy + (turn - 1) * cfg.energyPerTurn, cfg.maxEnergy);
}

export function shopSizeFor(rank: number, cfg: GameConfig = DEFAULT_CONFIG): number {
  return cfg.shopSize[rank - 1] ?? cfg.shopSize[cfg.shopSize.length - 1] ?? 0;
}

/** Cost to reach the next rank, or undefined at max rank. */
export function upgradeCost(player: PlayerState, cfg: GameConfig = DEFAULT_CONFIG): number | undefined {
  if (player.rank >= cfg.maxRank) return undefined;
  const base = cfg.upgradeBaseCost[player.rank - 1];
  if (base === undefined) return undefined;
  return Math.max(0, base - player.upgradeDiscount);
}

export function spend(player: PlayerState, cost: number): void {
  if (player.energy < cost) {
    throw new RuleError(`not enough energy: need ${cost}, have ${player.energy}`);
  }
  player.energy -= cost;
}

/** Gear the tavern can offer: key and rank. Not pooled, so offering one takes nothing from anyone. */
export interface GearChoice {
  key: string;
  rank: number;
}

function rollShop(player: PlayerState, pool: Pool, rng: Rng, cfg: GameConfig, gear: readonly GearChoice[]): void {
  for (const key of player.shop) pool.give(key);
  player.shop = [];
  const size = shopSizeFor(player.rank, cfg);
  for (let i = 0; i < size; i++) {
    const key = pool.draw(rng, player.rank);
    if (key === undefined) break;
    player.shop.push(key);
  }
  // Rolled after the units so content without gear keeps exactly the random sequence it had before.
  const eligible = gear.filter((g) => g.rank <= player.rank);
  player.shopGear = eligible.length > 0 ? rng.pick(eligible).key : null;
}

/** Begin a recruit phase: refill energy, tick the upgrade discount, refresh the shop unless frozen. */
export function startTurn(
  player: PlayerState,
  turn: number,
  pool: Pool,
  rng: Rng,
  cfg: GameConfig = DEFAULT_CONFIG,
  gear: readonly GearChoice[] = [],
): void {
  const c = withRules(player, cfg);
  player.energy = energyForTurn(turn, c);
  player.freeRefreshes = player.rules.freeRefreshesPerTurn ?? 0;
  player.heroPowerUsed = false;
  if (turn > 1) player.upgradeDiscount += 1;
  if (player.frozen) {
    player.frozen = false;
  } else {
    rollShop(player, pool, rng, cfg, gear);
  }
}

export function refresh(player: PlayerState, pool: Pool, rng: Rng, cfg: GameConfig = DEFAULT_CONFIG, gear: readonly GearChoice[] = []): void {
  const c = withRules(player, cfg);
  if (player.freeRefreshes > 0) player.freeRefreshes--;
  else spend(player, c.refreshCost);
  player.frozen = false;
  rollShop(player, pool, rng, cfg, gear);
}

/** Drag a board unit to a new slot (order matters: attacks go left to right). */
export function reorder(player: PlayerState, from: number, to: number): void {
  const n = player.board.length;
  if (!Number.isInteger(from) || from < 0 || from >= n) throw new RuleError(`no board slot ${from}`);
  if (!Number.isInteger(to) || to < 0 || to >= n) throw new RuleError(`invalid board position ${to}`);
  const [unit] = player.board.splice(from, 1);
  player.board.splice(to, 0, unit as Unit);
}

export function toggleFreeze(player: PlayerState): void {
  player.frozen = !player.frozen;
}

export function buy(player: PlayerState, shopIndex: number, cfg: GameConfig = DEFAULT_CONFIG): string {
  const c = withRules(player, cfg);
  const key = player.shop[shopIndex];
  if (key === undefined) throw new RuleError(`no shop slot ${shopIndex}`);
  if (player.hand.length >= c.handSize) throw new RuleError("hand is full");
  spend(player, c.buyCost);
  player.shop.splice(shopIndex, 1);
  player.hand.push({ key, golden: false });
  return key;
}

/** Move a card from hand onto the board at `position` (0..board.length). */
export function play(
  player: PlayerState,
  handIndex: number,
  position: number,
  cfg: GameConfig = DEFAULT_CONFIG,
): void {
  const c = withRules(player, cfg);
  const unit = player.hand[handIndex];
  if (unit === undefined) throw new RuleError(`no hand slot ${handIndex}`);
  if (player.board.length >= c.boardSize) throw new RuleError("board is full");
  if (!Number.isInteger(position) || position < 0 || position > player.board.length) {
    throw new RuleError(`invalid board position ${position}`);
  }
  player.hand.splice(handIndex, 1);
  player.board.splice(position, 0, unit);
}

/** Sell a unit from the board (or hand); the card returns to the shared pool. */
export function sell(
  player: PlayerState,
  from: "board" | "hand",
  index: number,
  pool: Pool,
  cfg: GameConfig = DEFAULT_CONFIG,
): void {
  const zone = from === "board" ? player.board : player.hand;
  const unit = zone[index];
  if (unit === undefined) throw new RuleError(`no ${from} slot ${index}`);
  zone.splice(index, 1);
  // Tokens and other unpooled cards simply vanish; only pooled cards go back (a combined form returns its parts).
  returnToPool(unit, pool);
  const c = withRules(player, cfg);
  player.energy = Math.min(player.energy + c.sellValue, c.maxEnergy);
}

export function upgrade(player: PlayerState, cfg: GameConfig = DEFAULT_CONFIG): void {
  const cost = upgradeCost(player, withRules(player, cfg));
  if (cost === undefined) throw new RuleError("already at max rank");
  spend(player, cost);
  player.rank += 1;
  player.upgradeDiscount = 0;
}

import { DEFAULT_CONFIG, type GameConfig } from "../config.js";
import type { Rng } from "../rng/rng.js";
import type { Pool } from "./pool.js";

/** Thrown when a player intent breaks a rule; the server turns it into an error reply. */
export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

export interface PlayerState {
  energy: number;
  rank: number;
  /** Turns waited since the last rank-up; each one makes the next upgrade 1 cheaper. */
  upgradeDiscount: number;
  shop: string[];
  frozen: boolean;
  hand: string[];
  board: string[];
}

export function newPlayer(): PlayerState {
  return { energy: 0, rank: 1, upgradeDiscount: 0, shop: [], frozen: false, hand: [], board: [] };
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

function spend(player: PlayerState, cost: number): void {
  if (player.energy < cost) {
    throw new RuleError(`not enough energy: need ${cost}, have ${player.energy}`);
  }
  player.energy -= cost;
}

function rollShop(player: PlayerState, pool: Pool, rng: Rng, cfg: GameConfig): void {
  for (const key of player.shop) pool.give(key);
  player.shop = [];
  const size = shopSizeFor(player.rank, cfg);
  for (let i = 0; i < size; i++) {
    const key = pool.draw(rng, player.rank);
    if (key === undefined) break;
    player.shop.push(key);
  }
}

/** Begin a recruit phase: refill energy, tick the upgrade discount, refresh the shop unless frozen. */
export function startTurn(
  player: PlayerState,
  turn: number,
  pool: Pool,
  rng: Rng,
  cfg: GameConfig = DEFAULT_CONFIG,
): void {
  player.energy = energyForTurn(turn, cfg);
  if (turn > 1) player.upgradeDiscount += 1;
  if (player.frozen) {
    player.frozen = false;
  } else {
    rollShop(player, pool, rng, cfg);
  }
}

export function refresh(player: PlayerState, pool: Pool, rng: Rng, cfg: GameConfig = DEFAULT_CONFIG): void {
  spend(player, cfg.refreshCost);
  player.frozen = false;
  rollShop(player, pool, rng, cfg);
}

export function toggleFreeze(player: PlayerState): void {
  player.frozen = !player.frozen;
}

export function buy(player: PlayerState, shopIndex: number, cfg: GameConfig = DEFAULT_CONFIG): string {
  const key = player.shop[shopIndex];
  if (key === undefined) throw new RuleError(`no shop slot ${shopIndex}`);
  if (player.hand.length >= cfg.handSize) throw new RuleError("hand is full");
  spend(player, cfg.buyCost);
  player.shop.splice(shopIndex, 1);
  player.hand.push(key);
  return key;
}

/** Move a card from hand onto the board at `position` (0..board.length). */
export function play(
  player: PlayerState,
  handIndex: number,
  position: number,
  cfg: GameConfig = DEFAULT_CONFIG,
): void {
  const key = player.hand[handIndex];
  if (key === undefined) throw new RuleError(`no hand slot ${handIndex}`);
  if (player.board.length >= cfg.boardSize) throw new RuleError("board is full");
  if (!Number.isInteger(position) || position < 0 || position > player.board.length) {
    throw new RuleError(`invalid board position ${position}`);
  }
  player.hand.splice(handIndex, 1);
  player.board.splice(position, 0, key);
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
  const key = zone[index];
  if (key === undefined) throw new RuleError(`no ${from} slot ${index}`);
  zone.splice(index, 1);
  pool.give(key);
  player.energy = Math.min(player.energy + cfg.sellValue, cfg.maxEnergy);
}

export function upgrade(player: PlayerState, cfg: GameConfig = DEFAULT_CONFIG): void {
  const cost = upgradeCost(player, cfg);
  if (cost === undefined) throw new RuleError("already at max rank");
  spend(player, cost);
  player.rank += 1;
  player.upgradeDiscount = 0;
}

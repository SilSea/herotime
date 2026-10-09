import type { Effect, KeywordKey, SentaiColor } from "@herotime/shared";
import type { Rng } from "./rng/rng.js";
import { card, content, effect } from "./testing.js";
import type { CombatSideExtras, CombatUnitInput } from "./types.js";

/**
 * Random boards with random effects, for fuzzing combat. Used by the engine's own fuzz test and by
 * the web client's replay test (which checks that replaying events reproduces the real result).
 */
const KEYWORDS: KeywordKey[] = ["GUARD", "BARRIER", "RAPID", "LETHAL", "REVIVE", "RIDER_KICK", "FINAL_BLOW", "KYODAIKA", "GATTAI", "LEGACY"];
const FACTIONS = ["sentai", "mecha", "rider", "grunt"];
const COLORS: SentaiColor[] = ["RED", "BLUE", "YELLOW", "GREEN", "PINK", "EXTRA"];
const TRIGGERS = ["START_OF_COMBAT", "LAST_STAND", "ON_ATTACK", "AFTER_DAMAGED", "AVENGE"] as const;
const SELECTORS = ["SELF", "ADJACENT", "LEFTMOST_FRIENDLY", "RIGHTMOST_FRIENDLY", "RANDOM_FRIENDLY", "ALL_FRIENDLY", "LEFTMOST_ENEMY", "RANDOM_ENEMY", "ALL_ENEMY"] as const;

export const fuzzWorld = content({ cards: [card("tok", { atk: 1, hp: 1, token: true }), card("big", { atk: 6, hp: 6 })] });

function randomEffect(rng: Rng): Effect {
  const pickAction = (): object => {
    switch (rng.int(11)) {
      case 10: return { type: "TRIGGER_LAST_STAND" };
      case 9: return { type: "COPY", to: rng.int(3) === 0 ? "HAND" : "BOARD", withBuffs: rng.int(2) === 0 };
      case 7: return { type: "BUFF", atk: 0, hp: 0, fromSelf: true, permanent: rng.int(2) === 0 };
      case 8: return { type: "CONSUME_ALLIES", permanent: rng.int(2) === 0 };
      case 6: return { type: "GAIN_ENERGY", amount: 1 }; // a reward for the next turn
      case 0: return { type: "BUFF", atk: rng.int(3), hp: rng.int(3), permanent: rng.int(2) === 0 };
      case 1: return { type: "SUMMON", cardKey: "tok", count: 1 + rng.int(2) };
      case 2: return { type: "DAMAGE", amount: 1 + rng.int(3) };
      case 3: return { type: "GIVE_KEYWORD", keyword: rng.pick(KEYWORDS) };
      case 4: return { type: "DESTROY" };
      default: return { type: "TRANSFORM", into: rng.pick(["tok", "big"]) };
    }
  };
  const condition = [
    undefined,
    { type: "TEAM_UP_COLORS_GTE", value: 1 + rng.int(3) },
    { type: "FACTION_COUNT_GTE", faction: rng.pick(FACTIONS), value: 1 + rng.int(2) },
    { type: "HAS_CARD", cards: ["tok"] },
  ][rng.int(4)];
  return effect({
    trigger: rng.pick(TRIGGERS),
    every: rng.int(3) === 0 ? 1 + rng.int(3) : undefined,
    condition,
    target: { selector: rng.pick(SELECTORS), faction: rng.int(4) === 0 ? rng.pick(FACTIONS) : undefined, cards: rng.int(5) === 0 ? ["tok", "big"] : undefined },
    actions: [pickAction(), ...(rng.int(3) === 0 ? [pickAction()] : [])],
    goldenMultiplier: rng.int(5) === 0 ? 3 : undefined,
  });
}

function randomUnit(rng: Rng, tag: string): CombatUnitInput {
  const keywords = KEYWORDS.filter(() => rng.int(6) === 0);
  const unit: CombatUnitInput = {
    cardKey: tag,
    rank: 1 + rng.int(6),
    atk: rng.int(7),
    hp: 1 + rng.int(8),
    keywords,
    factions: rng.int(2) === 0 ? [rng.pick(FACTIONS)] : [],
    colors: rng.int(3) === 0 ? [rng.pick(COLORS)] : [],
    golden: rng.int(6) === 0,
    sourceId: `board:${tag}`,
    effects: Array.from({ length: rng.int(3) }, () => randomEffect(rng)),
  };
  return unit;
}

export function randomSide(rng: Rng, tag: string): { board: CombatUnitInput[]; extras: CombatSideExtras } {
  const board = Array.from({ length: rng.int(8) }, (_, i) => randomUnit(rng, `${tag}${i}`));
  const extras: CombatSideExtras = {
    rules: {
      rollCallColors: 1 + rng.int(5),
      gattaiSize: 2 + rng.int(2),
      giantEntryThreshold: rng.int(4),
      kyodaikaMultiplier: 1 + rng.int(3),
    },
    playerEffects: rng.int(3) === 0 ? [effect({ scope: "PLAYER", trigger: "START_OF_COMBAT", target: { selector: "ALL_FRIENDLY" }, actions: [{ type: "BUFF", atk: 1, hp: 1 }] })] : [],
  };
  if (rng.int(3) === 0) extras.giant = randomUnit(rng, `${tag}giant`);
  return { board, extras };
}


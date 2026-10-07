import type { Action, CardDef, Condition, Effect, HeroDef, KeywordKey, RelicDef, Target, Trigger } from "@herotime/shared";

/** Resolves a card, faction or series key to its display name (unknown keys come back unchanged). */
export type Names = (key: string) => string;

const KEYWORD: Record<KeywordKey, string> = {
  GUARD: "Guard",
  BARRIER: "Barrier",
  RAPID: "Rapid",
  LETHAL: "Lethal",
  REVIVE: "Revive",
  RIDER_KICK: "Rider Kick",
  FINAL_BLOW: "Final Blow",
  KYODAIKA: "Kyodaika",
  GATTAI: "Gattai",
  ECHO: "Echo",
};

const TRIGGER: Record<Trigger, string> = {
  ON_PLAY: "Deploy",
  END_OF_TURN: "End of turn",
  HENSHIN: "On Henshin",
  START_OF_COMBAT: "Start of combat",
  ON_ATTACK: "When this attacks",
  AFTER_DAMAGED: "After this takes damage and survives",
  LAST_STAND: "Last Stand",
  AVENGE: "Avenge",
  ALLY_SUMMONED: "When you summon a unit",
  ON_SELL: "When sold",
  ON_DISCARD: "When discarded",
  ON_ACQUIRE: "When acquired",
  ON_TURN_START: "At the start of each turn",
  ON_USE: "When used",
  ON_ROLL_CALL: "On Roll Call",
  ON_ROLL_CALL_WIN: "On Roll Call win",
};

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function who(t: Target | undefined, names: Names): string {
  // "the leftmost Ally unit" reads better than "the leftmost ally ally".
  const filter = [t?.faction, t?.series].filter((x): x is string => !!x).map(names).join(" ");
  const one = filter ? `${filter} unit` : "ally";
  const many = filter ? `${filter} units` : "allies";
  if (t?.cards) {
    // Named cards: "your Agent Number 7 or Kamen Rider Zeztz".
    const list = [filter, t.cards.map(names).join(" or ")].filter(Boolean).join(" ");
    switch (t.selector) {
      case "LEFTMOST_FRIENDLY": return `your leftmost ${list}`;
      case "RIGHTMOST_FRIENDLY": return `your rightmost ${list}`;
      case "RANDOM_FRIENDLY": return `another random ${list}`;
      case "ALL_FRIENDLY": return `your ${list}`;
      case "CHOSEN_FRIENDLY": return `a chosen ${list}`;
      default: break;
    }
  }
  switch (t?.selector ?? "SELF") {
    case "SELF": return "this";
    case "ADJACENT": return "adjacent units";
    case "LEFTMOST_FRIENDLY": return `the leftmost ${one}`;
    case "RIGHTMOST_FRIENDLY": return `the rightmost ${one}`;
    case "RANDOM_FRIENDLY": return `another random ${one}`;
    case "ALL_FRIENDLY": return `all ${many}`;
    case "CHOSEN_FRIENDLY": return `a chosen ${one}`;
    case "SUMMONED": return "it";
    case "GIANT_SLOT": return "your Giant Robo";
    case "LEFTMOST_ENEMY": return "the leftmost enemy";
    case "RANDOM_ENEMY": return "a random enemy";
    case "ALL_ENEMY": return "all enemies";
  }
}

function condition(c: Condition | undefined, names: Names): string {
  if (!c) return "";
  switch (c.type) {
    case "TEAM_UP_COLORS_GTE": return `If you have ${c.value}+ ranger colors, `;
    case "FACTION_COUNT_GTE": return `If you have ${c.value}+ ${names(c.faction)} units, `;
    case "SERIES_COUNT_GTE": return `If you have ${c.value}+ ${names(c.series)} units, `;
    case "ENERGY_GTE": return `If you have ${c.value}+ Energy, `;
    case "HAS_CARD": return `If you have ${c.cards.map(names).join(" or ")}, `;
  }
}

function action(a: Action, target: Target | undefined, names: Names): string {
  const t = who(target, names);
  switch (a.type) {
    case "BUFF": {
      const stats = `${signed(a.atk)}/${signed(a.hp)}`;
      const own = a.fromSelf ? (a.atk || a.hp ? `this unit's ATK/HP ${stats}` : "this unit's ATK/HP") : stats;
      return `give ${t} ${own}${a.permanent ? " permanently" : ""}`;
    }
    case "COPY": return a.to === "HAND" ? `add a copy of ${t} to your hand${a.withBuffs ? " (bonuses included)" : ""}` : `summon a copy of ${t}${a.withBuffs ? " (bonuses included)" : ""}`;
    case "CONSUME_ALLIES": return `destroy all your other units and give ${t} their total ATK/HP${a.permanent ? " permanently" : ""}`;
    case "SUMMON": return `summon ${a.count > 1 ? `${a.count} ` : ""}${names(a.cardKey)}${a.count > 1 ? "s" : ""}`;
    case "DAMAGE": return `deal ${a.amount} damage to ${t}`;
    case "GIVE_KEYWORD": return `give ${t} ${KEYWORD[a.keyword]}`;
    case "TRANSFORM": return `transform ${t} into ${names(a.into)}`;
    case "DESTROY": return `destroy ${t}`;
    case "GAIN_ENERGY": return `gain ${a.amount} Energy`;
    case "GAUGE_ADD": return `add ${a.amount} to the ${a.gauge} gauge`;
    case "MODIFY_RULE": return ruleText(a.rule, a.op, a.value);
    case "ADD_TO_HAND": return `add ${names(a.cardKey)} to your hand`;
    case "DISCOVER_GIANT": return "discover a Giant Robo";
    case "SUPER_GATTAI": return `Super Gattai: in fights with an Extra Ranger on your board, your Giant Robo gets +${a.atk}/+${a.hp} and that Ranger's keywords`;
    case "RANDOM_CARD": return `add a random ${a.faction ? `${names(a.faction)} ` : ""}${a.cardKind === "GEAR" ? "Gear" : "unit"} to your hand`;
    case "ULTIMATE_FORM": return `turn ${t} into its Ultimate Form`;
    case "BUFF_SHOP": return `units in your tavern get ${signed(a.atk)}/${signed(a.hp)} for the rest of the game`;
    case "BUFF_GEAR": return `your Gear give ${signed(a.atk)}/${signed(a.hp)} more for the rest of the game`;
    case "DEVOUR_SHOP": return `devour ${a.choose === "STRONGEST" ? "the strongest" : a.choose === "WEAKEST" ? "the weakest" : "a random"} ${a.faction ? `${names(a.faction)} ` : ""}unit in your tavern and give its stats to ${t}`;
    case "DISCARD": {
      const what = a.cardKind === "GEAR" ? "Gear" : a.cardKind === "UNIT" ? "unit" : "card";
      const which = a.pick === "LEFTMOST" ? "your leftmost" : a.pick === "RIGHTMOST" ? "your rightmost" : "a random";
      return a.count > 1 ? `discard ${a.count} ${which === "a random" ? "random" : which} ${what}s from your hand` : `discard ${which} ${what} from your hand`;
    }
    case "SUMMON_FROM_HAND": return `summon ${a.count > 1 ? `${a.count} units` : "a unit"} from your hand`;
    case "DISCOVER_UNIT": return a.faction ? `discover a ${names(a.faction)} unit` : "discover a unit";
  }
}

/** How players read the rules that relics, heroes and cards can change. */
const RULE_LABEL: Record<string, string> = {
  startEnergy: "your starting Energy",
  energyPerTurn: "the Energy you gain each turn",
  maxEnergy: "your maximum Energy",
  buyCost: "the cost to buy a unit",
  sellValue: "the Energy you get for selling",
  refreshCost: "the cost to Refresh",
  boardSize: "your board size",
  handSize: "your hand size",
  maxRank: "your maximum rank",
  freeRefreshesPerTurn: "your free Refreshes each turn",
  rollCallColors: "the colours Roll Call needs",
  rollCallBuff: "the Roll Call bonus",
  gattaiSize: "the units Gattai needs",
  giantEntryThreshold: "the units left when your Giant Robo joins",
  giantSentaiScale: "the share of Sentai stats your Giant Robo gets",
  kyodaikaMultiplier: "the Kyodaika stat multiplier",
};

export function ruleText(rule: string, op: "SET" | "ADD" | "MUL", value: number): string {
  if (op === "SET") {
    switch (rule) {
      case "freeRefreshesPerTurn": return `get ${value} free Refresh${value === 1 ? "" : "es"} each turn`;
      case "gattaiSize": return `Gattai needs only ${value} adjacent units`;
      case "rollCallColors": return `Roll Call needs only ${value} colours`;
      case "giantEntryThreshold": return `your Giant Robo joins when ${value} or fewer of your units are left`;
      case "kyodaikaMultiplier": return `Kyodaika units return with x${value} stats`;
    }
  }
  const label = RULE_LABEL[rule] ?? `rule "${rule}"`;
  if (op === "SET") return `${label} becomes ${value}`;
  if (op === "ADD") return `${label} ${value >= 0 ? "+" : ""}${value}`;
  return `${label} x${value}`;
}

const FIGHT_TRIGGERS = new Set(["START_OF_COMBAT", "ON_ATTACK", "AFTER_DAMAGED", "LAST_STAND", "AVENGE"]);
const LATER = new Set(["GAIN_ENERGY", "ADD_TO_HAND", "RANDOM_CARD", "DISCOVER_UNIT", "GAUGE_ADD", "BUFF_SHOP", "BUFF_GEAR"]);

export function effectText(e: Effect, names: Names): string {
  const trigger = e.trigger === "AVENGE" ? `Avenge (${e.every ?? 1})` : TRIGGER[e.trigger];
  // In a fight, Energy / cards / Gauge are earned for the start of the next turn.
  const later = (a: Effect["actions"][number]): string => (FIGHT_TRIGGERS.has(e.trigger) && (LATER.has(a.type) || (a.type === "COPY" && a.to === "HAND")) ? " next turn" : "");
  const body = e.actions.map((a) => action(a, e.target, names) + later(a)).join(", then ");
  const limit = e.limit ? (e.limit.times === 1 ? ` (once per ${e.limit.per === "TURN" ? "turn" : "game"})` : ` (up to ${e.limit.times} times per ${e.limit.per === "TURN" ? "turn" : "game"})`) : "";
  const text = `${trigger}: ${condition(e.condition, names)}${body}${e.repeat && e.repeat > 1 ? ` (${e.repeat} times)` : ""}${limit}.`;
  return e.goldenMultiplier && e.goldenMultiplier !== 2 ? `${text} (Golden: x${e.goldenMultiplier})` : text;
}

/** Rules text of a card: Henshin, then every effect. Keywords are not repeated here: the card shows them as chips. */
export function cardText(c: CardDef, names: Names): string {
  const lines: string[] = [];
  if (c.henshin) lines.push(`Henshin (${c.henshin.afterTurns}): becomes ${names(c.henshin.into)}.`);
  if (c.gattaiInto) lines.push(`Gattai core: leading a Gattai group, it becomes ${names(c.gattaiInto)}.`);
  if (c.ultimateInto) lines.push(`Ultimate Form: ${names(c.ultimateInto)}.`);
  if (c.keywords.includes("ECHO")) lines.push("Echo: your Deploy effects happen twice.");
  // Gear is used from the hand, so its ON_PLAY reads "Use:" rather than the units' "Deploy:".
  for (const e of c.effects) lines.push(c.kind === "GEAR" && e.trigger === "ON_PLAY" ? effectText(e, names).replace(/^Deploy: /, "Use: ") : effectText(e, names));
  return lines.join(" ");
}

export function relicText(r: RelicDef, names: Names): string {
  return r.effects.map((e) => effectText(e, names)).join(" ");
}

export function heroText(h: HeroDef, names: Names): string {
  const p = h.power;
  if (!p) return h.armor > 0 ? `${h.armor} armor.` : "";
  const mode = p.mode === "ACTIVE" ? `Hero Power (${p.cost ?? 0} Energy, once per turn)` : p.mode === "ONCE" ? `Hero Power (${p.cost ?? 0} Energy, once per game)` : "Passive";
  // "When used" and "When acquired" go without saying for a hero power; any other trigger (each turn, combat) is kept.
  const body = p.effects.map((e) => { const t = effectText(e, names); return cap(e.trigger === "ON_USE" || e.trigger === "ON_ACQUIRE" ? t.replace(/^[^:]+: /, "") : t); }).join(" ");
  return `${mode}: ${body}${h.armor > 0 ? ` ${h.armor} armor.` : ""}`;
}

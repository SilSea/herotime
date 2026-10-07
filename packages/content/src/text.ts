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
};

const TRIGGER: Record<Trigger, string> = {
  ON_PLAY: "Henshin Call",
  END_OF_TURN: "End of turn",
  HENSHIN: "On Henshin",
  START_OF_COMBAT: "Start of combat",
  ON_ATTACK: "When this attacks",
  AFTER_DAMAGED: "After this takes damage and survives",
  LAST_STAND: "Last Stand",
  AVENGE: "Avenge",
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
  switch (t?.selector ?? "SELF") {
    case "SELF": return "this";
    case "ADJACENT": return "adjacent units";
    case "LEFTMOST_FRIENDLY": return `the leftmost ${one}`;
    case "RIGHTMOST_FRIENDLY": return `the rightmost ${one}`;
    case "RANDOM_FRIENDLY": return `another random ${one}`;
    case "ALL_FRIENDLY": return `all ${many}`;
    case "CHOSEN_FRIENDLY": return `a chosen ${one}`;
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
  }
}

function action(a: Action, target: Target | undefined, names: Names): string {
  const t = who(target, names);
  switch (a.type) {
    case "BUFF": {
      const stats = `${signed(a.atk)}/${signed(a.hp)}`;
      return `give ${t} ${stats}${a.permanent ? " permanently" : ""}`;
    }
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

export function effectText(e: Effect, names: Names): string {
  const trigger = e.trigger === "AVENGE" ? `Avenge (${e.every ?? 1})` : TRIGGER[e.trigger];
  const body = e.actions.map((a) => action(a, e.target, names)).join(", then ");
  const text = `${trigger}: ${condition(e.condition, names)}${body}.`;
  return e.goldenMultiplier && e.goldenMultiplier !== 2 ? `${text} (Golden: x${e.goldenMultiplier})` : text;
}

/** Rules text of a card: Henshin, then every effect. Keywords are not repeated here: the card shows them as chips. */
export function cardText(c: CardDef, names: Names): string {
  const lines: string[] = [];
  if (c.henshin) lines.push(`Henshin (${c.henshin.afterTurns}): becomes ${names(c.henshin.into)}.`);
  if (c.gattaiInto) lines.push(`Gattai core: leading a Gattai group, it becomes ${names(c.gattaiInto)}.`);
  // Gear is used from the hand, so its ON_PLAY reads "Use:" rather than the units' "Henshin Call:".
  for (const e of c.effects) lines.push(c.kind === "GEAR" && e.trigger === "ON_PLAY" ? effectText(e, names).replace(/^Henshin Call: /, "Use: ") : effectText(e, names));
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

import type { Action, CardDef, Condition, Effect, HeroDef, KeywordKey, RelicDef, Target, Trigger } from "@herotime/shared";

/** Resolves a card key to a display name. */
export type Names = (cardKey: string) => string;

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

function who(t: Target | undefined): string {
  const filter = [t?.faction, t?.series].filter(Boolean).join(" ");
  const f = filter ? `${filter} ` : "";
  switch (t?.selector ?? "SELF") {
    case "SELF": return "this";
    case "ADJACENT": return "adjacent units";
    case "LEFTMOST_FRIENDLY": return `the leftmost ${f}ally`;
    case "RIGHTMOST_FRIENDLY": return `the rightmost ${f}ally`;
    case "RANDOM_FRIENDLY": return `another random ${f}ally`;
    case "ALL_FRIENDLY": return `all ${f}allies`;
    case "LEFTMOST_ENEMY": return "the leftmost enemy";
    case "RANDOM_ENEMY": return "a random enemy";
    case "ALL_ENEMY": return "all enemies";
  }
}

function condition(c: Condition | undefined): string {
  if (!c) return "";
  switch (c.type) {
    case "TEAM_UP_COLORS_GTE": return `If you have ${c.value}+ ranger colors, `;
    case "FACTION_COUNT_GTE": return `If you have ${c.value}+ ${c.faction} units, `;
    case "SERIES_COUNT_GTE": return `If you have ${c.value}+ ${c.series} units, `;
    case "ENERGY_GTE": return `If you have ${c.value}+ Energy, `;
  }
}

function action(a: Action, target: Target | undefined, names: Names): string {
  const t = who(target);
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
    case "MODIFY_RULE": {
      const verb = a.op === "SET" ? "set to" : a.op === "ADD" ? "change by" : "multiply by";
      return `rule ${a.rule}: ${verb} ${a.value}`;
    }
    case "ADD_TO_HAND": return `add ${names(a.cardKey)} to your hand`;
    case "DISCOVER_GIANT": return "discover a Giant Robo";
  }
}

export function effectText(e: Effect, names: Names): string {
  const trigger = e.trigger === "AVENGE" ? `Avenge (${e.every ?? 1})` : TRIGGER[e.trigger];
  const body = e.actions.map((a) => action(a, e.target, names)).join(", then ");
  const text = `${trigger}: ${condition(e.condition)}${body}.`;
  return e.goldenMultiplier && e.goldenMultiplier !== 2 ? `${text} (Golden: x${e.goldenMultiplier})` : text;
}

/** Rules text of a card: Henshin, then every effect. Keywords are not repeated here: the card shows them as chips. */
export function cardText(c: CardDef, names: Names): string {
  const lines: string[] = [];
  if (c.henshin) lines.push(`Henshin (${c.henshin.afterTurns}): becomes ${names(c.henshin.into)}.`);
  for (const e of c.effects) lines.push(effectText(e, names));
  return lines.join(" ");
}

export function relicText(r: RelicDef, names: Names): string {
  return r.effects.map((e) => effectText(e, names)).join(" ");
}

export function heroText(h: HeroDef, names: Names): string {
  const p = h.power;
  if (!p) return h.armor > 0 ? `${h.armor} armor.` : "";
  const mode = p.mode === "ACTIVE" ? `Hero Power (${p.cost ?? 0} Energy, once per turn)` : p.mode === "ONCE" ? `Hero Power (${p.cost ?? 0} Energy, once per game)` : "Passive";
  const body = p.effects.map((e) => cap(effectText(e, names).replace(/^[^:]+: /, ""))).join(" ");
  return `${mode}: ${body}${h.armor > 0 ? ` ${h.armor} armor.` : ""}`;
}

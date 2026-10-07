import { tr } from "./i18n.js";

/**
 * The card wizard's model: a card described in plain choices ("when it attacks" -> "summon" -> "a Cub"),
 * turned into the content JSON the editor stores. DOM-free so it can be tested; the wizard screen is
 * ui/card-wizard.ts.
 */

export type Phase = "recruit" | "fight" | "both";
export type CardType = "UNIT" | "GEAR" | "TOKEN" | "GIANT";

export interface WhenOption {
  key: string;
  phase: Phase;
  label: () => string;
}

/** When an ability fires, for units (gear always fires when used). */
export const WHEN: WhenOption[] = [
  { key: "ON_PLAY", phase: "recruit", label: () => tr("When played from hand (Deploy)", "เมื่อลงจากมือ (Deploy)") },
  { key: "END_OF_TURN", phase: "recruit", label: () => tr("At the end of your turn", "ตอนจบเทิร์น") },
  { key: "HENSHIN", phase: "recruit", label: () => tr("When it transforms (Henshin)", "เมื่อแปลงร่าง") },
  { key: "START_OF_COMBAT", phase: "fight", label: () => tr("At the start of combat", "ตอนเริ่มการต่อสู้") },
  { key: "ON_ATTACK", phase: "fight", label: () => tr("When it attacks", "เมื่อโจมตี") },
  { key: "AFTER_DAMAGED", phase: "fight", label: () => tr("When it survives damage", "เมื่อโดนดาเมจแล้วยังรอด") },
  { key: "LAST_STAND", phase: "fight", label: () => tr("When it dies (Last Stand)", "เมื่อตาย (Last Stand)") },
  { key: "AVENGE", phase: "fight", label: () => tr("After N of your units die (Avenge)", "เมื่อพวกเราตายครบ N ตัว (Avenge)") },
  { key: "ALLY_SUMMONED", phase: "both", label: () => tr("When you summon another unit", "เมื่อเรียกยูนิตอื่นเข้าสนาม") },
  { key: "ON_SELL", phase: "recruit", label: () => tr("When sold", "เมื่อถูกขาย") },
  { key: "ON_DISCARD", phase: "recruit", label: () => tr("When discarded (by another card)", "เมื่อถูกการ์ดอื่นทิ้ง") },
];

export interface DoOption {
  key: string;
  /** Phases it works in. */
  phases: Phase[];
  /** Whether it acts on a target unit. */
  targeted: boolean;
  label: () => string;
}

export const DO: DoOption[] = [
  { key: "BUFF", phases: ["recruit", "fight", "both"], targeted: true, label: () => tr("Give stats (+ATK/+HP)", "เพิ่มค่าพลัง (+ATK/+HP)") },
  { key: "GIVE_KEYWORD", phases: ["recruit", "fight", "both"], targeted: true, label: () => tr("Give a keyword", "ให้ keyword") },
  { key: "SUMMON", phases: ["recruit", "fight", "both"], targeted: false, label: () => tr("Summon a unit", "เรียกยูนิตเข้าสนาม") },
  { key: "DESTROY", phases: ["recruit", "fight", "both"], targeted: true, label: () => tr("Destroy", "ทำลาย") },
  { key: "DAMAGE", phases: ["fight"], targeted: true, label: () => tr("Deal damage", "ทำดาเมจ") },
  { key: "GAIN_ENERGY", phases: ["recruit"], targeted: false, label: () => tr("Gain Energy", "ได้ Energy") },
  { key: "ADD_TO_HAND", phases: ["recruit"], targeted: false, label: () => tr("Add a card to your hand", "ได้การ์ดเข้ามือ") },
  { key: "DISCOVER_UNIT", phases: ["recruit"], targeted: false, label: () => tr("Discover a unit (1 of 3)", "เลือกรับยูนิต 1 จาก 3") },
  { key: "RANDOM_CARD", phases: ["recruit"], targeted: false, label: () => tr("Get a random Gear / unit", "ได้ Gear / ยูนิตแบบสุ่ม") },
  { key: "SUMMON_FROM_HAND", phases: ["recruit", "fight", "both"], targeted: false, label: () => tr("Summon units from your hand", "เรียกยูนิตจากบนมือ") },
  { key: "BUFF_SHOP", phases: ["recruit"], targeted: false, label: () => tr("Buff the units in your tavern", "เพิ่มพลังยูนิตในร้านค้า") },
  { key: "DEVOUR_SHOP", phases: ["recruit"], targeted: true, label: () => tr("Devour a tavern unit (gain its stats)", "กลืนกินยูนิตในร้าน (ได้ค่าพลังของมัน)") },
  { key: "DISCARD", phases: ["recruit"], targeted: false, label: () => tr("Discard cards from your hand", "ทิ้งการ์ดในมือ") },
  { key: "ULTIMATE_FORM", phases: ["recruit"], targeted: true, label: () => tr("Change into its upgraded form (Rider final form, upgraded robo…)", "เปลี่ยน/อัปเกรดร่าง (ร่างสุดท้าย Rider, หุ่นร่างอัปเกรด…)") },
];

export interface TargetOption {
  key: string;
  /** Only where this holds. */
  ok: (when: string, phase: Phase, type: CardType) => boolean;
  label: () => string;
}

const friendlyAnywhere = (): boolean => true;
export const TARGET: TargetOption[] = [
  { key: "SELF", ok: (_w, _p, t) => t !== "GEAR", label: () => tr("This unit", "ตัวมันเอง") },
  { key: "CHOSEN_FRIENDLY", ok: (_w, _p, t) => t === "GEAR", label: () => tr("A unit the player picks", "ยูนิตที่ผู้เล่นเลือก") },
  { key: "SUMMONED", ok: (w) => w === "ALLY_SUMMONED", label: () => tr("The unit just summoned", "ตัวที่เพิ่งถูกเรียก") },
  { key: "GIANT_SLOT", ok: friendlyAnywhere, label: () => tr("Your Giant Robo (Giant Slot)", "Giant Robo ในช่อง Giant") },
  { key: "ADJACENT", ok: (_w, _p, t) => t !== "GEAR", label: () => tr("The units next to it", "ตัวที่อยู่ข้างๆ") },
  { key: "LEFTMOST_FRIENDLY", ok: friendlyAnywhere, label: () => tr("Your leftmost unit", "พวกเราซ้ายสุด") },
  { key: "RIGHTMOST_FRIENDLY", ok: friendlyAnywhere, label: () => tr("Your rightmost unit", "พวกเราขวาสุด") },
  { key: "RANDOM_FRIENDLY", ok: friendlyAnywhere, label: () => tr("Another random unit of yours", "พวกเราตัวอื่นแบบสุ่ม") },
  { key: "ALL_FRIENDLY", ok: friendlyAnywhere, label: () => tr("All your units", "พวกเราทุกตัว") },
  { key: "LEFTMOST_ENEMY", ok: (_w, p) => p === "fight", label: () => tr("The leftmost enemy", "ศัตรูซ้ายสุด") },
  { key: "RANDOM_ENEMY", ok: (_w, p) => p === "fight", label: () => tr("A random enemy", "ศัตรูแบบสุ่ม") },
  { key: "ALL_ENEMY", ok: (_w, p) => p === "fight", label: () => tr("All enemies", "ศัตรูทุกตัว") },
];

export interface Ability {
  when: string;
  /** AVENGE: every N deaths. */
  every: number;
  /** "" = always; otherwise TEAM_UP_COLORS_GTE | FACTION_COUNT_GTE | ENERGY_GTE. */
  condition: string;
  conditionValue: number;
  conditionFaction: string;
  do: string;
  atk: number;
  hp: number;
  permanent: boolean;
  keyword: string;
  cardKey: string;
  count: number;
  amount: number;
  /** DISCOVER_UNIT: "" = any faction. */
  faction: string;
  target: string;
  /** Only units of this faction ("" = any). */
  targetFaction: string;
  /** RANDOM_CARD: a Gear or a unit. */
  cardKind: "GEAR" | "UNIT";
  /** How many times the whole ability happens (1 = once). */
  repeat: number;
  /** DISCARD: which card and what kind. */
  pick: "RANDOM" | "LEFTMOST" | "RIGHTMOST";
  discardKind: "ANY" | "UNIT" | "GEAR";
  /** DEVOUR_SHOP: only units of at most this rank (0 = any), and which one. */
  maxRank: number;
  choose: "RANDOM" | "STRONGEST" | "WEAKEST";
  /** At most this many times per turn / game (0 = no limit). */
  limitTimes: number;
  limitPer: "TURN" | "GAME";
}

export interface Recipe {
  type: CardType;
  key: string;
  /** False until the admin types a key: the key follows the name. */
  keyEdited: boolean;
  name: string;
  rank: number;
  atk: number;
  hp: number;
  factions: string[];
  series: string;
  colors: string[];
  keywords: string[];
  abilities: Ability[];
  cost: number;
  costType: "ENERGY" | "HEALTH";
  henshinTurns: number;
  henshinInto: string;
  gattaiInto: string;
  /** ULTIMATE_FORM turns this unit into this card. */
  ultimateInto: string;
  art: string;
}

export const newAbility = (type: CardType): Ability => ({
  when: type === "GEAR" ? "ON_PLAY" : "START_OF_COMBAT",
  every: 2,
  condition: "",
  conditionValue: 2,
  conditionFaction: "",
  do: "BUFF",
  atk: 1,
  hp: 1,
  permanent: false,
  keyword: "GUARD",
  cardKey: "",
  count: 1,
  amount: 1,
  faction: "",
  target: type === "GEAR" ? "CHOSEN_FRIENDLY" : "SELF",
  targetFaction: "",
  cardKind: "GEAR",
  repeat: 1,
  pick: "RANDOM",
  discardKind: "ANY",
  maxRank: 0,
  choose: "RANDOM",
  limitTimes: 0,
  limitPer: "TURN",
});

export const newRecipe = (): Recipe => ({
  type: "UNIT",
  key: "",
  keyEdited: false,
  name: "",
  rank: 1,
  atk: 2,
  hp: 2,
  factions: [],
  series: "",
  colors: [],
  keywords: [],
  abilities: [],
  cost: 2,
  costType: "ENERGY",
  henshinTurns: 0,
  henshinInto: "",
  gattaiInto: "",
  ultimateInto: "",
  art: "",
});

/** "Den Mother" -> "den_mother": a key made from the name, unique among `taken`. */
export function keyFromName(name: string, taken: ReadonlySet<string>): string {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "card";
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}_${n}`;
  return key;
}

export const phaseOf = (when: string, type: CardType): Phase => (type === "GEAR" ? "recruit" : (WHEN.find((w) => w.key === when)?.phase ?? "fight"));

/** What can be picked for an ability, given what is picked so far (the wizard only offers these). */
export function choicesFor(a: Ability, type: CardType): { when: WhenOption[]; do: DoOption[]; target: TargetOption[] } {
  const phase = phaseOf(a.when, type);
  return {
    when: type === "GEAR" ? [] : WHEN,
    do: DO.filter((d) => d.phases.includes(phase)),
    target: TARGET.filter((t) => t.ok(a.when, phase, type)),
  };
}

/** Problems that would stop the card from saving or working, in words. Empty = good to go. */
export function checkRecipe(r: Recipe, takenKeys: ReadonlySet<string>): string[] {
  const out: string[] = [];
  if (!r.name.trim()) out.push(tr("Give the card a name.", "ใส่ชื่อการ์ด"));
  if (!/^[a-z0-9_]+$/.test(r.key)) out.push(tr("The key may use only a-z, 0-9 and _.", "key ใช้ได้แค่ a-z, 0-9 และ _"));
  else if (takenKeys.has(r.key)) out.push(tr(`There is already a card with the key "${r.key}".`, `มีการ์ด key "${r.key}" อยู่แล้ว`));
  if (r.type !== "GEAR" && (r.atk < 0 || r.hp < 1)) out.push(tr("A unit needs at least 1 HP.", "ยูนิตต้องมี HP อย่างน้อย 1"));
  if (r.type === "GEAR" && r.abilities.length === 0) out.push(tr("Gear needs at least one ability (what it does when used).", "Gear ต้องมีความสามารถอย่างน้อย 1 อย่าง"));
  if (r.keywords.includes("GATTAI") === false && r.gattaiInto) out.push(tr("A Gattai core needs the Gattai keyword.", "Gattai core ต้องมี keyword Gattai"));
  if (r.henshinTurns > 0 && !r.henshinInto) out.push(tr("Pick the card it transforms into.", "เลือกการ์ดร่างที่แปลงไป"));
  r.abilities.forEach((a, i) => {
    const n = i + 1;
    const c = choicesFor(a, r.type);
    const d = DO.find((x) => x.key === a.do);
    if (!c.do.some((x) => x.key === a.do)) out.push(tr(`Ability ${n}: "${d?.label() ?? a.do}" does not work at that moment.`, `ความสามารถ ${n}: "${d?.label() ?? a.do}" ใช้ในจังหวะนั้นไม่ได้`));
    if (d?.targeted && !c.target.some((x) => x.key === a.target)) out.push(tr(`Ability ${n}: pick who it affects.`, `ความสามารถ ${n}: เลือกเป้าหมาย`));
    if ((a.do === "SUMMON" || a.do === "ADD_TO_HAND") && !a.cardKey) out.push(tr(`Ability ${n}: pick the card.`, `ความสามารถ ${n}: เลือกการ์ด`));
    if (a.do === "ULTIMATE_FORM" && r.type !== "GEAR" && a.target === "SELF" && !r.ultimateInto) out.push(tr(`Ability ${n}: this card has no Ultimate Form (set it in step 4).`, `ความสามารถ ${n}: การ์ดนี้ยังไม่มีร่าง Ultimate (ตั้งในขั้นที่ 4)`));
    if (a.do === "BUFF" && a.atk === 0 && a.hp === 0) out.push(tr(`Ability ${n}: the buff adds nothing.`, `ความสามารถ ${n}: บัฟเป็น 0`));
  });
  return out;
}

/** The content JSON for the card (what the editor stores). Rules text is left empty: the server writes it in both languages. */
export function buildCard(r: Recipe): Record<string, unknown> {
  const card: Record<string, unknown> = {
    key: r.key,
    name: r.name.trim(),
    rank: r.rank,
    atk: r.type === "GEAR" ? 0 : r.atk,
    hp: r.type === "GEAR" ? 1 : r.hp,
    kind: r.type === "TOKEN" ? "UNIT" : r.type,
    token: r.type === "TOKEN" || r.type === "GIANT",
    factions: [...r.factions],
    colors: [...r.colors],
    keywords: r.type === "GEAR" ? [] : [...r.keywords],
    effects: r.abilities.map((a) => abilityEffect(a, r.type)),
    text: "",
  };
  if (r.series) card.series = r.series;
  if (r.type === "GEAR") {
    card.cost = r.cost;
    card.costType = r.costType;
  }
  if (r.type !== "GEAR" && r.henshinTurns > 0 && r.henshinInto) card.henshin = { afterTurns: r.henshinTurns, into: r.henshinInto };
  if (r.type !== "GEAR" && r.gattaiInto) card.gattaiInto = r.gattaiInto;
  if (r.type !== "GEAR" && r.ultimateInto) card.ultimateInto = r.ultimateInto;
  if (r.art) card.art = r.art;
  return card;
}

function abilityEffect(a: Ability, type: CardType): Record<string, unknown> {
  const gear = type === "GEAR";
  const d = DO.find((x) => x.key === a.do);
  const action: Record<string, unknown> = { type: a.do };
  if (a.do === "BUFF") Object.assign(action, { atk: a.atk, hp: a.hp, permanent: a.permanent });
  if (a.do === "GIVE_KEYWORD") action.keyword = a.keyword;
  if (a.do === "SUMMON") Object.assign(action, { cardKey: a.cardKey, count: Math.max(1, a.count) });
  if (a.do === "ADD_TO_HAND") action.cardKey = a.cardKey;
  if (a.do === "DAMAGE" || a.do === "GAIN_ENERGY") action.amount = Math.max(1, a.amount);
  if (a.do === "DISCOVER_UNIT" && a.faction) action.faction = a.faction;
  if (a.do === "RANDOM_CARD") Object.assign(action, { cardKind: a.cardKind, ...(a.faction ? { faction: a.faction } : {}) });
  if (a.do === "BUFF_SHOP") Object.assign(action, { atk: a.atk, hp: a.hp });
  if (a.do === "SUMMON_FROM_HAND") action.count = Math.max(1, a.count);
  if (a.do === "DISCARD") Object.assign(action, { count: Math.max(1, a.count), pick: a.pick, cardKind: a.discardKind });
  if (a.do === "DEVOUR_SHOP") Object.assign(action, { choose: a.choose, ...(a.maxRank > 0 ? { maxRank: a.maxRank } : {}), ...(a.faction ? { faction: a.faction } : {}) });
  const effect: Record<string, unknown> = { scope: gear ? "PLAYER" : "UNIT", trigger: gear ? "ON_PLAY" : a.when, actions: [action] };
  if (!gear && a.when === "AVENGE") effect.every = Math.max(1, a.every);
  if (a.repeat > 1) effect.repeat = Math.min(5, a.repeat);
  if (a.limitTimes > 0) effect.limit = { times: a.limitTimes, per: a.limitPer };
  if (d?.targeted) effect.target = { selector: a.target, ...(a.targetFaction ? { faction: a.targetFaction } : {}) };
  if (a.condition === "TEAM_UP_COLORS_GTE" || a.condition === "ENERGY_GTE") effect.condition = { type: a.condition, value: a.conditionValue };
  if (a.condition === "FACTION_COUNT_GTE" && a.conditionFaction) effect.condition = { type: a.condition, faction: a.conditionFaction, value: a.conditionValue };
  return effect;
}

/** One line per ability in plain words, for the preview (the saved card gets the server's own text). */
export function describeRecipe(r: Recipe, cardName: (key: string) => string, factionName: (key: string) => string): string[] {
  return r.abilities.map((a) => {
    const when = r.type === "GEAR" ? tr("Use", "ใช้") : a.when === "AVENGE" ? `Avenge (${a.every})` : (WHEN.find((w) => w.key === a.when)?.label() ?? a.when);
    const who = (TARGET.find((t) => t.key === a.target)?.label() ?? "") + (a.targetFaction ? ` (${factionName(a.targetFaction)})` : "");
    const cond =
      a.condition === "TEAM_UP_COLORS_GTE" ? tr(`if you have ${a.conditionValue}+ Sentai colours, `, `ถ้ามี Sentai ${a.conditionValue} สีขึ้นไป `)
      : a.condition === "FACTION_COUNT_GTE" ? tr(`if you have ${a.conditionValue}+ ${factionName(a.conditionFaction)} units, `, `ถ้ามียูนิต ${factionName(a.conditionFaction)} ${a.conditionValue} ตัวขึ้นไป `)
      : a.condition === "ENERGY_GTE" ? tr(`if you have ${a.conditionValue}+ Energy, `, `ถ้ามี Energy ${a.conditionValue} ขึ้นไป `)
      : "";
    const sign = (n: number): string => (n >= 0 ? `+${n}` : String(n));
    const what =
      a.do === "BUFF" ? tr(`give ${who} ${sign(a.atk)}/${sign(a.hp)}${a.permanent ? " permanently" : ""}`, `ให้${who} ${sign(a.atk)}/${sign(a.hp)}${a.permanent ? " ถาวร" : ""}`)
      : a.do === "GIVE_KEYWORD" ? tr(`give ${who} ${a.keyword}`, `ให้${who}ได้ ${a.keyword}`)
      : a.do === "SUMMON" ? tr(`summon ${a.count > 1 ? `${a.count} × ` : ""}${cardName(a.cardKey)}`, `เรียก ${cardName(a.cardKey)}${a.count > 1 ? ` ${a.count} ตัว` : ""}`)
      : a.do === "DESTROY" ? tr(`destroy ${who}`, `ทำลาย${who}`)
      : a.do === "DAMAGE" ? tr(`deal ${a.amount} damage to ${who}`, `ทำดาเมจ ${a.amount} ใส่${who}`)
      : a.do === "GAIN_ENERGY" ? tr(`gain ${a.amount} Energy`, `ได้ ${a.amount} Energy`)
      : a.do === "ADD_TO_HAND" ? tr(`add ${cardName(a.cardKey)} to your hand`, `ได้ ${cardName(a.cardKey)} เข้ามือ`)
      : a.do === "RANDOM_CARD" ? tr(`add a random ${a.faction ? `${factionName(a.faction)} ` : ""}${a.cardKind === "GEAR" ? "Gear" : "unit"} to your hand`, `ได้${a.cardKind === "GEAR" ? " Gear" : "ยูนิต"}${a.faction ? ` ${factionName(a.faction)}` : ""}แบบสุ่มเข้ามือ`)
      : a.do === "SUMMON_FROM_HAND" ? tr(`summon ${a.count > 1 ? `${a.count} units` : "a unit"} from your hand`, `เรียกยูนิตจากมือ${a.count > 1 ? ` ${a.count} ตัว` : ""}`)
      : a.do === "BUFF_SHOP" ? tr(`units in your tavern get ${sign(a.atk)}/${sign(a.hp)} for the rest of the game`, `ยูนิตในร้านได้ ${sign(a.atk)}/${sign(a.hp)} จนจบเกม`)
      : a.do === "DEVOUR_SHOP" ? tr(`devour ${a.choose === "STRONGEST" ? "the strongest" : a.choose === "WEAKEST" ? "the weakest" : "a random"} tavern unit${a.maxRank ? ` (rank ${a.maxRank} or lower)` : ""}; ${who} gains its stats`, `กลืนกินยูนิตในร้าน${a.choose === "STRONGEST" ? "ที่ค่าพลังมากสุด" : a.choose === "WEAKEST" ? "ที่ค่าพลังน้อยสุด" : "แบบสุ่ม"}${a.maxRank ? ` (rank ไม่เกิน ${a.maxRank})` : ""} ${who}ได้ค่าพลังของมัน`)
      : a.do === "DISCARD" ? tr(`discard ${a.count} ${a.pick === "RANDOM" ? "random" : a.pick.toLowerCase()} ${a.discardKind === "ANY" ? "card" : a.discardKind === "GEAR" ? "Gear" : "unit"}${a.count > 1 ? "s" : ""} from your hand`, `ทิ้ง${a.discardKind === "ANY" ? "การ์ด" : a.discardKind === "GEAR" ? " Gear" : "ยูนิต"}${a.pick === "RANDOM" ? "แบบสุ่ม" : a.pick === "LEFTMOST" ? "ซ้ายสุด" : "ขวาสุด"}ในมือ ${a.count} ใบ`)
      : a.do === "ULTIMATE_FORM" ? tr(`turn ${who} into its Ultimate Form`, `เปลี่ยน${who}เป็นร่าง Ultimate`)
      : a.do === "DISCOVER_UNIT" ? tr(`discover a ${a.faction ? `${factionName(a.faction)} ` : ""}unit`, `เลือกรับยูนิต${a.faction ? ` ${factionName(a.faction)}` : ""} 1 จาก 3`)
      : a.do;
    const limit = a.limitTimes > 0 ? tr(` (at most ${a.limitTimes} per ${a.limitPer === "TURN" ? "turn" : "game"})`, ` (ไม่เกิน ${a.limitTimes} ครั้งต่อ${a.limitPer === "TURN" ? "เทิร์น" : "เกม"})`) : "";
    return `${when}: ${cond}${what}${a.repeat > 1 ? tr(` (${a.repeat} times)`, ` (${a.repeat} ครั้ง)`) : ""}${limit}`;
  });
}

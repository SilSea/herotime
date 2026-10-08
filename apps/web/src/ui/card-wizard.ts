import { buildCard, cardsFilterFits, checkRecipe, choicesFor, DO, describeRecipe, factionFilterFits, keyFromName, newAbility, newRecipe, type Ability, type CardType, type Recipe } from "../card-recipe.js";
import { ContentIndex } from "../content-index.js";
import { byName, KEYWORDS, keywordName, keywordText, SENTAI_COLORS } from "../format.js";
import { tr } from "../i18n.js";
import type { CardDef } from "../protocol.js";
import { cardEl } from "./card.js";
import { h } from "./dom.js";

/** What the wizard needs from the editor around it. */
export interface WizardDeps {
  /** The draft as the game would see it (names, factions, series, cards to summon). */
  ix: ContentIndex;
  /** Keys already used by cards in the draft. */
  takenKeys: ReadonlySet<string>;
  upload: (file: File) => Promise<string>;
  /** Put the card in the draft; `save` also saves the draft (the server then writes its rules text). */
  create: (card: Record<string, unknown>, save: boolean) => void;
  /** Draw the whole editor again (after a choice that changes which fields are shown). */
  rerender: () => void;
}

let wz: Recipe = newRecipe();
let previewHost: HTMLElement | undefined;
let deps: WizardDeps | undefined;

/** Start over with an empty card. */
export function resetWizard(): void {
  wz = newRecipe();
}

/** Quick starts: a typical card of each kind, to edit from. */
type Template = Omit<Partial<Recipe>, "abilities"> & { abilities: Partial<Ability>[] };
const TEMPLATES: { label: () => string; make: () => Template }[] = [
  { label: () => tr("Dies → summons", "ตาย → เรียกพวก"), make: () => ({ type: "UNIT", abilities: [{ when: "LAST_STAND", do: "SUMMON", count: 1 }] }) },
  { label: () => tr("Attacks → summons", "โจมตี → เรียกพวก"), make: () => ({ type: "UNIT", abilities: [{ when: "ON_ATTACK", do: "SUMMON", count: 1 }] }) },
  { label: () => tr("Buffs every summoned unit", "บัฟทุกตัวที่ถูกเรียก"), make: () => ({ type: "UNIT", abilities: [{ when: "ALLY_SUMMONED", do: "BUFF", atk: 1, hp: 1, target: "SUMMONED" }] }) },
  { label: () => tr("Played → buff an ally", "ลงจากมือ → บัฟพวก"), make: () => ({ type: "UNIT", abilities: [{ when: "ON_PLAY", do: "BUFF", atk: 2, hp: 2, target: "LEFTMOST_FRIENDLY" }] }) },
  { label: () => tr("Start of combat → buff all", "เริ่มสู้ → บัฟทุกตัว"), make: () => ({ type: "UNIT", abilities: [{ when: "START_OF_COMBAT", do: "BUFF", atk: 1, hp: 1, target: "ALL_FRIENDLY" }] }) },
  { label: () => tr("Gear: buff a chosen unit", "Gear: บัฟตัวที่เลือก"), make: () => ({ type: "GEAR", rank: 1, cost: 2, abilities: [{ do: "BUFF", atk: 2, hp: 2, target: "CHOSEN_FRIENDLY" }] }) },
  { label: () => tr("Summoned token", "Token ที่ถูกเรียก"), make: () => ({ type: "TOKEN", atk: 1, hp: 1, abilities: [] }) },
];

function applyTemplate(t: (typeof TEMPLATES)[number]): void {
  const m = t.make();
  const type = (m.type ?? "UNIT") as CardType;
  wz = { ...wz, ...m, type, abilities: m.abilities.map((a) => ({ ...newAbility(type), ...a })) } as Recipe;
}

// ------------------------------------------------------------------ small inputs

const field = (label: string, ...control: (Node | string | false | null | undefined)[]): HTMLElement => h("label", { class: "wz-field" }, h("span", { class: "wz-label", text: label }), ...control);

function num(value: number, set: (n: number) => void, min = 0, max = 99): HTMLInputElement {
  const el = h("input", { type: "number", value: String(value), attrs: { min: String(min), max: String(max) } }) as HTMLInputElement;
  const clamp = (): number => Math.max(min, Math.min(max, Math.trunc(el.valueAsNumber) || 0));
  el.addEventListener("input", () => {
    set(clamp());
    refreshPreview();
  });
  // Typing can leave the box out of range or empty: show the value actually used once the field is left.
  el.addEventListener("change", () => {
    el.value = String(clamp());
  });
  return el;
}

/** A dropdown. `structural` choices change which fields are shown, so they redraw the whole wizard. */
function pick(value: string, options: { value: string; label: string }[], set: (v: string) => void, structural = false): HTMLSelectElement {
  const el = h("select", null, ...options.map((o) => h("option", { value: o.value, text: o.label, selected: o.value === value }))) as HTMLSelectElement;
  el.addEventListener("change", () => {
    set(el.value);
    if (structural) deps?.rerender();
    else refreshPreview();
  });
  return el;
}

function check(label: string, on: boolean, set: (v: boolean) => void, title = "", style = ""): HTMLElement {
  const box = h("input", { type: "checkbox", checked: on }) as HTMLInputElement;
  box.addEventListener("change", () => {
    set(box.checked);
    refreshPreview();
  });
  return h("label", { class: "wz-check", title, style }, box, label);
}

const toggle = (list: string[], v: string, on: boolean): string[] => (on ? [...new Set([...list, v])] : list.filter((x) => x !== v));

let pickerId = 0;
/**
 * A card picker you can type in: matches names and keys as you type (a datalist), shows the picked card's
 * name, and only accepts real cards.
 */
function cardPick(value: string, cards: readonly CardDef[], set: (key: string) => void): HTMLElement {
  const id = `wz-cards-${pickerId++}`;
  const name = (k: string): string => cards.find((c) => c.key === k)?.name ?? "";
  const list = h("datalist", { id }, ...cards.map((c) => h("option", { value: c.key, text: `${c.name} · ${c.kind === "GEAR" ? "Gear" : `${c.atk}/${c.hp}`}${c.token ? " · token" : ""} · rank ${c.rank}` })));
  const input = h("input", { type: "search", value, placeholder: tr("type to search a card…", "พิมพ์ค้นหาการ์ด…"), attrs: { list: id } }) as HTMLInputElement;
  const shown = h("span", { class: "muted small wz-picked", text: name(value) });
  input.addEventListener("input", () => {
    const typed = input.value.trim();
    // Accept a key, or a name typed in full.
    const hit = cards.find((c) => c.key === typed) ?? cards.find((c) => c.name.toLowerCase() === typed.toLowerCase());
    input.classList.toggle("bad", typed !== "" && !hit);
    if (hit || typed === "") {
      set(hit?.key ?? "");
      shown.textContent = hit ? hit.name : "";
      refreshPreview();
    }
  });
  return h("span", { class: "wz-picker" }, input, list, shown);
}

/** Several cards: the picked ones (each with a remove button) and a picker that adds one more. */
function cardsPick(values: readonly string[], cards: readonly CardDef[], set: (keys: string[]) => void): HTMLElement {
  const name = (k: string): string => cards.find((c) => c.key === k)?.name ?? k;
  const chosen = values.map((k) =>
    h("span", { class: "wz-chosen" }, name(k), h("button", { class: "mini", type: "button", text: "✕", title: tr("Remove", "เอาออก"), on: { click: () => (set(values.filter((x) => x !== k)), deps?.rerender()) } })),
  );
  const add = cardPick("", cards, (k) => {
    if (k && !values.includes(k)) {
      set([...values, k]);
      deps?.rerender();
    }
  });
  return h("span", { class: "wz-cards" }, ...chosen, add);
}

// ------------------------------------------------------------------ the screen

export function wizardPanel(d: WizardDeps): HTMLElement {
  deps = d;
  const ix = d.ix;
  const factions = [...ix.factions.values()];
  const cards = [...ix.cards.values()].filter((c) => c.key !== wz.key).sort(byName);
  const units = cards.filter((c) => c.kind === "UNIT");
  const cardOptions = (list: CardDef[]) => [{ value: "", label: tr("— pick a card —", "— เลือกการ์ด —") }, ...list.map((c) => ({ value: c.key, label: `${c.name}${c.token ? " (token)" : ""} · ${c.atk}/${c.hp}` }))];
  const factionOptions = (none: string) => [{ value: "", label: none }, ...factions.map((f) => ({ value: f.key, label: f.name }))];
  const isGear = wz.type === "GEAR";

  // 1. what kind of card
  const typeRow = h(
    "div",
    { class: "wz-types" },
    ...(
      [
        ["UNIT", tr("Unit (sold in the tavern)", "ยูนิต (ขายในร้าน)")],
        ["TOKEN", tr("Token (only summoned)", "Token (ถูกเรียกเท่านั้น)")],
        ["GEAR", tr("Gear (used from hand)", "Gear (ใช้จากมือ)")],
        ["GIANT", tr("Giant Robo", "Giant Robo")],
      ] as [CardType, string][]
    ).map(([t, label]) =>
      h("button", {
        class: `chip wz-type ${wz.type === t ? "active" : ""}`,
        text: label,
        on: {
          click: () => {
            wz.type = t;
            wz.abilities = wz.abilities.map((a) => (t === "GEAR" ? { ...a, when: "ON_PLAY", target: DO.find((x) => x.key === a.do)?.targeted ? "CHOSEN_FRIENDLY" : a.target } : a));
            if (t === "GIANT") wz.rank = 6;
            d.rerender();
          },
        },
      }),
    ),
  );

  const typeHint = {
    UNIT: tr("Sold in the tavern at its rank; three copies make a Golden one.", "ขายในร้านตาม Rank ครบ 3 ใบรวมเป็นร่างทอง (Golden)"),
    TOKEN: tr("Never in the tavern: only other cards summon it, add it to a hand or turn into it.", "ไม่ขายในร้าน ได้มาจากการ์ดอื่นเท่านั้น (เรียก, เข้ามือ, แปลงร่าง)"),
    GEAR: tr("Bought from the Gear slot and used from the hand; its abilities happen when used.", "ซื้อจากช่อง Gear แล้วใช้จากมือ ความสามารถทำงานตอนใช้"),
    GIANT: tr("A Giant Robo for the Giant Slot (Mecha Gauge reward), never in the tavern.", "หุ่นยักษ์สำหรับช่อง Giant (รางวัลจาก Mecha Gauge) ไม่ขายในร้าน"),
  }[wz.type];

  // 2. name, stats, tribe
  const keyInput = h("input", { type: "text", value: wz.key, attrs: { maxlength: "40" } }) as HTMLInputElement;
  keyInput.addEventListener("input", () => {
    wz.key = keyInput.value.trim();
    wz.keyEdited = true;
    refreshPreview();
  });
  const nameInput = h("input", { type: "text", value: wz.name, placeholder: tr("e.g. Pack Wolf", "เช่น Pack Wolf"), attrs: { maxlength: "40" } }) as HTMLInputElement;
  nameInput.addEventListener("input", () => {
    wz.name = nameInput.value;
    if (!wz.keyEdited) {
      wz.key = keyFromName(wz.name, d.takenKeys);
      keyInput.value = wz.key;
    }
    refreshPreview();
  });
  const artInput = h("input", { type: "file", attrs: { accept: "image/*" } }) as HTMLInputElement;
  artInput.addEventListener("change", () => {
    const file = artInput.files?.[0];
    if (file) void d.upload(file).then((name) => ((wz.art = name), refreshPreview()));
  });
  const basics = h(
    "div",
    { class: "wz-grid" },
    field(tr("Name", "ชื่อ"), nameInput),
    field(tr("Key (id, cannot change later)", "Key (รหัสถาวร เปลี่ยนทีหลังไม่ได้)"), keyInput),
    field("Rank", num(wz.rank, (n) => (wz.rank = n), 1, 6)),
    !isGear && field("ATK", num(wz.atk, (n) => (wz.atk = n), 0, 99)),
    !isGear && field("HP", num(wz.hp, (n) => (wz.hp = n), 1, 99)),
    isGear && field(tr("Price", "ราคา"), num(wz.cost, (n) => (wz.cost = n), 0, 20)),
    isGear && field(tr("Paid with", "จ่ายด้วย"), pick(wz.costType, [{ value: "ENERGY", label: "Energy" }, { value: "HEALTH", label: tr("Health", "เลือด") }], (v) => (wz.costType = v as Recipe["costType"]))),
    field(tr("Series", "ซีรีส์"), pick(wz.series, [{ value: "", label: tr("none", "ไม่มี") }, ...ix.snapshot.series.map((s) => ({ value: s.key, label: s.name }))], (v) => (wz.series = v))),
    field(tr("Picture", "รูป"), artInput, wz.art && h("span", { class: "muted small", text: wz.art })),
  );
  const tribe = h(
    "div",
    null,
    h("div", { class: "wz-label", text: tr("Faction (none = neutral, in every match)", "เผ่า (ไม่เลือก = ไม่มีเผ่า มีทุกเกม)") }),
    h("div", { class: "wz-chips" }, ...factions.map((f) => check(f.name, wz.factions.includes(f.key), (on) => (wz.factions = toggle(wz.factions, f.key, on)), ix.factionText(f.key), `--c:${f.color}`))),
    !isGear && h("div", { class: "wz-label", text: tr("Sentai colours (for Team-Up and Roll Call)", "สี Sentai (ใช้กับ Team-Up และ Roll Call)") }),
    !isGear && h("div", { class: "wz-chips" }, ...Object.keys(SENTAI_COLORS).map((c) => check(c, wz.colors.includes(c), (on) => (wz.colors = toggle(wz.colors, c, on)), "", `--c:${SENTAI_COLORS[c]}`))),
    !isGear && h("div", { class: "wz-label", text: "Keywords" }),
    !isGear && h("div", { class: "wz-chips" }, ...Object.keys(KEYWORDS).map((k) => check(keywordName(k), wz.keywords.includes(k), (on) => (wz.keywords = toggle(wz.keywords, k, on)), keywordText(k)))),
  );

  // 3. abilities
  summaries = [];
  const abilities = h(
    "div",
    { class: "wz-abilities" },
    ...wz.abilities.map((a, i) => abilityBox(a, i, { units, cards, cardOptions, factionOptions })),
    h("button", { class: "btn", text: tr("+ Add an ability", "+ เพิ่มความสามารถ"), on: { click: () => ((wz.abilities = [...wz.abilities, newAbility(wz.type)]), d.rerender()) } }),
  );

  // 4. transformations (units)
  const special = !isGear && h(
    "div",
    { class: "wz-grid" },
    field(tr("Henshin after N turns (0 = never)", "Henshin หลัง N เทิร์น (0 = ไม่แปลง)"), num(wz.henshinTurns, (n) => (wz.henshinTurns = n), 0, 9)),
    field(tr("…into", "…แปลงเป็น"), cardPick(wz.henshinInto, units, (v) => (wz.henshinInto = v))),
    field(tr("Gattai core: the group becomes (empty = not a core)", "Gattai core: กลุ่มรวมเป็น (ว่าง = ไม่ใช่ core)"), cardPick(wz.gattaiInto, units, (v) => (wz.gattaiInto = v))),
    field(tr("Final Form (what a Final Form card turns it into)", "ร่าง Final Form (ที่การ์ด Final Form เปลี่ยนให้)"), cardPick(wz.ultimateInto, units, (v) => (wz.ultimateInto = v))),
  );

  previewHost = h("div", { class: "wz-preview" });
  refreshPreview();

  const step = (n: number, title: string, ...body: (Node | false | null | undefined)[]): HTMLElement => h("section", { class: "panel wz-step" }, h("h3", null, h("span", { class: "wz-num", text: String(n) }), title), ...body);
  return h(
    "div",
    { class: "wz" },
    h(
      "div",
      { class: "wz-form" },
      h("div", { class: "panel" }, h("h3", { text: tr("Card wizard", "ตัวช่วยสร้างการ์ด") }), h("p", { class: "muted", text: tr("Build a card step by step. Only choices that work together are offered; the preview on the right updates as you go. Start from a template if you like.", "สร้างการ์ดทีละขั้น ระบบให้เลือกเฉพาะตัวเลือกที่ใช้ด้วยกันได้ ดูตัวอย่างทางขวาได้ทันที จะเริ่มจากแบบสำเร็จรูปก็ได้") }),
        h("div", { class: "wz-chips" }, ...TEMPLATES.map((t) => h("button", { class: "chip", text: t.label(), on: { click: () => (applyTemplate(t), d.rerender()) } })), h("button", { class: "chip", text: tr("Start over", "เริ่มใหม่"), on: { click: () => (resetWizard(), d.rerender()) } }))),
      step(1, tr("What kind of card", "การ์ดประเภทไหน"), typeRow, h("p", { class: "muted wz-hint", text: typeHint })),
      step(2, tr("Name, stats and faction", "ชื่อ ค่าพลัง และเผ่า"), basics, tribe),
      step(3, tr("Abilities", "ความสามารถ"), abilities),
      special && step(4, tr("Transformations", "การแปลงร่าง"), special),
    ),
    previewHost,
  );
}

/** The one-line summary in each ability box, kept up to date by refreshPreview. */
let summaries: HTMLElement[] = [];

type Bit = Node | false | null | undefined | "";
const nodes = (bits: Bit[]): Node[] => bits.filter((b): b is Node => b instanceof Node);

/** One step of the ability's sentence: a label on the left, its fields on the right (nothing when empty). */
const part = (label: string, ...fields: Bit[]): HTMLElement | false =>
  nodes(fields).length > 0 && h("div", { class: "wz-part" }, h("span", { class: "wz-part-label", text: label }), h("div", { class: "wz-grid" }, ...nodes(fields)));

function abilityBox(
  a: Ability,
  i: number,
  o: { units: CardDef[]; cards: CardDef[]; cardOptions: (l: CardDef[]) => { value: string; label: string }[]; factionOptions: (none: string) => { value: string; label: string }[] },
): HTMLElement {
  const c = choicesFor(a, wz.type);
  const d = DO.find((x) => x.key === a.do);
  // keep the picks valid when an earlier choice took an option away
  if (!c.do.some((x) => x.key === a.do) && c.do[0]) a.do = c.do[0].key;
  if (d?.targeted && !c.target.some((x) => x.key === a.target) && c.target[0]) a.target = c.target[0].key;
  const dd = DO.find((x) => x.key === a.do);
  const gear = wz.type === "GEAR";
  const move = (to: number): void => {
    const list = [...wz.abilities];
    const [it] = list.splice(i, 1);
    if (it) list.splice(to, 0, it);
    wz.abilities = list;
    deps?.rerender();
  };
  const tool = (text: string, title: string, click: () => void, disabled = false, cls = "mini"): HTMLElement => h("button", { class: cls, type: "button", text, title, disabled, on: { click } });
  const tools = h(
    "span",
    { class: "wz-tools" },
    tool("↑", tr("Move up", "เลื่อนขึ้น"), () => move(i - 1), i === 0),
    tool("↓", tr("Move down", "เลื่อนลง"), () => move(i + 1), i === wz.abilities.length - 1),
    tool("⧉", tr("Duplicate", "ทำซ้ำ"), () => {
      const copy: Ability = { ...a, conditionCards: [...a.conditionCards], targetCards: [...a.targetCards] };
      wz.abilities = [...wz.abilities.slice(0, i + 1), copy, ...wz.abilities.slice(i + 1)];
      deps?.rerender();
    }),
    tool("✕", tr("Remove this ability", "ลบความสามารถนี้"), () => ((wz.abilities = wz.abilities.filter((_, j) => j !== i)), deps?.rerender()), false, "mini danger"),
  );
  const summary = h("div", { class: "wz-sum" });
  summaries[i] = summary;
  const fightOnly = ["START_OF_COMBAT", "ON_ATTACK", "AFTER_DAMAGED", "LAST_STAND", "AVENGE", "ALLY_SUMMONED"].includes(a.when);
  const options = nodes([
    a.do === "BUFF" && !gear && check(tr("+ this card's own ATK/HP", "+ ATK/HP ของการ์ดใบนี้"), a.fromSelf, (v) => (a.fromSelf = v), tr("The targets also get this card's current ATK/HP", "เป้าหมายได้ ATK/HP เท่ากับการ์ดใบนี้ตอนนั้นเพิ่มด้วย")),
    (a.do === "BUFF" || a.do === "CONSUME_ALLIES") && !gear && fightOnly && check(tr("keep after the fight (permanent)", "ติดตัวถาวรหลังจบการต่อสู้"), a.permanent, (v) => (a.permanent = v)),
    a.do === "COPY" && check(tr("keep its bonuses, keywords and Golden", "เอาบัฟ keyword และร่างทองไปด้วย"), a.copyBuffs, (v) => (a.copyBuffs = v), tr("Off: a fresh base card. Copies count for triples.", "ไม่ติ๊ก = การ์ดพื้นฐาน · สำเนานับรวม triple")),
  ]);
  const stats = a.do === "BUFF" || a.do === "BUFF_SHOP" || a.do === "BUFF_GEAR";

  return h(
    "div",
    { class: "wz-ability" },
    h("div", { class: "wz-ability-head" }, h("strong", { text: tr(`Ability ${i + 1}`, `ความสามารถ ${i + 1}`) }), summary, tools),
    part(
      tr("When", "เมื่อไหร่"),
      !gear && field(tr("Moment", "จังหวะ"), pick(a.when, c.when.map((w) => ({ value: w.key, label: w.label() })), (v) => (a.when = v), true)),
      !gear && a.when === "AVENGE" && field(tr("Every N deaths", "ทุกๆ กี่ตัวที่ตาย"), num(a.every, (n) => (a.every = n), 1, 9)),
      field(
        tr("Only if", "เงื่อนไข"),
        pick(a.condition, [
          { value: "", label: tr("always", "ทุกครั้ง") },
          { value: "TEAM_UP_COLORS_GTE", label: tr("Sentai colours at least", "มีสี Sentai อย่างน้อย") },
          { value: "FACTION_COUNT_GTE", label: tr("units of a faction at least", "มียูนิตเผ่าหนึ่งอย่างน้อย") },
          { value: "ENERGY_GTE", label: tr("Energy at least", "มี Energy อย่างน้อย") },
          { value: "HAS_CARD", label: tr("one of these cards is on the board", "มีการ์ดใบนี้อยู่บนบอร์ด (ใบใดใบหนึ่ง)") },
        ], (v) => (a.condition = v), true),
      ),
      a.condition === "FACTION_COUNT_GTE" && field(tr("…of faction", "…เผ่า"), pick(a.conditionFaction, o.factionOptions(tr("— pick —", "— เลือก —")), (v) => (a.conditionFaction = v))),
      a.condition && a.condition !== "HAS_CARD" && field(tr("…how many", "…จำนวน"), num(a.conditionValue, (n) => (a.conditionValue = n), a.condition === "ENERGY_GTE" ? 0 : 1, 10)),
      a.condition === "HAS_CARD" && field(tr("…cards (any one; later forms count)", "…การ์ด (ใบใดใบหนึ่ง นับร่างที่แปลงแล้วด้วย)"), cardsPick(a.conditionCards, o.units, (v) => (a.conditionCards = v))),
    ),
    part(
      tr("Do", "ทำอะไร"),
      field(tr("Action", "การกระทำ"), pick(a.do, c.do.map((x) => ({ value: x.key, label: x.label() })), (v) => (a.do = v), true)),
      stats && field("+ATK", num(a.atk, (n) => (a.atk = n), -20, 50)),
      stats && field("+HP", num(a.hp, (n) => (a.hp = n), -20, 50)),
      a.do === "GIVE_KEYWORD" && field("Keyword", pick(a.keyword, Object.keys(KEYWORDS).map((k) => ({ value: k, label: keywordName(k) })), (v) => (a.keyword = v))),
      a.do === "SUMMON" && field(tr("Card", "การ์ด"), cardPick(a.cardKey, o.units, (v) => (a.cardKey = v))),
      a.do === "TRANSFORM" && field(tr("…into", "…แปลงเป็น"), cardPick(a.cardKey, o.units, (v) => (a.cardKey = v))),
      a.do === "ADD_TO_HAND" && field(tr("Card (a Gear or a unit)", "การ์ด (Gear หรือยูนิต)"), cardPick(a.cardKey, o.cards, (v) => (a.cardKey = v))),
      (a.do === "SUMMON" || a.do === "SUMMON_FROM_HAND") && field(tr("How many", "กี่ตัว"), num(a.count, (n) => (a.count = n), 1, 7)),
      a.do === "COPY" && field(tr("Copy to", "ก๊อปปี้ไปที่"), pick(a.copyTo, [{ value: "BOARD", label: tr("the board (right of it)", "บอร์ด (ข้างตัวต้นฉบับ)") }, { value: "HAND", label: tr("your hand", "มือ") }], (v) => (a.copyTo = v as Ability["copyTo"]))),
      a.do === "RANDOM_CARD" && field(tr("Random", "สุ่ม"), pick(a.cardKind, [{ value: "GEAR", label: "Gear" }, { value: "UNIT", label: tr("Unit", "ยูนิต") }], (v) => (a.cardKind = v as Ability["cardKind"]))),
      (a.do === "DISCOVER_UNIT" || a.do === "RANDOM_CARD") && field(tr("Faction", "เผ่า"), pick(a.faction, o.factionOptions(tr("any", "ทุกเผ่า")), (v) => (a.faction = v))),
      (a.do === "DAMAGE" || a.do === "GAIN_ENERGY") && field(tr("Amount", "จำนวน"), num(a.amount, (n) => (a.amount = n), 1, 20)),
      a.do === "DISCARD" && field(tr("How many", "กี่ใบ"), num(a.count, (n) => (a.count = n), 1, 10)),
      a.do === "DISCARD" && field(tr("Which", "ใบไหน"), pick(a.pick, [{ value: "RANDOM", label: tr("random", "สุ่ม") }, { value: "LEFTMOST", label: tr("leftmost", "ซ้ายสุด") }, { value: "RIGHTMOST", label: tr("rightmost", "ขวาสุด") }], (v) => (a.pick = v as Ability["pick"]))),
      a.do === "DISCARD" && field(tr("Kind", "ประเภท"), pick(a.discardKind, [{ value: "ANY", label: tr("any card", "การ์ดอะไรก็ได้") }, { value: "UNIT", label: tr("units only", "เฉพาะยูนิต") }, { value: "GEAR", label: tr("Gear only", "เฉพาะ Gear") }], (v) => (a.discardKind = v as Ability["discardKind"]))),
      a.do === "DEVOUR_SHOP" && field(tr("Eat which", "กินตัวไหน"), pick(a.choose, [{ value: "RANDOM", label: tr("random", "สุ่ม") }, { value: "STRONGEST", label: tr("strongest (most ATK+HP)", "ค่าพลังมากสุด (ATK+HP)") }, { value: "WEAKEST", label: tr("weakest (least ATK+HP)", "ค่าพลังน้อยสุด (ATK+HP)") }], (v) => (a.choose = v as Ability["choose"]))),
      a.do === "DEVOUR_SHOP" && field(tr("Only faction", "เฉพาะเผ่า"), pick(a.faction, o.factionOptions(tr("any", "ทุกเผ่า")), (v) => (a.faction = v))),
    ),
    options.length > 0 && h("div", { class: "wz-chips wz-opts" }, ...options),
    dd?.targeted &&
      part(
        tr("Who", "กับใคร"),
        field(tr("Target", "เป้าหมาย"), pick(a.target, c.target.map((t) => ({ value: t.key, label: t.label() })), (v) => (a.target = v), true)),
        factionFilterFits(a.target) && field(tr("…only faction", "…เฉพาะเผ่า"), pick(a.targetFaction, o.factionOptions(tr("any", "ทุกเผ่า")), (v) => (a.targetFaction = v))),
        cardsFilterFits(a.target) && field(tr("…only these cards (any one; later forms count)", "…เฉพาะการ์ดเหล่านี้ (ใบใดใบหนึ่ง นับร่างที่แปลงแล้วด้วย)"), cardsPick(a.targetCards, o.units, (v) => (a.targetCards = v))),
      ),
    part(
      tr("How often", "กี่ครั้ง"),
      field(tr("Happens N times", "ทำงานกี่ครั้ง"), num(a.repeat, (n) => (a.repeat = n), 1, 5)),
      field(tr("At most", "จำกัดไม่เกิน"), pick(String(a.limitTimes), [0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n === 0 ? tr("no limit", "ไม่จำกัด") : tr(`${n} times`, `${n} ครั้ง`) })), (v) => (a.limitTimes = Number(v)), true)),
      a.limitTimes > 0 && field(tr("…per", "…ต่อ"), pick(a.limitPer, [{ value: "TURN", label: tr("turn", "เทิร์น") }, { value: "GAME", label: tr("game", "เกม") }], (v) => (a.limitPer = v as Ability["limitPer"]))),
    ),
  );
}

/** Redraw just the preview (typing in a field must not rebuild the form under the cursor). */
function refreshPreview(): void {
  if (!previewHost || !deps) return;
  const d = deps;
  const ix = d.ix;
  const card = buildCard(wz);
  const lines = describeRecipe(wz, ix.cardName, ix.factionName);
  lines.forEach((l, i) => summaries[i]?.replaceChildren(l));
  const problems = checkRecipe(wz, d.takenKeys);
  const previewCard = { ...card, key: card.key || "__wizard__", name: wz.name || tr("New card", "การ์ดใหม่"), text: lines.join(" · "), textTh: lines.join(" · ") } as unknown as CardDef;
  const pix = new ContentIndex({ ...ix.snapshot, cards: [...ix.snapshot.cards.filter((c) => c.key !== previewCard.key), previewCard] });
  previewHost.replaceChildren(
    h("h3", { text: tr("Preview", "ตัวอย่าง") }),
    cardEl(pix, { key: previewCard.key, ...(wz.type === "GEAR" ? { cost: wz.cost, costHealth: wz.costType === "HEALTH" } : {}) }),
    h("div", { class: "wz-lines" }, ...(lines.length > 0 ? lines.map((l) => h("p", { text: l })) : [h("p", { class: "muted", text: tr("No abilities: a plain body.", "ไม่มีความสามารถ: ตัวเปล่า") })])),
    problems.length > 0
      ? h("div", { class: "admin-issues" }, h("strong", { text: tr("Before adding:", "ก่อนเพิ่มต้องแก้:") }), h("ul", null, ...problems.map((p) => h("li", { text: p }))))
      : h("p", { class: "wz-ok", text: tr("✔ Ready to add", "✔ พร้อมเพิ่มแล้ว") }),
    h(
      "div",
      { class: "row" },
      h("button", { class: "btn primary", text: tr("Add and save the draft", "เพิ่มและบันทึก draft"), disabled: problems.length > 0, on: { click: () => created(true) } }),
      h("button", { class: "btn", text: tr("Add to the draft", "เพิ่มเข้า draft"), disabled: problems.length > 0, on: { click: () => created(false) } }),
    ),
    h("p", { class: "muted small", text: tr("After saving, the card's rules text is written automatically in English and Thai. Publish to put it in new matches.", "บันทึกแล้วระบบเขียนคำอธิบายการ์ดให้ทั้งไทยและอังกฤษ กด Publish เพื่อให้เกมใหม่ใช้การ์ดนี้") }),
  );
}

function created(save: boolean): void {
  if (!deps) return;
  const card = buildCard(wz);
  resetWizard();
  deps.create(card, save);
}

import {
  adjacent,
  avenge,
  buff,
  destroy,
  discoverGiant,
  endOfTurn,
  energy,
  energyAtLeast,
  faction,
  gauge,
  gaugeDef,
  gear,
  give,
  giant,
  deploy,
  hero,
  lastStand,
  leftmost,
  onAttack,
  player,
  randomAlly,
  relic,
  rightmost,
  rule,
  shopGear,
  self,
  series,
  seriesCount,
  startOfCombat,
  summon,
  teamUp,
  toHand,
  token,
  unit,
  allAllies,
  chosen,
  discoverUnit,
  superGattai,
  damage,
  randomFoe,
  onSummon,
  summoned,
  ultimateForm,
  giantSlot,
  randomCard,
  onSell,
  buffShop,
  devourShop,
  discard,
  onDiscard,
  summonFromHand,
} from "./dsl.js";
import type { ContentSetData } from "./types.js";

/**
 * PROTOTYPE set (the test bed): the former launch line-up, plus one sample card for each newer mechanic. Eight factions (Shonen is the first of the Anime universe), eight series (Gokaiger, Kyoryuger, Shinkenger,
 * W, Den-O, OOO and the original Himmapan Sentai). Series signatures are approximated with the
 * effect DSL that exists today; the ones that need new engine actions (Den-O possession, W pairing,
 * OOO medals) are noted where they are approximated.
 *
 * Real franchise names are used as placeholders for the fan build: swap names/art in this file (or in
 * the database later) before any public release.
 */

const factions = [
  faction("rider", "Rider", "#e53935", "Henshin: transform after turns on the board. Rider Kick hits twice as hard on the first strike.", "Henshin: แปลงร่างเมื่ออยู่บนบอร์ดครบเทิร์น · Rider Kick ตีครั้งแรกแรง ×2"),
  faction("sentai", "Sentai", "#1e88e5", "Five colours. Team-Up bonuses and the Roll Call that charges the Mecha Gauge.", "ทีม 5 สี: โบนัส Team-Up และ Roll Call ที่เติม Mecha Gauge"),
  faction("mecha", "Mecha", "#78909c", "Gattai: line up a core and its parts, press Combine, and they become one robot for good.", "Gattai: วาง core กับชิ้นส่วนเรียงกัน กด Combine แล้วรวมเป็นหุ่นตัวเดียวถาวร"),
  faction("kaijin", "Kaijin", "#8e24aa", "Kyodaika: the first time it dies it comes back twice as big.", "Kyodaika: ตายครั้งแรกฟื้นเป็นร่างยักษ์ stat ×2"),
  faction("beast", "Beast", "#8d6e63", "Summons: calls the pack when it attacks and when it falls, and pack leaders power up every newcomer.", "เรียกพวก: เรียกยูนิตเข้าสนามตอนโจมตีและตอนตาย และจ่าฝูงบัฟทุกตัวที่ถูกเรียกเข้ามาใหม่"),
  faction("ally", "Ally", "#43a047", "Economy and support: Energy, buffs and cards in hand.", "เศรษฐกิจและสนับสนุน: Energy, บัฟ, การ์ดเข้ามือ"),
  faction("dark_rider", "Dark Rider", "#37474f", "Sacrifice allies to grow monstrous.", "สังเวยพวกเดียวกันเพื่อแข็งแกร่งขึ้น"),
  // The first faction of the Anime universe (original characters).
  faction("shonen", "Shonen", "#ff7043", "Power-Up: grow stronger with every attack, and take revenge when friends fall.", "Power-Up: แข็งแกร่งขึ้นทุกครั้งที่โจมตี และแก้แค้นเมื่อเพื่อนล้ม"),
];

// Bond: with 2 of a series on the board a small bonus, with 4 a bigger one.
const bond = (key: string, a: [number, number], b: [number, number]) => [
  { count: 2, effects: [player("START_OF_COMBAT", buff(a[0], a[1]), { target: allAllies({ series: key }) })] },
  { count: 4, effects: [player("START_OF_COMBAT", buff(b[0], b[1]), { target: allAllies({ series: key }) })] },
];

const allSeries = [
  series("gokaiger", "Kaizoku Sentai Gokaiger", { universe: "tokusatsu", franchise: "super-sentai", bonds: bond("gokaiger", [1, 0], [0, 2]) }),
  series("kyoryuger", "Zyuden Sentai Kyoryuger", { universe: "tokusatsu", franchise: "super-sentai", bonds: bond("kyoryuger", [1, 0], [2, 0]) }),
  series("shinkenger", "Samurai Sentai Shinkenger", { universe: "tokusatsu", franchise: "super-sentai", bonds: bond("shinkenger", [0, 1], [0, 3]) }),
  series("himmapan", "Himmapan Sentai", { universe: "tokusatsu", franchise: "original", bonds: bond("himmapan", [1, 1], [2, 2]) }),
  series("w", "Kamen Rider W", { universe: "tokusatsu", franchise: "kamen-rider", bonds: bond("w", [1, 1], [2, 2]) }),
  series("den_o", "Kamen Rider Den-O", { universe: "tokusatsu", franchise: "kamen-rider", bonds: bond("den_o", [1, 0], [2, 1]) }),
  series("ooo", "Kamen Rider OOO", { universe: "tokusatsu", franchise: "kamen-rider", bonds: bond("ooo", [1, 0], [2, 0]) }),
  series("star_blade", "Star Blade Academy", { universe: "anime", franchise: "anime-original", text: "An original shonen series: rivals, training arcs and a final awakening.", bonds: bond("star_blade", [1, 0], [2, 1]) }),
];

type Color = "RED" | "BLUE" | "YELLOW" | "GREEN" | "PINK" | "EXTRA";

/** A ranger: the standard Team-Up effect for its rank plus whatever its series adds. */
function ranger(key: string, name: string, rank: number, atk: number, hp: number, seriesKey: string, color: Color, extra: ReturnType<typeof deploy>[] = [], keywords: Parameters<typeof unit>[2]["keywords"] = []) {
  const teamUpEffect = [
    startOfCombat(buff(1, 1), { condition: teamUp(2) }),
    startOfCombat(buff(2, 1), { condition: teamUp(3) }),
    startOfCombat(buff(1, 0), { condition: teamUp(3), target: allAllies({ faction: "sentai" }) }),
    startOfCombat(buff(2, 2), { condition: teamUp(4) }),
    startOfCombat(buff(2, 2), { condition: teamUp(4), target: allAllies({ faction: "sentai" }) }),
    startOfCombat(buff(2, 2), { condition: teamUp(5), target: allAllies({ faction: "sentai" }) }),
  ][rank - 1];
  return unit(key, name, { rank, atk, hp, factions: ["sentai"], series: seriesKey, colors: [color], keywords, effects: [teamUpEffect!, ...extra] });
}

const cards = [
  // ---- tokens, forms, gear and giants (not in the shop)
  token("beast_cub", "Cub", { atk: 2, hp: 1, factions: ["beast"] }),
  token("rider_form", "Rider Form", { atk: 4, hp: 4, factions: ["rider"], keywords: ["RIDER_KICK"] }),
  token("super_form", "Super Form", { atk: 9, hp: 9, factions: ["rider"], keywords: ["RIDER_KICK", "RAPID"] }),
  gear("kyodai_gattai", "Kyodai Gattai!", [player("ON_PLAY", discoverGiant())]),
  // Final Form (Rider Gauge): the chosen Rider becomes its series' last form, and grows.
  gear("ultimate_form", "Final Form", [player("ON_PLAY", [ultimateForm(), buff(2, 2, true)], { target: chosen({ faction: "rider" }) })]),
  token("w_xtreme", "Kamen Rider W CycloneJokerXtreme", { rank: 6, atk: 10, hp: 10, factions: ["rider"], series: "w", keywords: ["RAPID", "BARRIER"] }),
  token("den_o_liner", "Kamen Rider Den-O Liner Form", { rank: 6, atk: 11, hp: 9, factions: ["rider"], series: "den_o", keywords: ["RIDER_KICK", "RAPID"] }),
  token("ooo_putotyra", "Kamen Rider OOO Putotyra Combo", { rank: 6, atk: 12, hp: 12, factions: ["rider"], series: "ooo", keywords: ["RIDER_KICK", "GUARD"] }),
  token("final_rider_ultimate", "Final Rider Ultimate", { rank: 6, atk: 16, hp: 16, factions: ["rider"], keywords: ["RIDER_KICK", "RAPID"] }),
  // Upgraded Giant Robos (Robo Upgrade gear)
  giant("kanzen_gokai_oh", "Kanzen Gokai Oh", { atk: 13, hp: 13, series: "gokaiger", factions: ["mecha"], keywords: ["FINAL_BLOW", "RAPID"] }),
  giant("gigant_kyoryuzin", "Gigant Kyoryuzin", { atk: 12, hp: 15, series: "kyoryuger", factions: ["mecha"], keywords: ["FINAL_BLOW", "GUARD"] }),
  giant("daikai_shinken_oh", "Daikai Shinken Oh", { atk: 11, hp: 16, series: "shinkenger", factions: ["mecha"], keywords: ["FINAL_BLOW", "BARRIER"] }),
  giant("himmapan_king", "Himmapan King", { atk: 15, hp: 11, series: "himmapan", factions: ["mecha"], keywords: ["FINAL_BLOW", "REVIVE"] }),
  giant("gokai_oh", "Gokai Oh", { atk: 9, hp: 9, series: "gokaiger", factions: ["mecha"], keywords: ["FINAL_BLOW"], ultimateInto: "kanzen_gokai_oh" }),
  giant("kyoryuzin", "Kyoryuzin", { atk: 8, hp: 11, series: "kyoryuger", factions: ["mecha"], keywords: ["FINAL_BLOW", "GUARD"], ultimateInto: "gigant_kyoryuzin" }),
  giant("shinken_oh", "Shinken Oh", { atk: 7, hp: 12, series: "shinkenger", factions: ["mecha"], keywords: ["FINAL_BLOW", "BARRIER"], ultimateInto: "daikai_shinken_oh" }),
  giant("garuda_oh", "Garuda Oh", { atk: 11, hp: 8, series: "himmapan", factions: ["mecha"], keywords: ["FINAL_BLOW", "REVIVE"], ultimateInto: "himmapan_king" }),

  // ---- neutral: no faction, always in the shop
  unit("n1", "Wandering Fighter", { rank: 1, atk: 2, hp: 2 }),
  unit("n2", "Street Guardian", { rank: 2, atk: 2, hp: 4, keywords: ["GUARD"] }),
  unit("n3", "Masked Merchant", { rank: 3, atk: 3, hp: 4, keywords: ["BARRIER"] }),
  unit("n4", "Hired Assassin", { rank: 4, atk: 3, hp: 4, keywords: ["LETHAL"] }),
  unit("n5", "Wild Champion", { rank: 5, atk: 8, hp: 8 }),
  unit("n6", "Legendary Hero", { rank: 6, atk: 10, hp: 12, keywords: ["GUARD", "BARRIER"] }),

  // ---- Sentai: Gokaiger (Gokai Change: lend a keyword to a teammate)
  ranger("gk1", "Gokai Blue", 1, 2, 2, "gokaiger", "BLUE", [deploy(buff(1, 0, true), { target: adjacent })]),
  ranger("gk2", "Gokai Yellow", 2, 3, 3, "gokaiger", "YELLOW"),
  ranger("gk3", "Gokai Pink", 3, 3, 5, "gokaiger", "PINK", [deploy(give("GUARD"), { target: leftmost({ faction: "sentai" }) })]),
  ranger("gk4", "Gokai Red", 4, 5, 5, "gokaiger", "RED", [deploy(give("RAPID"), { target: rightmost({ faction: "sentai" }) })]),
  ranger("gk5", "Gokai Silver", 5, 6, 7, "gokaiger", "EXTRA", [deploy(give("BARRIER"), { target: adjacent })]),

  // ---- Sentai: Kyoryuger (Brave: every attack makes it stronger for good)
  ranger("ky1", "Kyoryu Red", 1, 2, 3, "kyoryuger", "RED", [onAttack(buff(1, 0, true), { target: self })]),
  ranger("ky2", "Kyoryu Blue", 2, 3, 3, "kyoryuger", "BLUE"),
  ranger("ky3", "Kyoryu Green", 3, 4, 4, "kyoryuger", "GREEN", [onAttack(buff(1, 0, true), { target: self })]),
  ranger("ky4", "Kyoryu Pink", 4, 5, 5, "kyoryuger", "PINK", [onAttack(buff(1, 1, true), { target: self })]),
  ranger("ky5", "Kyoryu Gold", 5, 7, 7, "kyoryuger", "EXTRA", [onAttack(buff(2, 0, true), { target: self })]),

  // ---- Sentai: Shinkenger (Mojikara: seals protection onto allies)
  ranger("sk1", "Shinken Yellow", 1, 1, 3, "shinkenger", "YELLOW", [deploy(give("GUARD"), { target: adjacent })]),
  ranger("sk2", "Shinken Green", 2, 2, 4, "shinkenger", "GREEN", [], ["GUARD"]),
  ranger("sk3", "Shinken Blue", 3, 3, 5, "shinkenger", "BLUE", [deploy(give("BARRIER"), { target: randomAlly({ series: "shinkenger" }) })]),
  ranger("sk4", "Shinken Red", 4, 5, 6, "shinkenger", "RED"),
  ranger("sk5", "Shinken Gold", 5, 6, 8, "shinkenger", "EXTRA", [deploy(give("LETHAL"), { target: rightmost() })]),

  // ---- Sentai: Himmapan (original; Mythic Bond: a fallen guardian lends strength to the rest)
  ranger("hm1", "Kinnaree Pink", 1, 1, 3, "himmapan", "PINK"),
  ranger("hm2", "Naga Blue", 2, 3, 4, "himmapan", "BLUE", [lastStand(buff(1, 1, true), { target: allAllies({ series: "himmapan" }) })]),
  ranger("hm3", "Garuda Red", 3, 4, 5, "himmapan", "RED"),
  ranger("hm4", "Singha Yellow", 4, 4, 7, "himmapan", "YELLOW", [lastStand(buff(2, 2, true), { target: allAllies({ series: "himmapan" }) })], ["GUARD"]),
  ranger("hm5", "Hongsa Green", 5, 6, 8, "himmapan", "GREEN"),
  ranger("hm6", "Mythic Ranger", 6, 9, 11, "himmapan", "EXTRA", [lastStand(buff(3, 3, true), { target: allAllies({ series: "himmapan" }) })], ["BARRIER"]),

  // ---- Rider
  unit("rd1", "Rookie Rider", { rank: 1, atk: 2, hp: 2, factions: ["rider"], henshin: { after: 2, into: "rider_form" }, ultimateInto: "super_form" }),
  unit("rd2", "Kamen Rider Double", { rank: 2, atk: 3, hp: 3, factions: ["rider"], series: "w", ultimateInto: "w_xtreme", effects: [startOfCombat(buff(2, 2), { condition: seriesCount("w", 2) })] }),
  unit("rb", "Kamen Rider Birth", { rank: 2, atk: 2, hp: 4, factions: ["rider"], series: "ooo", ultimateInto: "ooo_putotyra", effects: [deploy(buff(1, 1), { target: adjacent })] }),
  unit("rd3", "Kamen Rider Accel", { rank: 3, atk: 4, hp: 4, factions: ["rider"], series: "w", ultimateInto: "w_xtreme", keywords: ["RIDER_KICK"] }),
  unit("rd4", "Kamen Rider Den-O", { rank: 4, atk: 5, hp: 5, factions: ["rider"], series: "den_o", ultimateInto: "den_o_liner", henshin: { after: 2, into: "super_form" } }),
  unit("rz", "Kamen Rider Zeronos", { rank: 5, atk: 6, hp: 7, factions: ["rider"], series: "den_o", ultimateInto: "den_o_liner", keywords: ["RIDER_KICK"], effects: [startOfCombat(buff(2, 0), { target: allAllies({ series: "den_o" }) })] }),
  unit("rd5", "Kamen Rider OOO", { rank: 5, atk: 7, hp: 8, factions: ["rider"], series: "ooo", ultimateInto: "ooo_putotyra", effects: [startOfCombat(give("RAPID"), { condition: seriesCount("ooo", 3) }), startOfCombat(buff(1, 1), { target: allAllies({ faction: "rider" }) })] }),
  unit("rd6", "Final Rider", { rank: 6, atk: 10, hp: 10, factions: ["rider"], ultimateInto: "final_rider_ultimate", keywords: ["RIDER_KICK"], effects: [startOfCombat(give("RIDER_KICK"), { target: allAllies({ faction: "rider" }) })] }),

  // ---- Mecha (Gattai)
  unit("mc1", "Zord Cub", { rank: 1, atk: 2, hp: 2, factions: ["mecha"], keywords: ["GATTAI"], gattaiInto: "f_cub" }),
  unit("mc2", "Galleon Unit", { rank: 2, atk: 3, hp: 4, factions: ["mecha"], series: "gokaiger", keywords: ["GATTAI", "GUARD"], gattaiInto: "f_galleon" }),
  unit("mc3", "Dino Zord", { rank: 3, atk: 4, hp: 4, factions: ["mecha"], series: "kyoryuger", keywords: ["GATTAI"], gattaiInto: "f_dino", effects: [startOfCombat(buff(1, 1), { target: allAllies({ faction: "mecha" }) })] }),
  unit("mc4", "Origami Zord", { rank: 4, atk: 6, hp: 6, factions: ["mecha"], series: "shinkenger", keywords: ["GATTAI"], gattaiInto: "f_origami", effects: [startOfCombat(buff(1, 1), { target: allAllies({ faction: "mecha" }) })] }),
  unit("mc5", "Command Mecha", { rank: 5, atk: 8, hp: 9, factions: ["mecha"], keywords: ["GUARD"], effects: [startOfCombat(buff(1, 1), { target: allAllies({ faction: "mecha" }) })] }),
  unit("mc6", "Titan Core", { rank: 6, atk: 12, hp: 12, factions: ["mecha"], keywords: ["GATTAI", "BARRIER"], gattaiInto: "f_titan" }),
  // ---- Gattai forms: what a group becomes when its core leads it (tokens: never sold in the shop)
  token("f_cub", "Cub Megazord", { rank: 1, atk: 2, hp: 3, factions: ["mecha"], keywords: ["RAPID"] }),
  token("f_galleon", "Galleon Fortress", { rank: 2, atk: 2, hp: 6, factions: ["mecha"], series: "gokaiger", keywords: ["GUARD", "BARRIER"] }),
  token("f_dino", "Dino King", { rank: 3, atk: 5, hp: 3, factions: ["mecha"], series: "kyoryuger", keywords: ["RAPID"], effects: [onAttack(buff(1, 0, true), { target: self })] }),
  token("f_origami", "Origami Shogun", { rank: 4, atk: 6, hp: 6, factions: ["mecha"], series: "shinkenger", keywords: ["FINAL_BLOW"] }),
  token("f_titan", "Titan Prime", { rank: 6, atk: 8, hp: 8, factions: ["mecha"], keywords: ["GUARD", "BARRIER"], effects: [startOfCombat(buff(2, 2), { target: allAllies() })] }),

  // ---- Kaijin (Kyodaika)
  unit("kj1", "Spore Beast", { rank: 1, atk: 1, hp: 2, factions: ["kaijin"], keywords: ["KYODAIKA"] }),
  unit("kj2", "Claw Fiend", { rank: 2, atk: 3, hp: 3, factions: ["kaijin"], effects: [lastStand(buff(1, 1), { target: randomAlly() })] }),
  unit("kj3", "Dopant Brute", { rank: 3, atk: 3, hp: 5, factions: ["kaijin"], series: "w", keywords: ["KYODAIKA", "GUARD"] }),
  unit("kj4", "Yummy Swarm", { rank: 4, atk: 4, hp: 5, factions: ["kaijin"], series: "ooo", keywords: ["KYODAIKA"] }),
  unit("kj5", "Greeed Ankh", { rank: 5, atk: 5, hp: 7, factions: ["kaijin"], series: "ooo", keywords: ["KYODAIKA"], effects: [avenge(2, buff(2, 2))] }),
  unit("kj6", "Monster General", { rank: 6, atk: 7, hp: 9, factions: ["kaijin"], keywords: ["KYODAIKA"], effects: [startOfCombat(buff(0, 2), { target: allAllies({ faction: "kaijin" }) })] }),

  // ---- Beast (summon on attack and on death; pack leaders power up every newcomer)
  unit("bs1", "Den Mother", { rank: 1, atk: 2, hp: 2, factions: ["beast"], effects: [lastStand(summon("beast_cub"))] }),
  unit("bs2", "Pack Wolf", { rank: 1, atk: 1, hp: 3, factions: ["beast"], effects: [onSummon(buff(1, 1), { target: summoned })] }),
  unit("bs3", "Hunting Hawk", { rank: 2, atk: 2, hp: 3, factions: ["beast"], effects: [onAttack(summon("beast_cub"))] }),
  unit("bs4", "Beast Tamer", { rank: 2, atk: 2, hp: 4, factions: ["beast"], effects: [onSummon(buff(2, 1), { target: summoned })] }),
  unit("bs5", "Hive Queen", { rank: 3, atk: 3, hp: 4, factions: ["beast"], effects: [startOfCombat(summon("beast_cub", 2))] }),
  unit("bs6", "Alpha Wolf", { rank: 4, atk: 5, hp: 5, factions: ["beast"], effects: [lastStand(summon("beast_cub", 2)), onSummon(buff(2, 2), { target: summoned })] }),
  unit("bs7", "Spirit Totem", { rank: 5, atk: 4, hp: 8, factions: ["beast"], keywords: ["GUARD"], effects: [onSummon(buff(3, 3), { target: summoned })] }),
  unit("bs8", "Primal King", { rank: 6, atk: 8, hp: 9, factions: ["beast"], effects: [onAttack(summon("beast_cub", 2)), lastStand(summon("beast_cub", 2))] }),

  // ---- Ally (economy and support). Den-O's Imagin live here.
  unit("al1", "Cafe Owner", { rank: 1, atk: 1, hp: 2, factions: ["ally"], effects: [endOfTurn(buff(1, 1), { condition: energyAtLeast(1), target: randomAlly() })] }),
  unit("al2", "Urataros", { rank: 2, atk: 2, hp: 4, factions: ["ally"], series: "den_o", effects: [deploy(buff(1, 1, true), { target: adjacent })] }),
  unit("al3", "Momotaros", { rank: 3, atk: 3, hp: 4, factions: ["ally"], series: "den_o", effects: [endOfTurn(buff(1, 1), { target: randomAlly({ series: "den_o" }) })] }),
  unit("al4", "Mentor", { rank: 4, atk: 4, hp: 6, factions: ["ally"], effects: [endOfTurn(buff(2, 2), { target: leftmost() })] }),
  unit("al5", "Veteran Coach", { rank: 5, atk: 5, hp: 8, factions: ["ally"], effects: [endOfTurn(buff(1, 1), { target: randomAlly() })] }),
  unit("al6", "Base Commander", { rank: 6, atk: 6, hp: 10, factions: ["ally"], effects: [endOfTurn(buff(1, 1), { target: allAllies() })] }),

  // ---- Dark Rider (sacrifice: destroys a random ally, then grows; alone it just grows)
  unit("dr1", "Shadow Rider", { rank: 1, atk: 2, hp: 2, factions: ["dark_rider"], effects: [deploy(destroy(), { target: randomAlly() }), deploy(buff(2, 2), { target: self })] }),
  unit("dr2", "Night Hopper", { rank: 2, atk: 4, hp: 3, factions: ["dark_rider"], effects: [deploy(destroy(), { target: randomAlly() }), deploy(buff(3, 3), { target: self })] }),
  unit("dr3", "Kamen Rider Eternal", { rank: 3, atk: 5, hp: 6, factions: ["dark_rider"], series: "w", keywords: ["BARRIER"] }),
  unit("dr4", "Dark Kabuto", { rank: 4, atk: 7, hp: 6, factions: ["dark_rider"], keywords: ["RIDER_KICK"], effects: [deploy(destroy(), { target: randomAlly() }), deploy(buff(2, 2), { target: self })] }),
  unit("dr5", "Dark Emperor", { rank: 5, atk: 9, hp: 9, factions: ["dark_rider"], keywords: ["RIDER_KICK"] }),
  unit("dr6", "Dark Lord", { rank: 6, atk: 14, hp: 12, factions: ["dark_rider"], keywords: ["RIDER_KICK", "REVIVE"] }),

  // ---- Shonen (Anime universe; Power-Up: permanent growth on attack, Avenge)
  unit("sh1", "Rookie Swordsman", { rank: 1, atk: 2, hp: 1, factions: ["shonen"], series: "star_blade", effects: [onAttack(buff(1, 0, true), { target: self })] }),
  unit("sh2", "Hot-Headed Rival", { rank: 2, atk: 3, hp: 2, factions: ["shonen"], series: "star_blade", effects: [avenge(2, buff(1, 1, true), { target: self })] }),
  unit("sh3", "Training Partner", { rank: 2, atk: 2, hp: 4, factions: ["shonen"], series: "star_blade", effects: [endOfTurn(buff(1, 1), { target: leftmost({ faction: "shonen" }) })] }),
  unit("sh4", "Spirit Archer", { rank: 3, atk: 4, hp: 3, factions: ["shonen"], series: "star_blade", effects: [startOfCombat(damage(2), { target: randomFoe })] }),
  unit("sh5", "Late Bloomer", { rank: 4, atk: 4, hp: 5, factions: ["shonen"], series: "star_blade", henshin: { after: 2, into: "sh5_awake" } }),
  token("sh5_awake", "Awakened Bloomer", { rank: 4, atk: 9, hp: 9, factions: ["shonen"], series: "star_blade", keywords: ["RAPID"] }),
  unit("sh6", "Old Master", { rank: 5, atk: 6, hp: 7, factions: ["shonen"], series: "star_blade", effects: [startOfCombat(buff(2, 2), { target: allAllies({ faction: "shonen" }) })] }),
  unit("sh7", "The Chosen One", { rank: 6, atk: 9, hp: 9, factions: ["shonen"], series: "star_blade", keywords: ["BARRIER"], effects: [onAttack(buff(2, 2, true), { target: self })] }),

  // ---- samples of the newer mechanics
  unit("x_supply", "Supply Officer", { rank: 2, atk: 2, hp: 3, effects: [deploy(randomCard("GEAR"))] }),
  unit("x_trader", "Lucky Trader", { rank: 1, atk: 1, hp: 2, effects: [onSell(randomCard("GEAR"), { repeat: 2 })] }),
  unit("x_scavenger", "Market Scout", { rank: 2, atk: 2, hp: 2, factions: ["ally"], effects: [endOfTurn(buffShop(1, 1))] }),
  unit("x_drill", "Drill Sergeant", { rank: 3, atk: 3, hp: 4, effects: [endOfTurn(give("GUARD"), { target: { selector: "RIGHTMOST_FRIENDLY" } })] }),
  // eats the strongest unit in the tavern at the end of each turn, at most once per turn
  unit("x_devourer", "Tavern Devourer", { rank: 3, atk: 2, hp: 3, factions: ["kaijin"], effects: [endOfTurn(devourShop("STRONGEST"), { target: self, limit: { times: 1, per: "TURN" } })] }),
  unit("x_grave", "Grave Caller", { rank: 2, atk: 3, hp: 2, effects: [deploy(discard(1, "RANDOM", "UNIT"))] }),
  unit("x_restless", "Restless Spirit", { rank: 1, atk: 1, hp: 1, effects: [onDiscard(buff(2, 2), { target: allAllies(), repeat: 2 })] }),
  unit("x_caller", "Den Caller", { rank: 4, atk: 3, hp: 5, factions: ["beast"], effects: [startOfCombat(summonFromHand(1))] }),
  unit("x_echo", "Echo Bard", { rank: 4, atk: 3, hp: 4, keywords: ["ECHO"] }),
];

// ---- tavern gear: one slot in the shop, bought for its own price, used from the hand
const tavernGear = [
  shopGear("g_armor", "Armor Plate", 1, 1, [player("ON_PLAY", buff(0, 3), { target: chosen() })]),
  shopGear("g_cell", "Energy Cell", 2, 1, [player("ON_PLAY", energy(2))]),
  shopGear("g_blade", "Plasma Blade", 2, 2, [player("ON_PLAY", buff(3, 0), { target: chosen() })]),
  shopGear("g_emitter", "Barrier Emitter", 3, 3, [player("ON_PLAY", give("BARRIER"), { target: chosen() })]),
  shopGear("g_driver", "Henshin Driver", 3, 2, [player("ON_PLAY", [buff(2, 2), give("RIDER_KICK")], { target: chosen({ faction: "rider" }) })], { factions: ["rider"] }),
  shopGear("g_boost", "Squad Boost", 4, 3, [player("ON_PLAY", buff(1, 1), { target: allAllies() })]),
  shopGear("g_overclock", "Overclock Chip", 5, 5, [player("ON_PLAY", give("RAPID"), { target: chosen() })], { costType: "HEALTH" }),
  shopGear("g_serum", "Titan Serum", 6, 5, [player("ON_PLAY", buff(2, 2), { target: allAllies() })]),
  // keywords on a unit of your choice
  shopGear("g_shield", "Guard Shield", 1, 1, [player("ON_PLAY", give("GUARD"), { target: chosen() })]),
  shopGear("g_venom", "Venom Edge", 4, 4, [player("ON_PLAY", give("LETHAL"), { target: chosen() })], { costType: "HEALTH" }),
  // paid in Health: strong for its rank
  shopGear("g_blood", "Blood Oath", 2, 3, [player("ON_PLAY", buff(3, 3), { target: chosen() })], { costType: "HEALTH" }),
  shopGear("g_revive", "Revive Chip", 5, 4, [player("ON_PLAY", give("REVIVE"), { target: chosen() })]),
  // a unit of one faction (only offered when that faction is in the match)
  shopGear("g_robo_upgrade", "Robo Upgrade", 4, 3, [player("ON_PLAY", [ultimateForm(), buff(2, 2)], { target: giantSlot })], { factions: ["sentai", "mecha"] }),
  shopGear("g_call_rider", "Rider Call", 2, 3, [player("ON_PLAY", discoverUnit("rider"))], { factions: ["rider"] }),
  shopGear("g_call_sentai", "Sentai Call", 2, 3, [player("ON_PLAY", discoverUnit("sentai"))], { factions: ["sentai"] }),
  shopGear("g_call_mecha", "Mecha Call", 2, 3, [player("ON_PLAY", discoverUnit("mecha"))], { factions: ["mecha"] }),
  shopGear("g_call_kaijin", "Kaijin Call", 2, 3, [player("ON_PLAY", discoverUnit("kaijin"))], { factions: ["kaijin"] }),
  shopGear("g_call_beast", "Beast Call", 2, 3, [player("ON_PLAY", discoverUnit("beast"))], { factions: ["beast"] }),
  shopGear("g_call_ally", "Ally Call", 2, 3, [player("ON_PLAY", discoverUnit("ally"))], { factions: ["ally"] }),
  shopGear("g_call_dark_rider", "Dark Rider Call", 2, 3, [player("ON_PLAY", discoverUnit("dark_rider"))], { factions: ["dark_rider"] }),
  shopGear("g_call_shonen", "Shonen Call", 2, 3, [player("ON_PLAY", discoverUnit("shonen"))], { factions: ["shonen"] }),
  // gets gear: a random one, twice
  shopGear("g_supply_crate", "Supply Crate", 2, 2, [player("ON_PLAY", randomCard("GEAR"), { repeat: 2 })]),
];

const gauges = [
  gaugeDef(
    "mecha",
    "Mecha Gauge",
    6,
    [
      { trigger: "ON_ROLL_CALL", amount: 1 },
      { trigger: "ON_ROLL_CALL_WIN", amount: 1 },
    ],
    [
      { at: 3, reward: [toHand("kyodai_gattai")] },
      { at: 6, reward: [superGattai(4, 4)] },
    ],
  ),
  gaugeDef("rider", "Rider Gauge", 6, [{ trigger: "HENSHIN", amount: 1 }], [{ at: 2, once: false, reward: [toHand("ultimate_form")] }]),
];

const relics = [
  // lesser
  relic("ranger_key", "Ranger Key", "LESSER", 2, [player("START_OF_COMBAT", give("RAPID"), { target: leftmost({ faction: "sentai" }) })], { series: "gokaiger" }),
  relic("brave_battery", "Brave Battery", "LESSER", 1, [player("START_OF_COMBAT", buff(1, 0), { target: allAllies({ series: "kyoryuger" }) })], { series: "kyoryuger" }),
  relic("shodophone", "Shodophone", "LESSER", 2, [player("START_OF_COMBAT", give("GUARD"), { target: leftmost({ series: "shinkenger" }) })], { series: "shinkenger" }),
  relic("gaia_memory", "Gaia Memory", "LESSER", 2, [player("START_OF_COMBAT", buff(2, 2), { target: leftmost({ series: "w" }) })], { series: "w" }),
  relic("rider_pass", "Rider Pass", "LESSER", 0, [player("START_OF_COMBAT", buff(2, 0), { target: leftmost({ series: "den_o" }) })], { series: "den_o" }),
  relic("core_medal_set", "Core Medal Set", "LESSER", 1, [player("START_OF_COMBAT", buff(1, 1), { target: allAllies({ series: "ooo" }) })], { series: "ooo" }),
  relic("pack_horn", "Pack Horn", "LESSER", 2, [player("START_OF_COMBAT", summon("beast_cub"))], { factions: ["beast"] }),
  relic("cafe_coupon", "Cafe Coupon", "LESSER", 3, [player("ON_TURN_START", energy(1))], { factions: ["ally"] }),
  relic("training_bracelet", "Training Bracelet", "LESSER", 3, [player("START_OF_COMBAT", buff(1, 1), { target: allAllies() })]),
  relic("lucky_charm", "Lucky Charm", "LESSER", 0, [player("ON_ACQUIRE", energy(1))]),
  // greater
  relic("prototype_driver", "Prototype Driver", "GREATER", 4, [player("START_OF_COMBAT", give("RIDER_KICK"), { target: allAllies({ faction: "rider" }) })], { factions: ["rider"] }),
  relic("mecha_gauge_core", "Mecha Gauge Core", "GREATER", 3, [player("ON_ACQUIRE", [gauge("mecha", 2), rule("giantEntryThreshold", "SET", 3)])], { factions: ["mecha", "sentai"] }),
  relic("team_spirit_banner", "Team Spirit Banner", "GREATER", 4, [player("ON_ACQUIRE", rule("rollCallColors", "SET", 2))], { factions: ["sentai"] }),
  relic("garuda_feather", "Garuda Feather", "GREATER", 4, [player("START_OF_COMBAT", buff(2, 2), { target: allAllies({ series: "himmapan" }) })], { series: "himmapan" }),
  relic("kaijin_cell", "Kaijin Cell", "GREATER", 3, [player("ON_ACQUIRE", rule("kyodaikaMultiplier", "SET", 3))], { factions: ["kaijin"] }),
  relic("dark_throne", "Dark Throne", "GREATER", 2, [player("START_OF_COMBAT", buff(3, 0), { target: allAllies({ faction: "dark_rider" }) })], { factions: ["dark_rider"] }),
  relic("universal_belt", "Universal Belt", "GREATER", 6, [player("ON_ACQUIRE", rule("freeRefreshesPerTurn", "SET", 2))]),
  relic("veteran_crest", "Veteran Crest", "GREATER", 0, [player("ON_ACQUIRE", buff(1, 1), { target: allAllies() })]),
  // more choice (F7.10)
  relic("scout_report", "Scout Report", "LESSER", 1, [player("ON_ACQUIRE", discoverUnit())]),
  relic("belt_charm", "Belt Charm", "LESSER", 2, [player("START_OF_COMBAT", buff(1, 2), { target: leftmost({ faction: "rider" }) })], { factions: ["rider"] }),
  relic("kaiju_egg", "Kaiju Egg", "LESSER", 2, [player("START_OF_COMBAT", give("KYODAIKA"), { target: leftmost({ faction: "kaijin" }) })], { factions: ["kaijin"] }),
  relic("hero_medal", "Hero Medal", "GREATER", 5, [player("ON_TURN_START", buff(1, 1), { target: randomAlly() })]),
  relic("mecha_blueprint", "Mecha Blueprint", "GREATER", 3, [player("ON_ACQUIRE", rule("gattaiSize", "SET", 2))], { factions: ["mecha"] }),
  relic("friendship_band", "Friendship Band", "LESSER", 2, [player("START_OF_COMBAT", buff(1, 1), { target: allAllies({ faction: "shonen" }) })], { factions: ["shonen"] }),
  relic("final_awakening", "Final Awakening", "GREATER", 4, [player("START_OF_COMBAT", give("RAPID"), { target: leftmost({ faction: "shonen" }) })], { factions: ["shonen"] }),
];

const heroes = [
  hero("captain_marvelous", "Captain Marvelous", { power: { mode: "ACTIVE", cost: 2, effects: [player("ON_USE", buff(2, 2), { target: leftmost({ faction: "sentai" }) })] } }),
  hero("kyoryu_red", "Kyoryu Red", { power: { mode: "ACTIVE", cost: 1, effects: [player("ON_USE", buff(1, 0, true), { target: leftmost({ series: "kyoryuger" }) })] } }),
  hero("philip", "Philip", { power: { mode: "PASSIVE", effects: [player("ON_ACQUIRE", rule("freeRefreshesPerTurn", "SET", 1))] } }),
  hero("ryotaro", "Ryotaro", { power: { mode: "ONCE", cost: 0, effects: [player("ON_USE", toHand("al2"))] } }),
  hero("eiji_hino", "Eiji Hino", { power: { mode: "ACTIVE", cost: 1, effects: [player("ON_USE", buff(1, 1), { target: leftmost({ faction: "rider" }) })] } }),
  hero("professor_belt", "Professor Belt", { power: { mode: "ONCE", cost: 0, effects: [player("ON_USE", toHand("n2"))] } }),
  hero("himmapan_guardian", "Himmapan Guardian", { armor: 3, power: { mode: "ACTIVE", cost: 2, effects: [player("ON_USE", buff(0, 3), { target: leftmost({ series: "himmapan" }) })] } }),
  hero("beast_master", "Beast Master", { power: { mode: "PASSIVE", effects: [player("ON_TURN_START", summon("beast_cub"))] } }),
  hero("iron_guard", "Iron Guard", { armor: 6 }),
  hero("hot_blooded_captain", "Hot-Blooded Captain", { power: { mode: "ACTIVE", cost: 1, effects: [player("ON_USE", buff(1, 1, true), { target: leftmost({ faction: "shonen" }) })] } }),
];

/** As authored: no generated rules text yet (that is filled in when a set is loaded). */
export const prototypeRaw: ContentSetData = { rules: { rollCallColors: 3 }, factions, series: allSeries, cards: [...cards, ...tavernGear], gauges, relics, heroes };

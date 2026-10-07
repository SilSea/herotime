import {
  adjacent,
  afterDamaged,
  allAllies,
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
  onAttack,
  leftmost,
  player,
  randomAlly,
  relic,
  rule,
  shopGear,
  self,
  series,
  startOfCombat,
  summon,
  teamUp,
  toHand,
  token,
  unit,
  chosen,
  discoverUnit,
  superGattai,
  onSummon,
  summoned,
  ultimateForm,
  giantSlot,
  randomCard,
  buffShop,
  devourShop,
  summonFromHand,
  onSell,
  discard,
  onDiscard,
} from "./dsl.js";
import type { ContentSetData } from "./types.js";

/**
 * PROTOTYPE set: a kitchen sink for trying ideas. All 7 factions with a full rank 1-6 ladder,
 * generic placeholder names, deliberately varied mechanics. Numbers are first guesses to be
 * tuned in play, not balanced. The production set lives in production.ts.
 */

const factions = [
  faction("rider", "Rider", "#e53935", "Henshin: transform after turns on the board. Rider Kick hits twice as hard on the first strike.", "Henshin: แปลงร่างเมื่ออยู่บนบอร์ดครบเทิร์น · Rider Kick ตีครั้งแรกแรง ×2"),
  faction("sentai", "Sentai", "#1e88e5", "Five colours. Team-Up bonuses and the Roll Call that charges the Mecha Gauge.", "ทีม 5 สี: โบนัส Team-Up และ Roll Call ที่เติม Mecha Gauge"),
  faction("mecha", "Mecha", "#78909c", "Gattai: line up a core and its parts, press Combine, and they become one robot for good.", "Gattai: วาง core กับชิ้นส่วนเรียงกัน กด Combine แล้วรวมเป็นหุ่นตัวเดียวถาวร"),
  faction("kaijin", "Kaijin", "#8e24aa", "Kyodaika: the first time it dies it comes back twice as big.", "Kyodaika: ตายครั้งแรกฟื้นเป็นร่างยักษ์ stat ×2"),
  faction("beast", "Beast", "#8d6e63", "Summons: calls the pack when it attacks and when it falls, and pack leaders power up every newcomer.", "เรียกพวก: เรียกยูนิตเข้าสนามตอนโจมตีและตอนตาย และจ่าฝูงบัฟทุกตัวที่ถูกเรียกเข้ามาใหม่"),
  faction("ally", "Ally", "#43a047", "Economy and support: Energy, buffs and cards in hand.", "เศรษฐกิจและสนับสนุน: Energy, บัฟ, การ์ดเข้ามือ"),
  faction("dark_rider", "Dark Rider", "#37474f", "Sacrifice allies to grow monstrous.", "สังเวยพวกเดียวกันเพื่อแข็งแกร่งขึ้น"),
];

const proSentai = series("proto_sentai", "Proto Squad", {
  franchise: "super-sentai",
  bonds: [
    { count: 2, effects: [player("START_OF_COMBAT", buff(1, 0), { target: allAllies({ series: "proto_sentai" }) })] },
    { count: 4, effects: [player("START_OF_COMBAT", buff(0, 2), { target: allAllies({ series: "proto_sentai" }) })] },
  ],
});
const proRider = series("proto_rider", "Proto Rider", {
  franchise: "kamen-rider",
  bonds: [
    { count: 2, effects: [player("START_OF_COMBAT", buff(1, 0), { target: allAllies({ series: "proto_rider" }) })] },
    { count: 3, effects: [player("START_OF_COMBAT", buff(2, 0), { target: allAllies({ series: "proto_rider" }) })] },
  ],
});

const R = "proto_rider";
const S = "proto_sentai";

const cards = [
  // ---- tokens, forms and things that are not in the shop
  token("beast_cub", "Cub", { atk: 2, hp: 1, factions: ["beast"] }),
  token("rider_form", "Rider Form", { atk: 4, hp: 4, factions: ["rider"], series: R, keywords: ["RIDER_KICK"] }),
  token("super_form", "Super Form", { atk: 9, hp: 9, factions: ["rider"], series: R, keywords: ["RIDER_KICK", "RAPID"] }),
  gear("kyodai_gattai", "Kyodai Gattai!", [player("ON_PLAY", discoverGiant())]),
  gear("ultimate_form", "Ultimate Form", [player("ON_PLAY", [ultimateForm(), buff(2, 2, true)], { target: chosen({ faction: "rider" }) })]),
  token("ultimate_rider", "Ultimate Rider", { rank: 6, atk: 12, hp: 12, factions: ["rider"], series: R, keywords: ["RIDER_KICK", "RAPID"] }),
  giant("proto_megazord_mk2", "Proto Megazord Mk-II", { atk: 12, hp: 12, series: S, factions: ["mecha"], keywords: ["FINAL_BLOW", "RAPID"] }),
  giant("proto_titan_mk2", "Proto Titan Mk-II", { atk: 9, hp: 16, series: S, factions: ["mecha"], keywords: ["FINAL_BLOW", "GUARD"] }),
  giant("proto_beast_mk2", "Proto Beast Mk-II", { atk: 14, hp: 10, keywords: ["FINAL_BLOW", "RAPID"] }),
  giant("proto_megazord", "Proto Megazord", { atk: 8, hp: 8, series: S, factions: ["mecha"], keywords: ["FINAL_BLOW"], ultimateInto: "proto_megazord_mk2" }),
  giant("proto_titan", "Proto Titan", { atk: 6, hp: 12, series: S, factions: ["mecha"], keywords: ["FINAL_BLOW", "GUARD"], ultimateInto: "proto_titan_mk2" }),
  giant("proto_beast", "Proto Beast", { atk: 10, hp: 7, keywords: ["FINAL_BLOW", "RAPID"], ultimateInto: "proto_beast_mk2" }),

  // ---- neutral: no faction, always in the shop
  unit("n1", "Wandering Fighter", { rank: 1, atk: 2, hp: 2 }),
  unit("n2", "Street Guardian", { rank: 2, atk: 2, hp: 4, keywords: ["GUARD"] }),
  unit("n3", "Masked Merchant", { rank: 3, atk: 3, hp: 4, keywords: ["BARRIER"] }),
  unit("n4", "Assassin", { rank: 4, atk: 3, hp: 4, keywords: ["LETHAL"] }),
  unit("n5", "Wild Champion", { rank: 5, atk: 8, hp: 8 }),
  unit("n6", "Legendary Hero", { rank: 6, atk: 10, hp: 12, keywords: ["GUARD", "BARRIER"] }),

  // ---- rider
  unit("rd1", "Rookie Rider", { rank: 1, atk: 2, hp: 2, factions: ["rider"], series: R, henshin: { after: 2, into: "rider_form" }, ultimateInto: "ultimate_rider" }),
  unit("rd2", "Bike Rider", { rank: 2, atk: 3, hp: 3, factions: ["rider"], series: R, ultimateInto: "ultimate_rider", keywords: ["RIDER_KICK"] }),
  unit("rd3", "Hopper Rider", { rank: 3, atk: 3, hp: 4, factions: ["rider"], series: R, ultimateInto: "ultimate_rider", effects: [deploy(buff(1, 1), { target: adjacent })] }),
  unit("rd4", "Armored Rider", { rank: 4, atk: 5, hp: 5, factions: ["rider"], series: R, ultimateInto: "ultimate_rider", henshin: { after: 2, into: "super_form" } }),
  unit("rd5", "Time Rider", { rank: 5, atk: 7, hp: 8, factions: ["rider"], series: R, ultimateInto: "ultimate_rider", effects: [startOfCombat(buff(2, 0), { target: allAllies({ faction: "rider" }) })] }),
  unit("rd6", "Final Rider", { rank: 6, atk: 10, hp: 10, factions: ["rider"], series: R, ultimateInto: "ultimate_rider", keywords: ["RIDER_KICK"], effects: [startOfCombat(give("RIDER_KICK"), { target: allAllies({ faction: "rider" }) })] }),

  // ---- sentai (colours drive Team-Up and Roll Call)
  unit("sn1", "Red Cadet", { rank: 1, atk: 1, hp: 3, factions: ["sentai"], series: S, colors: ["RED"], effects: [startOfCombat(buff(2, 2), { condition: teamUp(2) })] }),
  unit("sn2", "Blue Cadet", { rank: 1, atk: 2, hp: 2, factions: ["sentai"], series: S, colors: ["BLUE"], effects: [startOfCombat(buff(1, 1), { condition: teamUp(2) })] }),
  unit("sn3", "Yellow Ranger", { rank: 2, atk: 3, hp: 3, factions: ["sentai"], series: S, colors: ["YELLOW"], effects: [startOfCombat(buff(1, 0), { condition: teamUp(3), target: allAllies({ faction: "sentai" }) })] }),
  unit("sn4", "Green Ranger", { rank: 2, atk: 2, hp: 4, factions: ["sentai"], series: S, colors: ["GREEN"], keywords: ["GUARD"] }),
  unit("sn5", "Pink Ranger", { rank: 3, atk: 3, hp: 5, factions: ["sentai"], series: S, colors: ["PINK"], effects: [startOfCombat(buff(1, 1), { condition: teamUp(4), target: allAllies({ faction: "sentai" }) })] }),
  unit("sn6", "Extra Ranger", { rank: 4, atk: 5, hp: 5, factions: ["sentai"], series: S, colors: ["EXTRA"], effects: [startOfCombat(buff(2, 2), { condition: teamUp(3) })] }),
  unit("sn7", "Team Leader", { rank: 5, atk: 6, hp: 8, factions: ["sentai"], series: S, colors: ["RED"], effects: [startOfCombat(buff(3, 3), { condition: teamUp(5), target: allAllies({ faction: "sentai" }) })] }),
  unit("sn8", "Ultimate Ranger", { rank: 6, atk: 9, hp: 11, factions: ["sentai"], series: S, colors: ["EXTRA"], keywords: ["BARRIER"], effects: [startOfCombat(buff(2, 2), { condition: teamUp(5), target: allAllies({ faction: "sentai" }) })] }),

  // ---- mecha (Gattai)
  unit("mc1", "Scout Drone", { rank: 1, atk: 2, hp: 2, factions: ["mecha"], keywords: ["GATTAI"], gattaiInto: "f_sky" }),
  unit("mc2", "Tank Unit", { rank: 2, atk: 3, hp: 4, factions: ["mecha"], keywords: ["GATTAI", "GUARD"], gattaiInto: "f_bastion" }),
  unit("mc3", "Jet Unit", { rank: 3, atk: 4, hp: 4, factions: ["mecha"], keywords: ["GATTAI"], gattaiInto: "f_falcon", effects: [startOfCombat(buff(1, 1), { target: allAllies({ faction: "mecha" }) })] }),
  unit("mc4", "Drill Unit", { rank: 4, atk: 6, hp: 6, factions: ["mecha"], keywords: ["GATTAI"], gattaiInto: "f_drill", effects: [startOfCombat(buff(1, 1), { target: allAllies({ faction: "mecha" }) })] }),
  unit("mc5", "Command Mecha", { rank: 5, atk: 8, hp: 9, factions: ["mecha"], keywords: ["GUARD"], effects: [startOfCombat(buff(1, 1), { target: allAllies({ faction: "mecha" }) })] }),
  unit("mc6", "Titan Core", { rank: 6, atk: 12, hp: 12, factions: ["mecha"], keywords: ["GATTAI", "BARRIER"], gattaiInto: "f_titan" }),
  // ---- Gattai forms: what a group becomes when its core leads it (tokens: never sold in the shop)
  token("f_sky", "Sky Fortress", { rank: 1, atk: 2, hp: 3, factions: ["mecha"], keywords: ["RAPID"] }),
  token("f_bastion", "Iron Bastion", { rank: 2, atk: 2, hp: 6, factions: ["mecha"], keywords: ["GUARD", "BARRIER"] }),
  token("f_falcon", "Storm Falcon", { rank: 3, atk: 5, hp: 3, factions: ["mecha"], keywords: ["RAPID"], effects: [onAttack(buff(1, 0, true), { target: self })] }),
  token("f_drill", "Drill Emperor", { rank: 4, atk: 6, hp: 6, factions: ["mecha"], keywords: ["FINAL_BLOW"] }),
  token("f_titan", "Titan Prime", { rank: 6, atk: 8, hp: 8, factions: ["mecha"], keywords: ["GUARD", "BARRIER"], effects: [startOfCombat(buff(2, 2), { target: allAllies() })] }),

  // ---- kaijin (Kyodaika)
  unit("kj1", "Spore Beast", { rank: 1, atk: 1, hp: 2, factions: ["kaijin"], keywords: ["KYODAIKA"] }),
  unit("kj2", "Claw Fiend", { rank: 2, atk: 3, hp: 3, factions: ["kaijin"], effects: [lastStand(buff(1, 1), { target: randomAlly() })] }),
  unit("kj3", "Stone Golem", { rank: 3, atk: 3, hp: 5, factions: ["kaijin"], keywords: ["KYODAIKA", "GUARD"] }),
  unit("kj4", "Venom Wyrm", { rank: 4, atk: 4, hp: 5, factions: ["kaijin"], keywords: ["KYODAIKA"] }),
  unit("kj5", "Monster Duke", { rank: 5, atk: 5, hp: 7, factions: ["kaijin"], keywords: ["KYODAIKA"], effects: [avenge(2, buff(2, 2))] }),
  unit("kj6", "Monster General", { rank: 6, atk: 7, hp: 9, factions: ["kaijin"], keywords: ["KYODAIKA"], effects: [startOfCombat(buff(0, 2), { target: allAllies({ faction: "kaijin" }) })] }),

  // ---- samples of the newer mechanics
  unit("x_supply", "Supply Officer", { rank: 2, atk: 2, hp: 3, effects: [deploy(randomCard("GEAR"))] }),
  unit("x_trader", "Lucky Trader", { rank: 1, atk: 1, hp: 2, effects: [onSell(randomCard("GEAR"), { repeat: 2 })] }),
  unit("x_scavenger", "Market Scout", { rank: 2, atk: 2, hp: 2, factions: ["ally"], effects: [endOfTurn(buffShop(1, 1))] }),
  unit("x_drill", "Drill Sergeant", { rank: 3, atk: 3, hp: 4, effects: [endOfTurn(give("GUARD"), { target: { selector: "RIGHTMOST_FRIENDLY" } })] }),
  // eats at the end of each turn, at most once per turn, only small fry (rank 2 or lower)
  unit("x_devourer", "Tavern Devourer", { rank: 3, atk: 2, hp: 3, factions: ["kaijin"], effects: [endOfTurn(devourShop(2, undefined, "STRONGEST"), { target: self, limit: { times: 1, per: "TURN" } })] }),
  unit("x_grave", "Grave Caller", { rank: 2, atk: 3, hp: 2, effects: [deploy(discard(1, "RANDOM", "UNIT"))] }),
  unit("x_restless", "Restless Spirit", { rank: 1, atk: 1, hp: 1, effects: [onDiscard(buff(2, 2), { target: allAllies(), repeat: 2 })] }),
  unit("x_caller", "Den Caller", { rank: 4, atk: 3, hp: 5, factions: ["beast"], effects: [startOfCombat(summonFromHand(1))] }),
  unit("x_echo", "Echo Bard", { rank: 4, atk: 3, hp: 4, keywords: ["ECHO"] }),

  // ---- Beast (summon on attack and on death; pack leaders power up every newcomer)
  unit("bs1", "Den Mother", { rank: 1, atk: 2, hp: 2, factions: ["beast"], effects: [lastStand(summon("beast_cub"))] }),
  unit("bs2", "Pack Wolf", { rank: 1, atk: 1, hp: 3, factions: ["beast"], effects: [onSummon(buff(1, 1), { target: summoned })] }),
  unit("bs3", "Hunting Hawk", { rank: 2, atk: 2, hp: 3, factions: ["beast"], effects: [onAttack(summon("beast_cub"))] }),
  unit("bs4", "Beast Tamer", { rank: 2, atk: 2, hp: 4, factions: ["beast"], effects: [onSummon(buff(2, 1), { target: summoned })] }),
  unit("bs5", "Hive Queen", { rank: 3, atk: 3, hp: 4, factions: ["beast"], effects: [startOfCombat(summon("beast_cub", 2))] }),
  unit("bs6", "Alpha Wolf", { rank: 4, atk: 5, hp: 5, factions: ["beast"], effects: [lastStand(summon("beast_cub", 2)), onSummon(buff(2, 2), { target: summoned })] }),
  unit("bs7", "Spirit Totem", { rank: 5, atk: 4, hp: 8, factions: ["beast"], keywords: ["GUARD"], effects: [onSummon(buff(3, 3), { target: summoned })] }),
  unit("bs8", "Primal King", { rank: 6, atk: 8, hp: 9, factions: ["beast"], effects: [onAttack(summon("beast_cub", 2)), lastStand(summon("beast_cub", 2))] }),

  // ---- ally (economy and support)
  unit("al1", "Cafe Owner", { rank: 1, atk: 1, hp: 2, factions: ["ally"], effects: [endOfTurn(buff(1, 1), { condition: energyAtLeast(1), target: randomAlly() })] }),
  unit("al2", "Mechanic", { rank: 2, atk: 1, hp: 3, factions: ["ally"], effects: [deploy(energy(2))] }),
  unit("al3", "Informant", { rank: 3, atk: 3, hp: 4, factions: ["ally"], effects: [deploy(toHand("al1"))] }),
  unit("al4", "Mentor", { rank: 4, atk: 4, hp: 6, factions: ["ally"], effects: [endOfTurn(buff(2, 2), { target: leftmost() })] }),
  unit("al5", "Veteran Coach", { rank: 5, atk: 5, hp: 8, factions: ["ally"], effects: [endOfTurn(buff(1, 1), { target: randomAlly() })] }),
  unit("al6", "Base Commander", { rank: 6, atk: 6, hp: 10, factions: ["ally"], effects: [endOfTurn(buff(1, 1), { target: allAllies() })] }),

  // ---- dark rider (sacrifice: destroys a random ally, then grows; alone it just grows)
  unit("dr1", "Shadow Rider", { rank: 1, atk: 2, hp: 2, factions: ["dark_rider"], series: R, effects: [deploy(destroy(), { target: randomAlly() }), deploy(buff(2, 2), { target: self })] }),
  unit("dr2", "Night Hopper", { rank: 2, atk: 4, hp: 3, factions: ["dark_rider"], series: R, effects: [deploy(destroy(), { target: randomAlly() }), deploy(buff(3, 3), { target: self })] }),
  unit("dr3", "Dark Armor", { rank: 3, atk: 5, hp: 6, factions: ["dark_rider"], series: R, keywords: ["BARRIER"] }),
  unit("dr4", "Dark Kabuto", { rank: 4, atk: 7, hp: 6, factions: ["dark_rider"], series: R, keywords: ["RIDER_KICK"], effects: [deploy(destroy(), { target: randomAlly() }), deploy(buff(2, 2), { target: self })] }),
  unit("dr5", "Dark Emperor", { rank: 5, atk: 9, hp: 9, factions: ["dark_rider"], series: R, keywords: ["RIDER_KICK"] }),
  unit("dr6", "Dark Lord", { rank: 6, atk: 14, hp: 12, factions: ["dark_rider"], series: R, keywords: ["RIDER_KICK", "REVIVE"] }),
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
  // gets gear: a random one, twice
  shopGear("g_supply_crate", "Supply Crate", 2, 2, [player("ON_PLAY", randomCard("GEAR"), { repeat: 2 })]),
  shopGear("g_call_rider", "Rider Call", 2, 3, [player("ON_PLAY", discoverUnit("rider"))], { factions: ["rider"] }),
  shopGear("g_call_sentai", "Sentai Call", 2, 3, [player("ON_PLAY", discoverUnit("sentai"))], { factions: ["sentai"] }),
  shopGear("g_call_mecha", "Mecha Call", 2, 3, [player("ON_PLAY", discoverUnit("mecha"))], { factions: ["mecha"] }),
  shopGear("g_call_kaijin", "Kaijin Call", 2, 3, [player("ON_PLAY", discoverUnit("kaijin"))], { factions: ["kaijin"] }),
  shopGear("g_call_beast", "Beast Call", 2, 3, [player("ON_PLAY", discoverUnit("beast"))], { factions: ["beast"] }),
  shopGear("g_call_ally", "Ally Call", 2, 3, [player("ON_PLAY", discoverUnit("ally"))], { factions: ["ally"] }),
  shopGear("g_call_dark_rider", "Dark Rider Call", 2, 3, [player("ON_PLAY", discoverUnit("dark_rider"))], { factions: ["dark_rider"] }),
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
  relic("training_bracelet", "Training Bracelet", "LESSER", 3, [player("START_OF_COMBAT", buff(1, 1), { target: allAllies() })]),
  relic("cafe_coupon", "Cafe Coupon", "LESSER", 3, [player("ON_TURN_START", energy(1))], { factions: ["ally"] }),
  relic("pack_horn", "Pack Horn", "LESSER", 2, [player("START_OF_COMBAT", summon("beast_cub"))], { factions: ["beast"] }),
  relic("rider_pass", "Rider Pass", "LESSER", 0, [player("START_OF_COMBAT", buff(2, 0), { target: leftmost({ faction: "rider" }) })], { factions: ["rider"], series: R }),
  relic("shodophone", "Shodophone", "LESSER", 2, [player("START_OF_COMBAT", buff(1, 1), { condition: teamUp(3), target: allAllies({ faction: "sentai" }) })], { factions: ["sentai"] }),
  relic("armor_plating", "Armor Plating", "LESSER", 2, [player("START_OF_COMBAT", give("GUARD"), { target: leftmost() })], { factions: ["mecha"] }),
  relic("monster_cell", "Monster Cell", "LESSER", 2, [player("START_OF_COMBAT", buff(0, 2), { target: allAllies({ faction: "kaijin" }) })], { factions: ["kaijin"] }),
  relic("dark_contract", "Dark Contract", "LESSER", 1, [player("ON_ACQUIRE", energy(2))], { factions: ["dark_rider"] }),
  relic("lucky_charm", "Lucky Charm", "LESSER", 0, [player("ON_ACQUIRE", energy(1))]),
  // greater
  relic("prototype_driver", "Prototype Driver", "GREATER", 4, [player("START_OF_COMBAT", give("RIDER_KICK"), { target: allAllies({ faction: "rider" }) })], { factions: ["rider"] }),
  relic("mecha_gauge_core", "Mecha Gauge Core", "GREATER", 3, [player("ON_ACQUIRE", [gauge("mecha", 2), rule("giantEntryThreshold", "SET", 3)])], { factions: ["mecha", "sentai"] }),
  relic("team_spirit_banner", "Team Spirit Banner", "GREATER", 4, [player("ON_ACQUIRE", rule("rollCallColors", "SET", 2))], { factions: ["sentai"] }),
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
];

const heroes = [
  hero("time_traveler", "Time Traveler", { power: { mode: "PASSIVE", effects: [player("ON_ACQUIRE", rule("freeRefreshesPerTurn", "SET", 1))] } }),
  hero("red_leader", "Red Leader", { power: { mode: "ACTIVE", cost: 2, effects: [player("ON_USE", buff(2, 2), { target: leftmost() })] } }),
  hero("professor_belt", "Professor Belt", { power: { mode: "ONCE", cost: 0, effects: [player("ON_USE", toHand("n2"))] } }),
  hero("mecha_commander", "Mecha Commander", { power: { mode: "PASSIVE", effects: [player("ON_ACQUIRE", rule("gattaiSize", "SET", 2))] } }),
  hero("kaijin_general", "Kaijin General", { power: { mode: "ACTIVE", cost: 1, effects: [player("ON_USE", give("KYODAIKA"), { target: leftmost() })] } }),
  hero("beast_master", "Beast Master", { power: { mode: "PASSIVE", effects: [player("ON_TURN_START", summon("beast_cub"))] } }),
  hero("cafe_master", "Cafe Master", { power: { mode: "ACTIVE", cost: 1, effects: [player("ON_USE", buff(1, 1), { target: allAllies({ faction: "ally" }) })] } }),
  hero("iron_guard", "Iron Guard", { armor: 6 }),
];

/** As authored: no generated rules text yet (that is filled in when a set is loaded). */
export const prototypeRaw: ContentSetData = { rules: { rollCallColors: 3 }, factions, series: [proSentai, proRider], cards: [...cards, ...tavernGear], gauges, relics, heroes };

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
  henshinCall,
  hero,
  lastStand,
  leftmost,
  player,
  randomAlly,
  relic,
  rule,
  self,
  series,
  startOfCombat,
  summon,
  teamUp,
  toHand,
  token,
  unit,
} from "./dsl.js";
import { withGeneratedText, type ContentSetData } from "./types.js";

/**
 * PROTOTYPE set: a kitchen sink for trying ideas. All 7 factions with a full rank 1-6 ladder,
 * generic placeholder names, deliberately varied mechanics. Numbers are first guesses to be
 * tuned in play, not balanced. The production set lives in production.ts.
 */

const factions = [
  faction("rider", "Rider", "#e53935", "Henshin: transform after turns on the board. Rider Kick hits twice as hard on the first strike."),
  faction("sentai", "Sentai", "#1e88e5", "Five colours. Team-Up bonuses and the Roll Call that charges the Mecha Gauge."),
  faction("mecha", "Mecha", "#78909c", "Gattai: three adjacent Mecha merge into one big unit when combat starts."),
  faction("kaijin", "Kaijin", "#8e24aa", "Kyodaika: the first time it dies it comes back twice as big."),
  faction("grunt", "Grunt", "#6d4c41", "Swarms of cheap bodies that leave more bodies behind."),
  faction("ally", "Ally", "#43a047", "Economy and support: Energy, buffs and cards in hand."),
  faction("dark_rider", "Dark Rider", "#37474f", "Sacrifice allies to grow monstrous."),
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
  token("grunt_token", "Recruit", { atk: 1, hp: 1, factions: ["grunt"] }),
  token("rider_form", "Rider Form", { atk: 4, hp: 4, factions: ["rider"], series: R, keywords: ["RIDER_KICK"] }),
  token("super_form", "Super Form", { atk: 9, hp: 9, factions: ["rider"], series: R, keywords: ["RIDER_KICK", "RAPID"] }),
  gear("kyodai_gattai", "Kyodai Gattai!", [player("ON_PLAY", discoverGiant())]),
  gear("ultimate_form", "Ultimate Form", [player("ON_PLAY", [buff(4, 4, true), give("RIDER_KICK")], { target: leftmost({ faction: "rider" }) })]),
  giant("proto_megazord", "Proto Megazord", { atk: 8, hp: 8, series: S, factions: ["mecha"], keywords: ["FINAL_BLOW"] }),
  giant("proto_titan", "Proto Titan", { atk: 6, hp: 12, series: S, factions: ["mecha"], keywords: ["FINAL_BLOW", "GUARD"] }),
  giant("proto_beast", "Proto Beast", { atk: 10, hp: 7, keywords: ["FINAL_BLOW", "RAPID"] }),

  // ---- neutral: no faction, always in the shop
  unit("n1", "Wandering Fighter", { rank: 1, atk: 2, hp: 2 }),
  unit("n2", "Street Guardian", { rank: 2, atk: 2, hp: 4, keywords: ["GUARD"] }),
  unit("n3", "Masked Merchant", { rank: 3, atk: 3, hp: 4, keywords: ["BARRIER"] }),
  unit("n4", "Assassin", { rank: 4, atk: 3, hp: 4, keywords: ["LETHAL"] }),
  unit("n5", "Wild Champion", { rank: 5, atk: 8, hp: 8 }),
  unit("n6", "Legendary Hero", { rank: 6, atk: 10, hp: 12, keywords: ["GUARD", "BARRIER"] }),

  // ---- rider
  unit("rd1", "Rookie Rider", { rank: 1, atk: 2, hp: 2, factions: ["rider"], series: R, henshin: { after: 2, into: "rider_form" } }),
  unit("rd2", "Bike Rider", { rank: 2, atk: 3, hp: 3, factions: ["rider"], series: R, keywords: ["RIDER_KICK"] }),
  unit("rd3", "Hopper Rider", { rank: 3, atk: 3, hp: 4, factions: ["rider"], series: R, effects: [henshinCall(buff(1, 1), { target: adjacent })] }),
  unit("rd4", "Armored Rider", { rank: 4, atk: 5, hp: 5, factions: ["rider"], series: R, henshin: { after: 2, into: "super_form" } }),
  unit("rd5", "Time Rider", { rank: 5, atk: 7, hp: 8, factions: ["rider"], series: R, effects: [startOfCombat(buff(2, 0), { target: allAllies({ faction: "rider" }) })] }),
  unit("rd6", "Final Rider", { rank: 6, atk: 10, hp: 10, factions: ["rider"], series: R, keywords: ["RIDER_KICK"], effects: [startOfCombat(give("RIDER_KICK"), { target: allAllies({ faction: "rider" }) })] }),

  // ---- sentai (colours drive Team-Up and Roll Call)
  unit("sn1", "Red Cadet", { rank: 1, atk: 1, hp: 3, factions: ["sentai"], series: S, colors: ["RED"], effects: [startOfCombat(buff(2, 2), { condition: teamUp(3) })] }),
  unit("sn2", "Blue Cadet", { rank: 1, atk: 2, hp: 2, factions: ["sentai"], series: S, colors: ["BLUE"], effects: [startOfCombat(buff(1, 1), { condition: teamUp(2) })] }),
  unit("sn3", "Yellow Ranger", { rank: 2, atk: 3, hp: 3, factions: ["sentai"], series: S, colors: ["YELLOW"], effects: [startOfCombat(buff(1, 0), { condition: teamUp(3), target: allAllies({ faction: "sentai" }) })] }),
  unit("sn4", "Green Ranger", { rank: 2, atk: 2, hp: 4, factions: ["sentai"], series: S, colors: ["GREEN"], keywords: ["GUARD"] }),
  unit("sn5", "Pink Ranger", { rank: 3, atk: 3, hp: 5, factions: ["sentai"], series: S, colors: ["PINK"], effects: [startOfCombat(buff(1, 1), { condition: teamUp(4), target: allAllies({ faction: "sentai" }) })] }),
  unit("sn6", "Extra Ranger", { rank: 4, atk: 5, hp: 5, factions: ["sentai"], series: S, colors: ["EXTRA"], effects: [startOfCombat(buff(2, 2), { condition: teamUp(4) })] }),
  unit("sn7", "Team Leader", { rank: 5, atk: 6, hp: 8, factions: ["sentai"], series: S, colors: ["RED"], effects: [startOfCombat(buff(3, 3), { condition: teamUp(5), target: allAllies({ faction: "sentai" }) })] }),
  unit("sn8", "Ultimate Ranger", { rank: 6, atk: 9, hp: 11, factions: ["sentai"], series: S, colors: ["EXTRA"], keywords: ["BARRIER"], effects: [startOfCombat(buff(2, 2), { condition: teamUp(5), target: allAllies({ faction: "sentai" }) })] }),

  // ---- mecha (Gattai)
  unit("mc1", "Scout Drone", { rank: 1, atk: 1, hp: 2, factions: ["mecha"], keywords: ["GATTAI"] }),
  unit("mc2", "Tank Unit", { rank: 2, atk: 2, hp: 4, factions: ["mecha"], keywords: ["GATTAI", "GUARD"] }),
  unit("mc3", "Jet Unit", { rank: 3, atk: 4, hp: 3, factions: ["mecha"], keywords: ["GATTAI"] }),
  unit("mc4", "Drill Unit", { rank: 4, atk: 5, hp: 5, factions: ["mecha"], keywords: ["GATTAI"] }),
  unit("mc5", "Command Mecha", { rank: 5, atk: 7, hp: 9, factions: ["mecha"], keywords: ["GUARD"], effects: [startOfCombat(buff(1, 1), { target: allAllies({ faction: "mecha" }) })] }),
  unit("mc6", "Titan Core", { rank: 6, atk: 12, hp: 12, factions: ["mecha"], keywords: ["GATTAI", "BARRIER"] }),

  // ---- kaijin (Kyodaika)
  unit("kj1", "Spore Beast", { rank: 1, atk: 1, hp: 2, factions: ["kaijin"], keywords: ["KYODAIKA"] }),
  unit("kj2", "Claw Fiend", { rank: 2, atk: 3, hp: 3, factions: ["kaijin"], effects: [lastStand(buff(1, 1), { target: randomAlly() })] }),
  unit("kj3", "Stone Golem", { rank: 3, atk: 3, hp: 6, factions: ["kaijin"], keywords: ["KYODAIKA", "GUARD"] }),
  unit("kj4", "Venom Wyrm", { rank: 4, atk: 5, hp: 5, factions: ["kaijin"], keywords: ["KYODAIKA"] }),
  unit("kj5", "Monster Duke", { rank: 5, atk: 6, hp: 8, factions: ["kaijin"], keywords: ["KYODAIKA"], effects: [avenge(2, buff(3, 3))] }),
  unit("kj6", "Monster General", { rank: 6, atk: 10, hp: 12, factions: ["kaijin"], keywords: ["KYODAIKA"], effects: [startOfCombat(buff(0, 3), { target: allAllies({ faction: "kaijin" }) })] }),

  // ---- grunt (swarm)
  unit("gr1", "Combatant", { rank: 1, atk: 2, hp: 1, factions: ["grunt"], effects: [lastStand(summon("grunt_token"))] }),
  unit("gr2", "Foot Soldier", { rank: 2, atk: 3, hp: 2, factions: ["grunt"], effects: [lastStand(summon("grunt_token", 2))] }),
  unit("gr3", "Squad Leader", { rank: 3, atk: 3, hp: 4, factions: ["grunt"], effects: [startOfCombat(buff(1, 1), { target: allAllies({ faction: "grunt" }) })] }),
  unit("gr4", "Commander", { rank: 4, atk: 4, hp: 5, factions: ["grunt"], effects: [avenge(2, summon("grunt_token", 2))] }),
  unit("gr5", "Elite Guard", { rank: 5, atk: 6, hp: 6, factions: ["grunt"], keywords: ["GUARD"], effects: [lastStand(summon("grunt_token", 3))] }),
  unit("gr6", "Grunt Overlord", { rank: 6, atk: 8, hp: 8, factions: ["grunt"], effects: [startOfCombat(summon("grunt_token", 3)), lastStand(summon("grunt_token", 3))] }),

  // ---- ally (economy and support)
  unit("al1", "Cafe Owner", { rank: 1, atk: 1, hp: 2, factions: ["ally"], effects: [endOfTurn(buff(1, 1), { condition: energyAtLeast(1), target: randomAlly() })] }),
  unit("al2", "Mechanic", { rank: 2, atk: 1, hp: 3, factions: ["ally"], effects: [henshinCall(energy(2))] }),
  unit("al3", "Informant", { rank: 3, atk: 3, hp: 4, factions: ["ally"], effects: [henshinCall(toHand("al1"))] }),
  unit("al4", "Mentor", { rank: 4, atk: 4, hp: 6, factions: ["ally"], effects: [endOfTurn(buff(2, 2), { target: leftmost() })] }),
  unit("al5", "Veteran Coach", { rank: 5, atk: 5, hp: 8, factions: ["ally"], effects: [endOfTurn(buff(1, 1), { target: allAllies() })] }),
  unit("al6", "Base Commander", { rank: 6, atk: 6, hp: 10, factions: ["ally"], effects: [endOfTurn(buff(2, 2), { target: allAllies() })] }),

  // ---- dark rider (sacrifice: destroys a random ally, then grows; alone it just grows)
  unit("dr1", "Shadow Rider", { rank: 1, atk: 2, hp: 2, factions: ["dark_rider"], series: R, effects: [henshinCall(destroy(), { target: randomAlly() }), henshinCall(buff(2, 2), { target: self })] }),
  unit("dr2", "Night Hopper", { rank: 2, atk: 4, hp: 3, factions: ["dark_rider"], series: R, effects: [henshinCall(destroy(), { target: randomAlly() }), henshinCall(buff(3, 3), { target: self })] }),
  unit("dr3", "Dark Armor", { rank: 3, atk: 5, hp: 6, factions: ["dark_rider"], series: R, keywords: ["BARRIER"] }),
  unit("dr4", "Dark Kabuto", { rank: 4, atk: 7, hp: 6, factions: ["dark_rider"], series: R, keywords: ["RIDER_KICK"], effects: [henshinCall(destroy(), { target: randomAlly() }), henshinCall(buff(2, 2), { target: self })] }),
  unit("dr5", "Dark Emperor", { rank: 5, atk: 9, hp: 9, factions: ["dark_rider"], series: R, keywords: ["RIDER_KICK"] }),
  unit("dr6", "Dark Lord", { rank: 6, atk: 14, hp: 12, factions: ["dark_rider"], series: R, keywords: ["RIDER_KICK", "REVIVE"] }),
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
    [{ at: 3, reward: [toHand("kyodai_gattai")] }],
  ),
  gaugeDef("rider", "Rider Gauge", 6, [{ trigger: "HENSHIN", amount: 1 }], [{ at: 2, once: false, reward: [toHand("ultimate_form")] }]),
];

const relics = [
  // lesser
  relic("training_bracelet", "Training Bracelet", "LESSER", 3, [player("START_OF_COMBAT", buff(1, 1), { target: allAllies() })]),
  relic("cafe_coupon", "Cafe Coupon", "LESSER", 3, [player("ON_TURN_START", energy(1))], { factions: ["ally"] }),
  relic("grunt_whistle", "Grunt Whistle", "LESSER", 2, [player("START_OF_COMBAT", summon("grunt_token"))], { factions: ["grunt"] }),
  relic("rider_pass", "Rider Pass", "LESSER", 0, [player("START_OF_COMBAT", buff(2, 0), { target: leftmost({ faction: "rider" }) })], { factions: ["rider"], series: R }),
  relic("shodophone", "Shodophone", "LESSER", 2, [player("START_OF_COMBAT", buff(1, 1), { condition: teamUp(3), target: allAllies({ faction: "sentai" }) })], { factions: ["sentai"] }),
  relic("armor_plating", "Armor Plating", "LESSER", 2, [player("START_OF_COMBAT", give("GUARD"), { target: leftmost() })], { factions: ["mecha"] }),
  relic("monster_cell", "Monster Cell", "LESSER", 2, [player("START_OF_COMBAT", buff(0, 2), { target: allAllies({ faction: "kaijin" }) })], { factions: ["kaijin"] }),
  relic("dark_contract", "Dark Contract", "LESSER", 1, [player("ON_ACQUIRE", energy(2))], { factions: ["dark_rider"] }),
  relic("lucky_charm", "Lucky Charm", "LESSER", 0, [player("ON_ACQUIRE", energy(1))]),
  // greater
  relic("prototype_driver", "Prototype Driver", "GREATER", 4, [player("START_OF_COMBAT", give("RIDER_KICK"), { target: allAllies({ faction: "rider" }) })], { factions: ["rider"] }),
  relic("mecha_gauge_core", "Mecha Gauge Core", "GREATER", 3, [player("ON_ACQUIRE", [gauge("mecha", 2), rule("giantEntryThreshold", "SET", 3)])], { factions: ["mecha", "sentai"] }),
  relic("team_spirit_banner", "Team Spirit Banner", "GREATER", 4, [player("ON_ACQUIRE", rule("rollCallColors", "SET", 4))], { factions: ["sentai"] }),
  relic("kaijin_cell", "Kaijin Cell", "GREATER", 3, [player("ON_ACQUIRE", rule("kyodaikaMultiplier", "SET", 3))], { factions: ["kaijin"] }),
  relic("dark_throne", "Dark Throne", "GREATER", 2, [player("START_OF_COMBAT", buff(3, 0), { target: allAllies({ faction: "dark_rider" }) })], { factions: ["dark_rider"] }),
  relic("universal_belt", "Universal Belt", "GREATER", 6, [player("ON_ACQUIRE", rule("freeRefreshesPerTurn", "SET", 2))]),
  relic("veteran_crest", "Veteran Crest", "GREATER", 0, [player("ON_ACQUIRE", buff(1, 1), { target: allAllies() })]),
];

const heroes = [
  hero("time_traveler", "Time Traveler", { power: { mode: "PASSIVE", effects: [player("ON_ACQUIRE", rule("freeRefreshesPerTurn", "SET", 1))] } }),
  hero("red_leader", "Red Leader", { power: { mode: "ACTIVE", cost: 2, effects: [player("ON_USE", buff(2, 2), { target: leftmost() })] } }),
  hero("professor_belt", "Professor Belt", { power: { mode: "ONCE", cost: 0, effects: [player("ON_USE", toHand("n2"))] } }),
  hero("mecha_commander", "Mecha Commander", { power: { mode: "PASSIVE", effects: [player("ON_ACQUIRE", rule("gattaiSize", "SET", 2))] } }),
  hero("kaijin_general", "Kaijin General", { power: { mode: "ACTIVE", cost: 1, effects: [player("ON_USE", give("KYODAIKA"), { target: leftmost() })] } }),
  hero("shocker_boss", "Shocker Boss", { power: { mode: "PASSIVE", effects: [player("ON_TURN_START", summon("grunt_token"))] } }),
  hero("cafe_master", "Cafe Master", { power: { mode: "ACTIVE", cost: 1, effects: [player("ON_USE", buff(1, 1), { target: allAllies({ faction: "ally" }) })] } }),
  hero("iron_guard", "Iron Guard", { armor: 6 }),
];

export const prototype: ContentSetData = withGeneratedText({ factions, series: [proSentai, proRider], cards, gauges, relics, heroes });

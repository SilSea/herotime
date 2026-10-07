import { describe, expect, it } from "vitest";
import { newPlayer } from "../shop/economy.js";
import { effect } from "../testing.js";
import { buildEnv } from "../testing-world.js";
import { runEffect } from "./effects.js";
import { prepareCombat } from "./session.js";

const grant = (atk = 4, hp = 4) => effect({ scope: "PLAYER", trigger: "ON_ACQUIRE", actions: [{ type: "SUPER_GATTAI", atk, hp }] });

describe("Super Gattai", () => {
  it("does nothing to the Giant until it is earned", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.giant = { key: "w_giant", golden: false };
    p.board = [{ key: "ranger_extra", golden: false }];
    expect(prepareCombat(p, env).extras.giant).toMatchObject({ atk: 7, hp: 9 });
  });

  it("once earned, needs an Extra Ranger on the board", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.giant = { key: "w_giant", golden: false };
    runEffect(grant(), null, p, env);
    p.board = [{ key: "ranger_red", golden: false }];
    expect(prepareCombat(p, env).extras.giant).toMatchObject({ atk: 7, hp: 9 });
  });

  it("with an Extra Ranger: the Giant gets the bonus and that Ranger's keywords, own and granted", () => {
    const env = buildEnv();
    const p = newPlayer();
    p.giant = { key: "w_giant", golden: false };
    runEffect(grant(), null, p, env);
    p.board = [{ key: "ranger_red", golden: false }, { key: "ranger_extra", golden: false, keywords: ["LETHAL"] }];
    const giant = prepareCombat(p, env).extras.giant;
    expect(giant).toMatchObject({ cardKey: "w_giant", atk: 11, hp: 13 });
    expect(giant?.keywords).toContain("LETHAL");
  });

  it("stacks when granted again", () => {
    const env = buildEnv();
    const p = newPlayer();
    runEffect(grant(4, 4), null, p, env);
    runEffect(grant(2, 3), null, p, env);
    expect(p.superGattai).toEqual({ atk: 6, hp: 7 });
  });
});

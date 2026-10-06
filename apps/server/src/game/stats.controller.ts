import { Controller, Get, Header, Inject, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/auth.controller.js";
import type { PublicUser } from "../auth/auth.service.js";
import { MATCH_REPOSITORY, type MatchRepository } from "../persistence/repositories.js";

/** A player needs this many ranked matches to appear on the leaderboard, so one lucky win does not top it. */
export const LEADERBOARD_MIN_GAMES = 3;

@Controller()
export class StatsController {
  constructor(@Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository) {}

  /** The caller's own recent matches, practice included. */
  @Get("me/matches")
  @UseGuards(JwtAuthGuard)
  async mine(@Req() req: Request & { user?: PublicUser }) {
    const me = (req.user as PublicUser).id;
    const rows = await this.matches.recentForUser(me, 20);
    return {
      matches: rows.map((m) => {
        const mine = m.players.find((p) => p.userId === me);
        return {
          matchId: m.matchId,
          mode: m.mode,
          endedAt: m.endedAt,
          contentVersion: m.contentVersion,
          placement: mine?.placement ?? null,
          heroKey: mine?.heroKey ?? null,
          // Other people are shown by name only: no ids leave the server.
          players: m.players.map((p) => ({ name: p.name, isBot: p.isBot, heroKey: p.heroKey, placement: p.placement, me: p.userId === me })),
        };
      }),
    };
  }

  /** Ranked (queue) matches only. Public: it shows usernames, which other players see in matches anyway. */
  @Get("leaderboard")
  @Header("Cache-Control", "no-cache")
  async leaderboard() {
    const rows = await this.matches.leaderboard(50, LEADERBOARD_MIN_GAMES);
    return {
      minGames: LEADERBOARD_MIN_GAMES,
      players: rows.map((r, i) => ({ rank: i + 1, username: r.username, games: r.games, wins: r.wins, top4: r.top4, avgPlacement: r.avgPlacement })),
    };
  }
}

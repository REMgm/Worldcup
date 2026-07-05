import type {
  Fixture,
  FixtureStatus,
  GroupStanding,
  OddsSnapshotRow,
  PlayerStats,
  ScorerRow,
  Stage,
  Team,
} from "@/lib/types";
import { TEAM_COLORS } from "@/lib/teamColors";
import type { FootballProvider } from "./types";

const BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_MAP: Record<string, FixtureStatus> = {
  SCHEDULED: "NS",
  TIMED: "NS",
  IN_PLAY: "LIVE",
  PAUSED: "HT",
  FINISHED: "FT",
  SUSPENDED: "LIVE",
  POSTPONED: "NS",
  CANCELLED: "NS",
  AWARDED: "FT",
};

const STAGE_MAP: Record<string, Stage> = {
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "3P",
  FINAL: "F",
};

/**
 * Fallback provider: football-data.org v4 (§3.3). Fixtures + standings
 * only; player stats and odds return empty so the UI degrades gracefully
 * (odds chips hidden, form-only cards). Enabled via PROVIDER=football-data.
 */
export class FootballDataProvider implements FootballProvider {
  readonly name = "football-data";
  private token: string;
  private requests = 0;
  private teams = new Map<number, Team>();

  constructor() {
    this.token = process.env.FOOTBALL_DATA_TOKEN ?? "";
  }

  configured(): boolean {
    return Boolean(this.token);
  }

  requestCount(): number {
    return this.requests;
  }

  drainTeams(): Team[] {
    const list = [...this.teams.values()];
    this.teams.clear();
    return list;
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.token) throw new Error("FOOTBALL_DATA_TOKEN is not set");
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    this.requests += 1;
    const res = await fetch(url, {
      headers: { "X-Auth-Token": this.token },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`football-data ${path} → HTTP ${res.status}`);
    return res.json();
  }

  private collectTeam(raw: any): number | null {
    const id = raw?.id;
    if (!id) return null;
    if (!this.teams.has(id)) {
      const code: string | null = raw.tla ?? null;
      const colors = code ? TEAM_COLORS[code] : undefined;
      this.teams.set(id, {
        id,
        name: raw.name ?? raw.shortName ?? "Unknown",
        code,
        flag_url: raw.crest ?? null,
        primary_color: colors?.primary ?? null,
        secondary_color: colors?.secondary ?? null,
      });
    }
    return id;
  }

  async getFixtures(opts: { from?: string; to?: string; live?: boolean }): Promise<Fixture[]> {
    const params: Record<string, string> = {};
    if (opts.from) params.dateFrom = opts.from;
    if (opts.to) params.dateTo = opts.to;
    const json = await this.get(`/competitions/${COMPETITION}/matches`, params);
    const fixtures: Fixture[] = [];
    for (const m of json?.matches ?? []) {
      const stage = STAGE_MAP[m.stage];
      if (!stage) continue; // knockout only
      const status = STATUS_MAP[m.status] ?? "NS";
      const pens = m.score?.penalties;
      fixtures.push({
        id: m.id,
        kickoff: m.utcDate,
        stage,
        status: pens?.home != null && status === "FT" ? "PEN" : status,
        home_team: this.collectTeam(m.homeTeam),
        away_team: this.collectTeam(m.awayTeam),
        home_score: m.score?.fullTime?.home ?? null,
        away_score: m.score?.fullTime?.away ?? null,
        penalties: pens?.home != null ? { home: pens.home, away: pens.away } : null,
        venue: m.venue ?? null,
        events: null, // not exposed on the free tier
        elapsed: m.minute != null ? Number(m.minute) || null : null,
      });
    }
    if (opts.live) return fixtures.filter((f) => f.status === "LIVE" || f.status === "HT");
    return fixtures;
  }

  async getStandings(): Promise<GroupStanding[]> {
    const json = await this.get(`/competitions/${COMPETITION}/standings`);
    return (json?.standings ?? [])
      .filter((s: any) => s.type === "TOTAL")
      .map((s: any) => ({
        group: s.group ?? "",
        rows: (s.table ?? []).map((r: any) => ({
          team: {
            id: r.team?.id,
            name: r.team?.name,
            code: r.team?.tla ?? null,
            flag_url: r.team?.crest ?? null,
            primary_color: null,
            secondary_color: null,
          },
          played: r.playedGames ?? 0,
          won: r.won ?? 0,
          drawn: r.draw ?? 0,
          lost: r.lost ?? 0,
          goal_diff: r.goalDifference ?? 0,
          points: r.points ?? 0,
        })),
      }));
  }

  // Not available on this provider — UI degrades gracefully (§3.3).
  async getPlayerStats(): Promise<PlayerStats | null> {
    return null;
  }

  async getTopScorers(): Promise<ScorerRow[]> {
    return [];
  }

  async getOdds(): Promise<OddsSnapshotRow[] | null> {
    return null;
  }
}

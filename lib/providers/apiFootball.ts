import type {
  Fixture,
  FixtureEvent,
  FixtureStatus,
  GroupStanding,
  OddsSnapshotRow,
  PlayerStats,
  ScorerRow,
  Stage,
  Team,
} from "@/lib/types";
import { impliedProbabilities } from "@/lib/odds";
import { codeForName, TEAM_COLORS } from "@/lib/teamColors";
import type { FootballProvider } from "./types";

const BASE = "https://v3.football.api-sports.io";

/* eslint-disable @typescript-eslint/no-explicit-any */

// API-Football short status → our five statuses (§5).
// "P" (shootout in progress) stays LIVE; "PEN" (decided on penalties) is terminal.
const STATUS_MAP: Record<string, FixtureStatus> = {
  TBD: "NS",
  NS: "NS",
  "1H": "LIVE",
  HT: "HT",
  "2H": "LIVE",
  ET: "LIVE",
  BT: "LIVE",
  P: "LIVE",
  LIVE: "LIVE",
  SUSP: "LIVE",
  INT: "LIVE",
  FT: "FT",
  AET: "FT",
  PEN: "PEN",
  PST: "NS",
  CANC: "NS",
  ABD: "NS",
  AWD: "FT",
  WO: "FT",
};

function mapStage(round: string | null | undefined): Stage | null {
  const r = (round ?? "").toLowerCase();
  if (r.includes("group") || r.includes("matchday")) return "GRP";
  if (r.includes("round of 32")) return "R32";
  if (r.includes("round of 16")) return "R16";
  if (r.includes("quarter")) return "QF";
  if (r.includes("semi")) return "SF";
  if (r.includes("third") || r.includes("3rd")) return "3P";
  if (r.includes("final")) return "F"; // checked after semi/third
  return null;
}

function mapEvents(raw: any[] | undefined): FixtureEvent[] | null {
  if (!raw?.length) return null;
  return raw.map((e) => ({
    minute: e?.time?.elapsed ?? 0,
    extra: e?.time?.extra ?? null,
    type: String(e?.type ?? "").toLowerCase() as FixtureEvent["type"],
    detail: e?.detail ?? "",
    team_id: e?.team?.id ?? 0,
    player: e?.player?.name ?? null,
    assist: e?.assist?.name ?? null,
  }));
}

export interface ApiFootballConfig {
  leagueId: number;
  season: number;
}

/**
 * Primary provider: API-Football v3 (§3.2). Server-side only, called from
 * cron routes. Every request is counted so the daily job can log quota use
 * against the 100 req/day free-tier budget.
 */
export class ApiFootballProvider implements FootballProvider {
  readonly name = "api-football";
  private key: string;
  private requests = 0;
  private teams = new Map<number, Team>();
  private cfg: ApiFootballConfig | null;

  constructor(cfg?: ApiFootballConfig | null) {
    this.key = process.env.API_FOOTBALL_KEY ?? "";
    this.cfg = cfg ?? null;
  }

  configured(): boolean {
    return Boolean(this.key);
  }

  requestCount(): number {
    return this.requests;
  }

  drainTeams(): Team[] {
    const list = [...this.teams.values()];
    this.teams.clear();
    return list;
  }

  private async get(path: string, params: Record<string, string | number | boolean>): Promise<any[]> {
    if (!this.key) throw new Error("API_FOOTBALL_KEY is not set");
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    this.requests += 1;
    const res = await fetch(url, {
      headers: { "x-apisports-key": this.key },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`api-football ${path} → HTTP ${res.status}`);
    const json = await res.json();
    const errors = json?.errors;
    if (errors && (Array.isArray(errors) ? errors.length : Object.keys(errors).length)) {
      throw new Error(`api-football ${path} → ${JSON.stringify(errors)}`);
    }
    return json?.response ?? [];
  }

  /**
   * Resolve the World Cup league + season dynamically (§3.2 "first task").
   * Never hardcoded — the caller pins the result into the Supabase `config`
   * table so this costs one request per deployment, not one per cron run.
   */
  async resolveLeague(seasonYear = 2026): Promise<ApiFootballConfig> {
    const leagues = await this.get("/leagues", { search: "world cup", type: "cup" });
    const hit = leagues.find(
      (l: any) =>
        /^world cup$/i.test(l?.league?.name ?? "") &&
        (l?.seasons ?? []).some((s: any) => s?.year === seasonYear),
    );
    if (!hit) throw new Error(`Could not resolve World Cup league for season ${seasonYear}`);
    this.cfg = { leagueId: hit.league.id, season: seasonYear };
    return this.cfg;
  }

  private league(): ApiFootballConfig {
    if (!this.cfg) throw new Error("League not resolved — call resolveLeague() or pass config");
    return this.cfg;
  }

  private collectTeam(raw: any): number | null {
    const id = raw?.id;
    if (!id) return null;
    if (!this.teams.has(id)) {
      // Fixture/topscorer responses have no `code` field — derive the trigram
      // from the name so colors and trigram displays work on the real API.
      const code: string | null = raw.code ?? codeForName(raw.name) ?? null;
      const colors = code ? TEAM_COLORS[code] : undefined;
      this.teams.set(id, {
        id,
        name: raw.name ?? "Unknown",
        code,
        flag_url: raw.logo ?? null,
        primary_color: colors?.primary ?? null,
        secondary_color: colors?.secondary ?? null,
      });
    }
    return id;
  }

  private mapFixture(raw: any): Fixture | null {
    const stage = mapStage(raw?.league?.round);
    if (!stage) return null; // group stage — out of scope for the knockout product
    return {
      id: raw.fixture.id,
      kickoff: raw.fixture.date,
      stage,
      status: STATUS_MAP[raw.fixture?.status?.short] ?? "NS",
      home_team: this.collectTeam(raw.teams?.home),
      away_team: this.collectTeam(raw.teams?.away),
      home_score: raw.goals?.home ?? null,
      away_score: raw.goals?.away ?? null,
      penalties:
        raw.score?.penalty?.home != null
          ? { home: raw.score.penalty.home, away: raw.score.penalty.away }
          : null,
      venue: raw.fixture?.venue?.name ?? null,
      events: mapEvents(raw.events),
      elapsed: raw.fixture?.status?.elapsed ?? null,
    };
  }

  async getFixtures(opts: { from?: string; to?: string; live?: boolean }): Promise<Fixture[]> {
    const { leagueId, season } = this.league();
    const params: Record<string, string | number> = { league: leagueId, season };
    if (opts.live) {
      const raw = await this.get("/fixtures", { live: "all", league: leagueId });
      return raw.map((r) => this.mapFixture(r)).filter((f): f is Fixture => f !== null);
    }
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    const raw = await this.get("/fixtures", params);
    return raw.map((r) => this.mapFixture(r)).filter((f): f is Fixture => f !== null);
  }

  /** Fixture detail + events, used on live ticks (§3.2). */
  async getFixtureById(id: number): Promise<Fixture | null> {
    const raw = await this.get("/fixtures", { id });
    if (!raw.length) return null;
    const item = raw[0];
    const fixture = this.mapFixture(item);
    if (fixture) fixture.events = mapEvents(item.events) ?? fixture.events;
    return fixture;
  }

  async getStandings(): Promise<GroupStanding[]> {
    const { leagueId, season } = this.league();
    const raw = await this.get("/standings", { league: leagueId, season });
    const groups: any[] = raw?.[0]?.league?.standings ?? [];
    return groups.map((rows: any[]) => ({
      group: rows[0]?.group ?? "",
      rows: rows.map((r: any) => ({
        team: {
          id: r.team?.id,
          name: r.team?.name,
          code: null,
          flag_url: r.team?.logo ?? null,
          primary_color: null,
          secondary_color: null,
        },
        played: r.all?.played ?? 0,
        won: r.all?.win ?? 0,
        drawn: r.all?.draw ?? 0,
        lost: r.all?.lose ?? 0,
        goal_diff: r.goalsDiff ?? 0,
        points: r.points ?? 0,
      })),
    }));
  }

  async getPlayerStats(playerId: number): Promise<PlayerStats | null> {
    const { season } = this.league();
    const raw = await this.get("/players", { id: playerId, season });
    const item = raw[0];
    if (!item) return null;
    const stats = item.statistics?.[0];
    return {
      player: {
        id: item.player.id,
        team_id: stats?.team?.id ?? null,
        name: item.player.name,
        position: stats?.games?.position ?? null,
        photo_url: item.player.photo ?? null,
        stylized_url: null,
      },
      goals: stats?.goals?.total ?? 0,
      assists: stats?.goals?.assists ?? 0,
      xg: stats?.expected?.goals != null ? Number(stats.expected.goals) : null,
      minutes: stats?.games?.minutes ?? 0,
      rating: stats?.games?.rating != null ? Number(stats.games.rating) : null,
    };
  }

  async getTopScorers(): Promise<ScorerRow[]> {
    const { leagueId, season } = this.league();
    const raw = await this.get("/players/topscorers", { league: leagueId, season });
    return raw.map((item: any) => {
      const stats = item.statistics?.[0];
      const teamId = this.collectTeam(stats?.team);
      return {
        player: {
          id: item.player.id,
          team_id: teamId,
          name: item.player.name,
          position: stats?.games?.position ?? null,
          photo_url: item.player.photo ?? null,
          stylized_url: null,
        },
        team: this.teams.get(teamId ?? -1) ?? {
          id: teamId ?? 0,
          name: stats?.team?.name ?? "",
          code: null,
          flag_url: stats?.team?.logo ?? null,
          primary_color: null,
          secondary_color: null,
        },
        goals: stats?.goals?.total ?? 0,
        assists: stats?.goals?.assists ?? null,
        xg: stats?.expected?.goals != null ? Number(stats.expected.goals) : null,
        minutes: stats?.games?.minutes ?? null,
        rating: stats?.games?.rating != null ? Number(stats.games.rating) : null,
      };
    });
  }

  async getOdds(fixtureId: number): Promise<OddsSnapshotRow[] | null> {
    const raw = await this.get("/odds", { fixture: fixtureId });
    const item = raw[0];
    if (!item) return null;
    const now = new Date().toISOString();
    const rows: OddsSnapshotRow[] = [];
    for (const bm of item.bookmakers ?? []) {
      for (const bet of bm.bets ?? []) {
        const name = String(bet.name ?? "").toLowerCase();
        let market: OddsSnapshotRow["market"] | null = null;
        if (name === "match winner") market = "match_winner";
        else if (name === "goals over/under") market = "total_goals";
        else if (name === "both teams score") market = "btts";
        if (!market) continue;
        let values: Record<string, number> = {};
        for (const v of bet.values ?? []) {
          const key = String(v.value ?? "").toLowerCase().replace(/[^a-z0-9.]+/g, "_");
          values[key] = Number(v.odd);
        }
        // The Over/Under bet carries every goal line in one array; only one
        // line is mutually exclusive, so normalize within the 2.5 pair —
        // normalizing across all lines deflates every probability 4–6x.
        if (market === "total_goals") {
          const pair: Record<string, number> = {};
          if (values["over_2.5"] != null) pair["over_2.5"] = values["over_2.5"];
          if (values["under_2.5"] != null) pair["under_2.5"] = values["under_2.5"];
          if (Object.keys(pair).length < 2) continue;
          values = pair;
        }
        rows.push({
          fixture_id: fixtureId,
          captured_at: now,
          bookmaker: bm.name ?? null,
          market,
          values: impliedProbabilities(values),
        });
      }
      if (rows.length) break; // one bookmaker per snapshot is enough for editorial context
    }
    return rows.length ? rows : null;
  }

  /** Squads + licensed photos, fetched once per team and cached (§3.2). */
  async getSquad(teamId: number): Promise<{ id: number; name: string; position: string | null; photo_url: string | null }[]> {
    const raw = await this.get("/players/squads", { team: teamId });
    const players = raw?.[0]?.players ?? [];
    return players.map((p: any) => ({
      id: p.id,
      name: p.name,
      position: p.position ?? null,
      photo_url: p.photo ?? null,
    }));
  }
}

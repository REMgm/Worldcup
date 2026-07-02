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
import { americanToDecimal, impliedProbabilities } from "@/lib/odds";
import { TEAM_COLORS } from "@/lib/teamColors";
import type { FootballProvider } from "./types";

const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const CORE = "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world";

/* eslint-disable @typescript-eslint/no-explicit-any */

// 2026 calendar fallback for stage classification when the feed carries no
// round note. Group stage Jun 11–27, R32 Jun 28–Jul 3, R16 Jul 4–8,
// QF Jul 9–13, SF Jul 14–17, third place Jul 18, final Jul 19 (UTC dates).
const STAGE_WINDOWS: Array<[string, string, Stage]> = [
  ["2026-06-28", "2026-07-03", "R32"],
  ["2026-07-04", "2026-07-08", "R16"],
  ["2026-07-09", "2026-07-13", "QF"],
  ["2026-07-14", "2026-07-17", "SF"],
  ["2026-07-18", "2026-07-18", "3P"],
  ["2026-07-19", "2026-07-20", "F"],
];

function stageFromText(text: string): Stage | null {
  const r = text.toLowerCase();
  if (r.includes("round of 32")) return "R32";
  if (r.includes("round of 16")) return "R16";
  if (r.includes("quarter")) return "QF";
  if (r.includes("semi")) return "SF";
  if (r.includes("third") || r.includes("3rd")) return "3P";
  if (r.includes("final")) return "F";
  return null;
}

function stageFromDate(iso: string): Stage | null {
  const day = iso.slice(0, 10);
  for (const [from, to, stage] of STAGE_WINDOWS) {
    if (day >= from && day <= to) return stage;
  }
  return null; // group stage or outside the tournament — out of scope
}

function mapStatus(type: any): FixtureStatus {
  const name = String(type?.name ?? "");
  const state = String(type?.state ?? "");
  if (name === "STATUS_HALFTIME") return "HT";
  if (name === "STATUS_FINAL_PEN") return "PEN";
  if (state === "in") return "LIVE";
  if (state === "post") return "FT";
  return "NS";
}

function parseClock(display: unknown): number | null {
  const m = /^(\d+)/.exec(String(display ?? ""));
  return m ? Number(m[1]) : null;
}

function ymdCompact(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Keyless provider: ESPN's unofficial World Cup feed. Near real-time, no
 * API key, which makes it the default when no API-Football key is set.
 * Undocumented upstream — every field access is defensive, and any gap
 * degrades to the demo dataset rather than an error page. Cache-first
 * still applies: only cron routes call this.
 */
export class EspnProvider implements FootballProvider {
  readonly name = "espn";
  private requests = 0;
  private teams = new Map<number, Team>();

  configured(): boolean {
    return true; // keyless
  }

  requestCount(): number {
    return this.requests;
  }

  drainTeams(): Team[] {
    const list = [...this.teams.values()];
    this.teams.clear();
    return list;
  }

  private async get(url: string): Promise<any> {
    this.requests += 1;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`espn ${url} → HTTP ${res.status}`);
    return res.json();
  }

  private collectTeam(raw: any): number | null {
    const id = Number(raw?.id);
    if (!id) return null;
    if (!this.teams.has(id)) {
      const code: string | null = raw.abbreviation ?? null;
      const colors = code ? TEAM_COLORS[code] : undefined;
      this.teams.set(id, {
        id,
        name: raw.displayName ?? raw.name ?? raw.shortDisplayName ?? "Unknown",
        code,
        flag_url: raw.flag?.href ?? raw.logo ?? null,
        primary_color: colors?.primary ?? null,
        secondary_color: colors?.secondary ?? null,
      });
    }
    return id;
  }

  private mapEvents(comp: any, homeId: number | null, awayId: number | null): FixtureEvent[] | null {
    const details: any[] = comp?.details ?? [];
    if (!details.length) return null;
    const events: FixtureEvent[] = [];
    for (const d of details) {
      const text = String(d?.type?.text ?? "");
      let type: FixtureEvent["type"] | null = null;
      let detail = text;
      if (d?.scoringPlay || /goal/i.test(text)) {
        type = "goal";
        if (d?.penaltyKick) detail = "Penalty";
        else if (d?.ownGoal) detail = "Own Goal";
        else if (!detail) detail = "Goal";
      } else if (d?.redCard || /red card/i.test(text)) {
        type = "card";
        detail = "Red Card";
      } else if (d?.yellowCard || /yellow card/i.test(text)) {
        type = "card";
        detail = "Yellow Card";
      } else if (/substitution/i.test(text)) {
        type = "subst";
      }
      if (!type) continue;
      const teamId = Number(d?.team?.id) || 0;
      events.push({
        minute: parseClock(d?.clock?.displayValue) ?? Math.round((d?.clock?.value ?? 0) / 60),
        type,
        detail,
        team_id: teamId === awayId ? (awayId ?? 0) : teamId === homeId ? (homeId ?? 0) : teamId,
        player: d?.athletesInvolved?.[0]?.displayName ?? null,
      });
    }
    return events.length ? events : null;
  }

  private mapEvent(event: any): Fixture | null {
    const comp = event?.competitions?.[0];
    if (!comp || !event?.id) return null;

    const noteText = [
      comp?.notes?.map((n: any) => n?.headline).join(" "),
      event?.season?.slug,
      comp?.type?.text,
    ]
      .filter(Boolean)
      .join(" ");
    const stage = stageFromText(noteText) ?? stageFromDate(String(event.date ?? ""));
    if (!stage) return null; // group stage / unknown — knockout product only

    const competitors: any[] = comp?.competitors ?? [];
    const home = competitors.find((c) => c?.homeAway === "home") ?? competitors[0];
    const away = competitors.find((c) => c?.homeAway === "away") ?? competitors[1];
    const homeId = this.collectTeam(home?.team);
    const awayId = this.collectTeam(away?.team);

    const statusType = comp?.status?.type ?? event?.status?.type;
    let status = mapStatus(statusType);
    const homeShootout = home?.shootoutScore != null ? Number(home.shootoutScore) : null;
    const awayShootout = away?.shootoutScore != null ? Number(away.shootoutScore) : null;
    if (status === "FT" && homeShootout != null && awayShootout != null) status = "PEN";

    const score = (c: any) =>
      c?.score != null && c.score !== "" ? Number(c.score) : null;

    return {
      id: Number(event.id),
      kickoff: new Date(event.date ?? comp.date).toISOString(),
      stage,
      status,
      home_team: homeId,
      away_team: awayId,
      home_score: score(home),
      away_score: score(away),
      penalties:
        homeShootout != null && awayShootout != null
          ? { home: homeShootout, away: awayShootout }
          : null,
      venue: comp?.venue?.fullName
        ? [comp.venue.fullName, comp.venue.address?.city].filter(Boolean).join(", ")
        : null,
      events: this.mapEvents(comp, homeId, awayId),
      elapsed:
        status === "LIVE" || status === "HT"
          ? parseClock(comp?.status?.displayClock ?? event?.status?.displayClock)
          : null,
    };
  }

  async getFixtures(opts: { from?: string; to?: string; live?: boolean }): Promise<Fixture[]> {
    let url = `${SITE}/scoreboard?limit=300`;
    if (!opts.live && (opts.from || opts.to)) {
      const from = opts.from ? opts.from.replace(/-/g, "") : ymdCompact(new Date());
      const to = opts.to ? opts.to.replace(/-/g, "") : from;
      url += `&dates=${from}-${to}`;
    }
    const json = await this.get(url);
    const fixtures = (json?.events ?? [])
      .map((e: any) => this.mapEvent(e))
      .filter((f: Fixture | null): f is Fixture => f !== null);
    if (opts.live) {
      return fixtures.filter((f: Fixture) => f.status === "LIVE" || f.status === "HT");
    }
    return fixtures;
  }

  async getStandings(): Promise<GroupStanding[]> {
    try {
      const json = await this.get(`${SITE}/standings`);
      const children: any[] = json?.children ?? [];
      return children
        .map((g: any) => ({
          group: g?.name ?? g?.abbreviation ?? "",
          rows: (g?.standings?.entries ?? []).map((e: any) => {
            const stat = (n: string) =>
              Number(e?.stats?.find((s: any) => s?.name === n)?.value ?? 0);
            return {
              team: {
                id: Number(e?.team?.id) || 0,
                name: e?.team?.displayName ?? "",
                code: e?.team?.abbreviation ?? null,
                flag_url: e?.team?.logos?.[0]?.href ?? null,
                primary_color: null,
                secondary_color: null,
              },
              played: stat("gamesPlayed"),
              won: stat("wins"),
              drawn: stat("ties"),
              lost: stat("losses"),
              goal_diff: stat("pointDifferential") || stat("goalDifferential"),
              points: stat("points"),
            };
          }),
        }))
        .filter((g) => g.rows.length);
    } catch {
      return []; // context-only data — degrade silently
    }
  }

  // Not exposed by this feed in a stable way — the UI degrades to
  // form-only cards, same as the football-data fallback (§3.3).
  async getPlayerStats(): Promise<PlayerStats | null> {
    return null;
  }

  async getTopScorers(): Promise<ScorerRow[]> {
    return [];
  }

  async getOdds(fixtureId: number): Promise<OddsSnapshotRow[] | null> {
    try {
      const json = await this.get(
        `${CORE}/events/${fixtureId}/competitions/${fixtureId}/odds`,
      );
      const item = (json?.items ?? [])[0];
      if (!item) return null;
      const rows: OddsSnapshotRow[] = [];
      const now = new Date().toISOString();
      const bookmaker = item?.provider?.name ?? "ESPN consensus";

      const decimals: Record<string, number> = {};
      const entries: Array<[string, any]> = [
        ["home", item?.homeTeamOdds],
        ["away", item?.awayTeamOdds],
        ["draw", item?.drawOdds],
      ];
      for (const [key, side] of entries) {
        const ml = Number(side?.moneyLine ?? side?.moneyline ?? NaN);
        const dec = americanToDecimal(ml);
        if (dec) decimals[key] = dec;
      }
      if (Object.keys(decimals).length >= 2) {
        rows.push({
          fixture_id: fixtureId,
          captured_at: now,
          bookmaker,
          market: "match_winner",
          values: impliedProbabilities(decimals),
        });
      }

      const over = americanToDecimal(Number(item?.overOdds ?? NaN));
      const under = americanToDecimal(Number(item?.underOdds ?? NaN));
      const line = item?.overUnder;
      if (over && under && line != null) {
        const probs = impliedProbabilities({ over, under });
        rows.push({
          fixture_id: fixtureId,
          captured_at: now,
          bookmaker,
          market: "total_goals",
          values: {
            [`over_${line}`]: probs.over ?? 0,
            [`under_${line}`]: probs.under ?? 0,
          },
        });
      }
      return rows.length ? rows : null;
    } catch {
      return null; // odds are garnish — never fail the cron over them
    }
  }
}

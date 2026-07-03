import type { FixtureWithTeams, Stage } from "@/lib/types";

/** One entry per game played — the team's tournament journey in order. */
export interface JourneyEntry {
  stage: Stage;
  opponentCode: string | null;
  opponentName: string | null;
  gf: number;
  ga: number;
  outcome: "W" | "D" | "L";
  /** Set when the tie was decided on penalties. */
  pens?: "W" | "L";
}

/**
 * Tournament stat sheet for one team, computed deterministically from the
 * cached fixtures + event timelines — the same data the compounding loop
 * learns from. Everything here is real cache output, nothing invented.
 */
export interface TeamTournamentStats {
  played: number;
  wins: number;
  goalsFor: number;
  goalsAgainst: number;
  topScorer: { name: string; goals: number } | null;
  assistsLeader: { name: string; assists: number } | null;
  /** Quickest goal the team has scored, in match minutes. */
  fastestGoal: { minute: number; player: string | null } | null;
  /** Average minute of the team's opening goal — "how fast they score". */
  avgFirstGoalMinute: number | null;
  yellows: number;
  reds: number;
  shootoutWins: number;
  /** Chronological results, group stage included — the context trail. */
  journey: JourneyEntry[];
}

export function teamTournamentStats(
  fixtures: FixtureWithTeams[],
  teamId: number,
): TeamTournamentStats {
  const stats: TeamTournamentStats = {
    played: 0,
    wins: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    topScorer: null,
    assistsLeader: null,
    fastestGoal: null,
    avgFirstGoalMinute: null,
    yellows: 0,
    reds: 0,
    shootoutWins: 0,
    journey: [],
  };
  const scorers = new Map<string, number>();
  const assisters = new Map<string, number>();
  const firstGoalMinutes: number[] = [];

  const played = fixtures
    .filter(
      (f) =>
        (f.status === "FT" || f.status === "PEN") &&
        (f.home_team === teamId || f.away_team === teamId),
    )
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  for (const f of played) {
    const isHome = f.home_team === teamId;

    stats.played += 1;
    stats.goalsFor += (isHome ? f.home_score : f.away_score) ?? 0;
    stats.goalsAgainst += (isHome ? f.away_score : f.home_score) ?? 0;

    const gf = (isHome ? f.home_score : f.away_score) ?? 0;
    const ga = (isHome ? f.away_score : f.home_score) ?? 0;
    if (gf > ga) stats.wins += 1;
    let pens: "W" | "L" | undefined;
    if (f.penalties) {
      const won = isHome
        ? f.penalties.home > f.penalties.away
        : f.penalties.away > f.penalties.home;
      pens = won ? "W" : "L";
      if (won) {
        stats.shootoutWins += 1;
        if (gf === ga) stats.wins += 1;
      }
    }

    const opponent = isHome ? f.away : f.home;
    stats.journey.push({
      stage: f.stage,
      opponentCode: opponent?.code ?? null,
      opponentName: opponent?.name ?? null,
      gf,
      ga,
      outcome: gf > ga || pens === "W" ? "W" : gf < ga || pens === "L" ? "L" : "D",
      pens,
    });

    let firstGoal: number | null = null;
    for (const ev of f.events ?? []) {
      if (ev.team_id !== teamId) continue;
      if (ev.type === "goal") {
        if (ev.player) scorers.set(ev.player, (scorers.get(ev.player) ?? 0) + 1);
        if (ev.assist) assisters.set(ev.assist, (assisters.get(ev.assist) ?? 0) + 1);
        if (firstGoal === null || ev.minute < firstGoal) firstGoal = ev.minute;
        if (!stats.fastestGoal || ev.minute < stats.fastestGoal.minute) {
          stats.fastestGoal = { minute: ev.minute, player: ev.player };
        }
      } else if (ev.type === "card") {
        if (/red/i.test(ev.detail)) stats.reds += 1;
        else stats.yellows += 1;
      }
    }
    if (firstGoal !== null) firstGoalMinutes.push(firstGoal);
  }

  const best = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestScorer = best(scorers);
  if (bestScorer) stats.topScorer = { name: bestScorer[0], goals: bestScorer[1] };
  const bestAssister = best(assisters);
  if (bestAssister) {
    stats.assistsLeader = { name: bestAssister[0], assists: bestAssister[1] };
  }
  if (firstGoalMinutes.length) {
    stats.avgFirstGoalMinute = Math.round(
      firstGoalMinutes.reduce((a, b) => a + b, 0) / firstGoalMinutes.length,
    );
  }
  return stats;
}

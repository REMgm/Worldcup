import type { FixtureWithTeams } from "@/lib/types";

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
  };
  const scorers = new Map<string, number>();
  const assisters = new Map<string, number>();
  const firstGoalMinutes: number[] = [];

  for (const f of fixtures) {
    const decided = f.status === "FT" || f.status === "PEN";
    const involved = f.home_team === teamId || f.away_team === teamId;
    if (!decided || !involved) continue;
    const isHome = f.home_team === teamId;

    stats.played += 1;
    stats.goalsFor += (isHome ? f.home_score : f.away_score) ?? 0;
    stats.goalsAgainst += (isHome ? f.away_score : f.home_score) ?? 0;

    const gf = (isHome ? f.home_score : f.away_score) ?? 0;
    const ga = (isHome ? f.away_score : f.home_score) ?? 0;
    if (gf > ga) stats.wins += 1;
    if (f.penalties) {
      const won = isHome
        ? f.penalties.home > f.penalties.away
        : f.penalties.away > f.penalties.home;
      if (won) {
        stats.shootoutWins += 1;
        if (gf === ga) stats.wins += 1;
      }
    }

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

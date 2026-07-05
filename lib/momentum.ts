import type { FixtureWithTeams } from "@/lib/types";

/**
 * Momentum score for a fixture, -1 (fully home) … +1 (fully away).
 * Weighted from events inside the last 15 live minutes plus an optional
 * odds delta (positive = market moving toward the away side). Drives the
 * MatchCard color edge (§7 catalog).
 */
export function momentumScore(
  fixture: FixtureWithTeams,
  oddsDelta = 0,
): number {
  let score = oddsDelta;
  const elapsed = fixture.elapsed ?? (fixture.status === "FT" || fixture.status === "PEN" ? 90 : 0);
  const windowStart = Math.max(0, elapsed - 15);

  for (const ev of fixture.events ?? []) {
    if (ev.minute < windowStart) continue;
    const toward = ev.team_id === fixture.away_team ? 1 : -1;
    if (ev.type === "goal") score += 0.5 * toward;
    else if (ev.type === "card" && /red/i.test(ev.detail)) score -= 0.35 * toward;
    else if (ev.type === "card") score -= 0.1 * toward;
  }

  return Math.max(-1, Math.min(1, score));
}

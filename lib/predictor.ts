import type { FixtureWithTeams, OddsSnapshotRow } from "@/lib/types";

/**
 * Compounding intelligence loop — the Signalroom prediction engine.
 *
 * Every finished match in the cache updates an Elo-style team rating
 * (margin-of-victory weighted, penalty wins count as narrow). Ratings feed
 * the next round's win chances, which are anchored against the live market
 * when odds snapshots exist. As the ingest loop lands each new result, the
 * ratings — and therefore every downstream prediction — compound.
 *
 * Deterministic, no LLM in the hot path (§5 discipline): the same cache
 * always yields the same percentages.
 */

const BASE_RATING = 1500;
const K = 64; // high K — a short tournament needs fast learning
const SCALE = 400;
const MARKET_WEIGHT = 0.65; // odds anchor when the market has spoken

/** Chance for each side to win the tie (draw mass resolved — knockout). */
export interface WinChance {
  home: number;
  away: number;
}

function expected(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / SCALE));
}

/**
 * Fold every decided fixture, in kickoff order, into team ratings.
 * This is the "learning" half of the loop.
 */
export function eloRatings(fixtures: FixtureWithTeams[]): Map<number, number> {
  const ratings = new Map<number, number>();
  const get = (id: number) => ratings.get(id) ?? BASE_RATING;

  const decided = fixtures
    .filter(
      (f) =>
        (f.status === "FT" || f.status === "PEN") &&
        f.home_team != null &&
        f.away_team != null,
    )
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  for (const f of decided) {
    const home = f.home_team!;
    const away = f.away_team!;
    const ra = get(home);
    const rb = get(away);
    const ea = expected(ra, rb);

    const h = f.home_score ?? 0;
    const a = f.away_score ?? 0;
    let actual: number;
    if (h > a) actual = 1;
    else if (h < a) actual = 0;
    else if (f.penalties) {
      // shootout wins carry less signal than a win in play
      actual = f.penalties.home > f.penalties.away ? 0.75 : 0.25;
    } else {
      actual = 0.5;
    }

    const marginMultiplier = Math.log(Math.abs(h - a) + 1) + 1; // 1 … ~2.6
    const delta = K * marginMultiplier * (actual - ea);
    ratings.set(home, ra + delta);
    ratings.set(away, rb - delta);
  }

  return ratings;
}

/**
 * The "prediction" half of the loop: rating expectation blended with the
 * latest market-implied probability (draw mass split — a knockout tie must
 * resolve). Clamped so no side ever reads as a certainty.
 */
export function predictFixture(
  fixture: FixtureWithTeams,
  ratings: Map<number, number>,
  latestOdds: OddsSnapshotRow | null,
): WinChance | null {
  if (fixture.home_team == null || fixture.away_team == null) return null;

  const ra = ratings.get(fixture.home_team) ?? BASE_RATING;
  const rb = ratings.get(fixture.away_team) ?? BASE_RATING;
  const pElo = expected(ra, rb);

  let p = pElo;
  if (latestOdds?.market === "match_winner") {
    const draw = latestOdds.values.draw ?? 0;
    const mh = (latestOdds.values.home ?? 0) + draw / 2;
    const ma = (latestOdds.values.away ?? 0) + draw / 2;
    const total = mh + ma;
    if (total > 0) {
      p = MARKET_WEIGHT * (mh / total) + (1 - MARKET_WEIGHT) * pElo;
    }
  }

  p = Math.min(0.95, Math.max(0.05, p));
  return { home: p, away: 1 - p };
}

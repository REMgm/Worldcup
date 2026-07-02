import type {
  Fixture,
  GroupStanding,
  OddsSnapshotRow,
  PlayerStats,
  ScorerRow,
  Team,
} from "@/lib/types";

/**
 * Single provider interface (§3.1). Every provider implements this so the
 * fallback is a config switch (`PROVIDER=football-data`), not a refactor.
 */
export interface FootballProvider {
  readonly name: string;
  getFixtures(opts: { from?: string; to?: string; live?: boolean }): Promise<Fixture[]>;
  getStandings(): Promise<GroupStanding[]>; // historical/group context only
  getPlayerStats(playerId: number): Promise<PlayerStats | null>;
  getTopScorers(): Promise<ScorerRow[]>;
  getOdds(fixtureId: number): Promise<OddsSnapshotRow[] | null>;
  /** Teams referenced by the fixtures fetched so far (for upserts). */
  drainTeams(): Team[];
  /** Provider API requests made during this instance's lifetime (quota log). */
  requestCount(): number;
}

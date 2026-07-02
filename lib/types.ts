// Shared domain types. Mirrors the Supabase schema (§5 of the build spec)
// and the provider interface (§3).

export type Stage = "R32" | "R16" | "QF" | "SF" | "3P" | "F";

export type FixtureStatus = "NS" | "LIVE" | "HT" | "FT" | "PEN";

export interface Team {
  id: number;
  name: string;
  code: string | null; // FIFA trigram
  flag_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface FixtureEvent {
  minute: number;
  extra?: number | null;
  type: "goal" | "card" | "subst" | "var";
  detail: string; // "Normal Goal", "Penalty", "Yellow Card", ...
  team_id: number;
  player: string | null;
  assist?: string | null;
}

export interface Fixture {
  id: number;
  kickoff: string; // ISO timestamp
  stage: Stage;
  status: FixtureStatus;
  home_team: number | null; // null until bracket slot resolves
  away_team: number | null;
  home_score: number | null;
  away_score: number | null;
  penalties: { home: number; away: number } | null;
  venue: string | null;
  events: FixtureEvent[] | null;
  elapsed?: number | null; // live match minute
  updated_at?: string;
}

export interface FixtureWithTeams extends Fixture {
  home: Team | null;
  away: Team | null;
}

export interface Player {
  id: number;
  team_id: number | null;
  name: string;
  position: string | null;
  photo_url: string | null; // provider-licensed photo
  stylized_url: string | null; // Higgsfield caricature treatment
}

export interface FormSnapshot {
  player_id: number;
  snapshot_date: string; // YYYY-MM-DD
  goals: number | null;
  assists: number | null;
  xg: number | null;
  minutes: number | null;
  rating: number | null;
  form_delta: number | null; // rating delta vs previous snapshot
}

export interface PlayerWithForm extends Player {
  team: Team | null;
  form: FormSnapshot[]; // ascending by date, last 5 snapshots
}

/** Normalized odds for one market at one point in time. Implied
 *  probabilities (0–1), overround removed, editorial use only. */
export interface OddsSnapshotRow {
  id?: number;
  fixture_id: number;
  captured_at: string;
  bookmaker: string | null;
  market: "match_winner" | "total_goals" | "btts";
  values: Record<string, number>;
}

export type TakeConfidence = "certain" | "likely" | "spicy";

export interface HotTake {
  id: number;
  fixture_id: number | null;
  headline: string;
  body: string;
  confidence: TakeConfidence;
  revealed_stat: {
    label: string;
    value: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  } | null;
  created_at?: string;
}

// ---- Provider-facing aggregates (§3.1) ----

export interface GroupStandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goal_diff: number;
  points: number;
}

export interface GroupStanding {
  group: string;
  rows: GroupStandingRow[];
}

export interface PlayerStats {
  player: Player;
  goals: number;
  assists: number;
  xg: number | null;
  minutes: number;
  rating: number | null;
}

export interface ScorerRow {
  player: Player;
  team: Team;
  goals: number;
  assists: number | null;
  xg: number | null;
  minutes: number | null;
  rating: number | null;
}

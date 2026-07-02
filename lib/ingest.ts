import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTakes } from "@/lib/takesEngine";
import type {
  Fixture,
  FixtureWithTeams,
  FormSnapshot,
  OddsSnapshotRow,
  Player,
  PlayerWithForm,
  ScorerRow,
  Team,
} from "@/lib/types";

/** Write-side helpers shared by the cron routes. Service-role client only. */

export function fixtureRow(f: Fixture) {
  return {
    id: f.id,
    kickoff: f.kickoff,
    stage: f.stage,
    status: f.status,
    home_team: f.home_team,
    away_team: f.away_team,
    home_score: f.home_score,
    away_score: f.away_score,
    penalties: f.penalties,
    venue: f.venue,
    events: f.events,
    elapsed: f.elapsed ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertTeams(sb: SupabaseClient, teams: Team[]): Promise<number> {
  if (!teams.length) return 0;
  const { error } = await sb.from("teams").upsert(teams);
  if (error) throw new Error(`teams upsert: ${error.message}`);
  return teams.length;
}

export async function upsertFixtures(sb: SupabaseClient, fixtures: Fixture[]): Promise<number> {
  if (!fixtures.length) return 0;
  const { error } = await sb.from("fixtures").upsert(fixtures.map(fixtureRow));
  if (error) throw new Error(`fixtures upsert: ${error.message}`);
  return fixtures.length;
}

/** Daily scorer snapshot → players + player_form, with form_delta computed
 *  against each player's previous snapshot (§5). */
export async function snapshotScorers(
  sb: SupabaseClient,
  scorers: ScorerRow[],
): Promise<number> {
  if (!scorers.length) return 0;
  const players: Player[] = scorers.map((s) => s.player);
  const { error: pErr } = await sb.from("players").upsert(
    players.map((p) => ({
      id: p.id,
      team_id: p.team_id,
      name: p.name,
      position: p.position,
      photo_url: p.photo_url,
    })),
  );
  if (pErr) throw new Error(`players upsert: ${pErr.message}`);

  const ids = players.map((p) => p.id);
  const { data: prevRows } = await sb
    .from("player_form")
    .select("player_id, rating, snapshot_date")
    .in("player_id", ids)
    .order("snapshot_date", { ascending: false });
  const prevRating = new Map<number, number>();
  for (const row of prevRows ?? []) {
    if (!prevRating.has(row.player_id) && row.rating != null) {
      prevRating.set(row.player_id, Number(row.rating));
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const snapshots = scorers.map((s) => ({
    player_id: s.player.id,
    snapshot_date: today,
    goals: s.goals,
    assists: s.assists,
    xg: s.xg,
    minutes: s.minutes,
    rating: s.rating,
    form_delta:
      s.rating != null && prevRating.has(s.player.id)
        ? Number((s.rating - prevRating.get(s.player.id)!).toFixed(2))
        : 0,
  }));
  const { error } = await sb
    .from("player_form")
    .upsert(snapshots, { onConflict: "player_id,snapshot_date" });
  if (error) throw new Error(`player_form upsert: ${error.message}`);
  return snapshots.length;
}

export async function storeOdds(
  sb: SupabaseClient,
  rows: OddsSnapshotRow[],
): Promise<number> {
  if (!rows.length) return 0;
  // Append-only (§4): every snapshot is kept so odds movement can be charted.
  const { error } = await sb.from("odds_snapshots").insert(
    rows.map((r) => ({
      fixture_id: r.fixture_id,
      captured_at: r.captured_at,
      bookmaker: r.bookmaker,
      market: r.market,
      values: r.values,
    })),
  );
  if (error) throw new Error(`odds insert: ${error.message}`);
  return rows.length;
}

const HOUR = 3_600_000;

/** Re-run the deterministic rules engine over the cached window and store
 *  fixture-bound takes. No provider calls — Supabase reads only. */
export async function generateAndStoreTakes(sb: SupabaseClient): Promise<number> {
  const now = Date.now();
  const [fx, tm] = await Promise.all([
    sb
      .from("fixtures")
      .select("*")
      .gte("kickoff", new Date(now - 4 * HOUR).toISOString())
      .lte("kickoff", new Date(now + 48 * HOUR).toISOString()),
    sb.from("teams").select("*"),
  ]);
  const teams = new Map(((tm.data ?? []) as Team[]).map((t) => [t.id, t]));
  const fixtures: FixtureWithTeams[] = ((fx.data ?? []) as Fixture[]).map((f) => ({
    ...f,
    home: f.home_team != null ? (teams.get(f.home_team) ?? null) : null,
    away: f.away_team != null ? (teams.get(f.away_team) ?? null) : null,
  }));
  if (!fixtures.length) return 0;

  const { data: oddsRows } = await sb
    .from("odds_snapshots")
    .select("*")
    .in("fixture_id", fixtures.map((f) => f.id))
    .gte("captured_at", new Date(now - 48 * HOUR).toISOString())
    .order("captured_at", { ascending: true });
  const oddsByFixture = new Map<number, OddsSnapshotRow[]>();
  for (const row of (oddsRows ?? []) as OddsSnapshotRow[]) {
    const list = oddsByFixture.get(row.fixture_id) ?? [];
    list.push(row);
    oddsByFixture.set(row.fixture_id, list);
  }

  const [{ data: playerRows }, { data: formRows }] = await Promise.all([
    sb.from("players").select("*"),
    sb.from("player_form").select("*").order("snapshot_date", { ascending: true }),
  ]);
  const formByPlayer = new Map<number, FormSnapshot[]>();
  for (const row of (formRows ?? []) as FormSnapshot[]) {
    const list = formByPlayer.get(row.player_id) ?? [];
    list.push(row);
    formByPlayer.set(row.player_id, list);
  }
  const players: PlayerWithForm[] = ((playerRows ?? []) as Player[]).map((p) => ({
    ...p,
    team: p.team_id != null ? (teams.get(p.team_id) ?? null) : null,
    form: (formByPlayer.get(p.id) ?? []).slice(-5),
  }));

  const takes = generateTakes({ fixtures, oddsByFixture, players }).filter(
    (t) => t.fixture_id != null,
  );
  if (!takes.length) return 0;
  const { error } = await sb
    .from("hot_takes")
    .upsert(takes, { onConflict: "fixture_id,headline" });
  if (error) throw new Error(`hot_takes upsert: ${error.message}`);
  return takes.length;
}

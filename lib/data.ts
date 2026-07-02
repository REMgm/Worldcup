import { demoFixtures, demoOdds, demoPlayers, demoTeams } from "@/lib/demo";
import { supabaseAnon } from "@/lib/supabase";
import { generateTakes } from "@/lib/takesEngine";
import type {
  Fixture,
  FixtureWithTeams,
  FormSnapshot,
  HotTake,
  OddsSnapshotRow,
  Player,
  PlayerWithForm,
  Team,
} from "@/lib/types";

/**
 * Read layer (§4 "client reads"): server components call these functions,
 * which query Supabase — never a football provider. When Supabase is not
 * configured (or the cache is empty because crons haven't run), everything
 * falls back to the bundled demo dataset so the product stays browsable.
 */

const HOUR = 3_600_000;

function joinTeams(fixtures: Fixture[], teams: Team[]): FixtureWithTeams[] {
  const byId = new Map(teams.map((t) => [t.id, t]));
  return fixtures.map((f) => ({
    ...f,
    home: f.home_team != null ? (byId.get(f.home_team) ?? null) : null,
    away: f.away_team != null ? (byId.get(f.away_team) ?? null) : null,
  }));
}

/** True when the page is rendering from the bundled demo dataset. */
export async function isDemoData(): Promise<boolean> {
  const sb = supabaseAnon();
  if (!sb) return true;
  const { count, error } = await sb
    .from("fixtures")
    .select("id", { count: "exact", head: true });
  return Boolean(error) || !count;
}

export async function getFixtures(): Promise<FixtureWithTeams[]> {
  const sb = supabaseAnon();
  if (sb) {
    const [fx, tm] = await Promise.all([
      sb.from("fixtures").select("*").order("kickoff", { ascending: true }),
      sb.from("teams").select("*"),
    ]);
    if (!fx.error && !tm.error && fx.data?.length) {
      return joinTeams(fx.data as Fixture[], (tm.data ?? []) as Team[]);
    }
  }
  return demoFixtures().sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export async function getFixtureById(id: number): Promise<FixtureWithTeams | null> {
  const fixtures = await getFixtures();
  return fixtures.find((f) => f.id === id) ?? null;
}

/** Live now + today's slate; used by the home page and /api/live. */
export async function getLiveSnapshot(): Promise<{
  live: FixtureWithTeams[];
  today: FixtureWithTeams[];
}> {
  const fixtures = await getFixtures();
  const now = Date.now();
  const live = fixtures.filter((f) => f.status === "LIVE" || f.status === "HT");
  const today = fixtures.filter((f) => {
    const t = new Date(f.kickoff).getTime();
    return t > now - 4 * HOUR && t < now + 24 * HOUR;
  });
  return { live, today };
}

export async function getPlayersWithForm(): Promise<PlayerWithForm[]> {
  const sb = supabaseAnon();
  if (sb) {
    const [pl, fm, tm] = await Promise.all([
      sb.from("players").select("*"),
      sb
        .from("player_form")
        .select("*")
        .order("snapshot_date", { ascending: true }),
      sb.from("teams").select("*"),
    ]);
    if (!pl.error && !fm.error && pl.data?.length) {
      const teams = new Map(((tm.data ?? []) as Team[]).map((t) => [t.id, t]));
      const formByPlayer = new Map<number, FormSnapshot[]>();
      for (const row of (fm.data ?? []) as FormSnapshot[]) {
        const list = formByPlayer.get(row.player_id) ?? [];
        list.push(row);
        formByPlayer.set(row.player_id, list);
      }
      return (pl.data as Player[]).map((p) => ({
        ...p,
        team: p.team_id != null ? (teams.get(p.team_id) ?? null) : null,
        form: (formByPlayer.get(p.id) ?? []).slice(-5),
      }));
    }
  }
  return demoPlayers();
}

export async function getOddsForFixture(fixtureId: number): Promise<OddsSnapshotRow[]> {
  const sb = supabaseAnon();
  if (sb) {
    const { data, error } = await sb
      .from("odds_snapshots")
      .select("*")
      .eq("fixture_id", fixtureId)
      .order("captured_at", { ascending: true });
    if (!error && data?.length) return data as OddsSnapshotRow[];
  }
  return demoOdds().filter((o) => o.fixture_id === fixtureId);
}

export async function getHotTakes(fixtureId?: number): Promise<HotTake[]> {
  const sb = supabaseAnon();
  if (sb) {
    let query = sb
      .from("hot_takes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);
    if (fixtureId != null) query = query.eq("fixture_id", fixtureId);
    const { data, error } = await query;
    if (!error && data?.length) return data as HotTake[];
  }

  // Demo mode: run the real rules engine over the demo dataset so the
  // signature interaction is exercised end-to-end without any API key.
  const fixtures = demoFixtures();
  const now = Date.now();
  const window = fixtures.filter((f) => {
    const t = new Date(f.kickoff).getTime();
    return (
      f.status === "LIVE" ||
      f.status === "HT" ||
      (f.status === "NS" && t > now && t < now + 72 * HOUR)
    );
  });
  const oddsByFixture = new Map<number, OddsSnapshotRow[]>();
  for (const row of demoOdds()) {
    const list = oddsByFixture.get(row.fixture_id) ?? [];
    list.push(row);
    oddsByFixture.set(row.fixture_id, list);
  }
  const takes = generateTakes({
    fixtures: window,
    oddsByFixture,
    players: demoPlayers(),
  });
  return takes
    .map((t, i) => ({ id: i + 1, created_at: new Date(now).toISOString(), ...t }))
    .filter((t) => fixtureId == null || t.fixture_id === fixtureId);
}

export async function getTeams(): Promise<Team[]> {
  const sb = supabaseAnon();
  if (sb) {
    const { data, error } = await sb.from("teams").select("*");
    if (!error && data?.length) return data as Team[];
  }
  return demoTeams();
}

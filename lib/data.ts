import { cache } from "react";
import { demoFixtures, demoOdds, demoPlayers, demoTeams } from "@/lib/demo";
import { eloRatings, predictFixture, type WinChance } from "@/lib/predictor";
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
 * which query Supabase — never a football provider. When the cache is
 * unreachable or empty, everything falls back to the bundled demo dataset
 * so the product stays browsable.
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

/** Real cached fixtures, or null when the cache is unreachable/empty.
 *  React-cached: deduped across all calls within one render pass. */
const fetchSupabaseFixtures = cache(async (): Promise<FixtureWithTeams[] | null> => {
  const sb = supabaseAnon();
  if (!sb) return null;
  try {
    const [fx, tm] = await Promise.all([
      sb.from("fixtures").select("*").order("kickoff", { ascending: true }),
      sb.from("teams").select("*"),
    ]);
    if (fx.error || tm.error || !fx.data?.length) return null;
    return joinTeams(fx.data as Fixture[], (tm.data ?? []) as Team[]);
  } catch {
    return null;
  }
});

/** True when pages are rendering from the bundled demo dataset. */
export async function isDemoData(): Promise<boolean> {
  return (await fetchSupabaseFixtures()) === null;
}

export async function getFixtures(): Promise<FixtureWithTeams[]> {
  const real = await fetchSupabaseFixtures();
  if (real) return real;
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

/** Real cached players+form, or null when the cache has none. React-cached. */
const fetchSupabasePlayers = cache(async (): Promise<PlayerWithForm[] | null> => {
  const sb = supabaseAnon();
  if (!sb) return null;
  try {
    const [pl, fm, tm] = await Promise.all([
      sb.from("players").select("*"),
      sb.from("player_form").select("*").order("snapshot_date", { ascending: true }),
      sb.from("teams").select("*"),
    ]);
    if (pl.error || fm.error || !pl.data?.length) return null;
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
  } catch {
    return null;
  }
});

export async function getPlayersWithForm(): Promise<PlayerWithForm[]> {
  return (await fetchSupabasePlayers()) ?? demoPlayers();
}

/** True when the form leaderboard is showing demo players (no provider
 *  supplies player stats yet — e.g. the keyless ESPN adapter). */
export async function playersAreDemo(): Promise<boolean> {
  return (await fetchSupabasePlayers()) === null;
}

export async function getOddsForFixture(fixtureId: number): Promise<OddsSnapshotRow[]> {
  const sb = supabaseAnon();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("odds_snapshots")
        .select("*")
        .eq("fixture_id", fixtureId)
        .order("captured_at", { ascending: true });
      if (!error && data?.length) return data as OddsSnapshotRow[];
    } catch {
      // fall through to demo
    }
  }
  return demoOdds().filter((o) => o.fixture_id === fixtureId);
}

async function fetchOddsForFixtures(
  fixtureIds: number[],
  real: boolean,
): Promise<Map<number, OddsSnapshotRow[]>> {
  const byFixture = new Map<number, OddsSnapshotRow[]>();
  if (!fixtureIds.length) return byFixture;
  let rows: OddsSnapshotRow[] = [];
  const sb = supabaseAnon();
  if (real && sb) {
    try {
      const { data } = await sb
        .from("odds_snapshots")
        .select("*")
        .in("fixture_id", fixtureIds)
        .order("captured_at", { ascending: true });
      rows = (data ?? []) as OddsSnapshotRow[];
    } catch {
      rows = [];
    }
  } else {
    rows = demoOdds().filter((o) => fixtureIds.includes(o.fixture_id));
  }
  for (const row of rows) {
    const list = byFixture.get(row.fixture_id) ?? [];
    list.push(row);
    byFixture.set(row.fixture_id, list);
  }
  return byFixture;
}

/**
 * Signed momentum contribution from the market, per fixture: positive when
 * the market moved toward the away side over the captured window (§7
 * momentum = last-15-min events + odds delta).
 */
export async function getOddsDeltas(fixtureIds: number[]): Promise<Map<number, number>> {
  const real = (await fetchSupabaseFixtures()) !== null;
  const byFixture = await fetchOddsForFixtures(fixtureIds, real);
  const deltas = new Map<number, number>();
  for (const [id, rows] of byFixture) {
    const mw = rows.filter((r) => r.market === "match_winner");
    if (mw.length < 2) continue;
    const first = mw[0].values.home ?? 0;
    const last = mw[mw.length - 1].values.home ?? 0;
    // home prob falling → momentum drifting toward the away side
    deltas.set(id, Math.max(-0.4, Math.min(0.4, (first - last) * 2)));
  }
  return deltas;
}

export async function getHotTakes(fixtureId?: number): Promise<HotTake[]> {
  const sb = supabaseAnon();
  if (sb) {
    try {
      let query = sb
        .from("hot_takes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      if (fixtureId != null) query = query.eq("fixture_id", fixtureId);
      const { data, error } = await query;
      if (!error && data?.length) return data as HotTake[];
    } catch {
      // fall through to on-the-fly generation
    }
  }

  // No stored takes: run the deterministic rules engine over the CURRENT
  // dataset (real cache or demo — never mixed), so the takes always talk
  // about the fixtures actually on screen.
  const real = await fetchSupabaseFixtures();
  const fixtures = real ?? demoFixtures();
  const now = Date.now();
  const window = fixtures.filter((f) => {
    const t = new Date(f.kickoff).getTime();
    return (
      f.status === "LIVE" ||
      f.status === "HT" ||
      (f.status === "NS" && t > now && t < now + 72 * HOUR)
    );
  });
  const oddsByFixture = await fetchOddsForFixtures(
    window.map((f) => f.id),
    real !== null,
  );
  // Player rules only run on matching data: demo players never generate
  // takes against real fixtures.
  const players = real !== null ? ((await fetchSupabasePlayers()) ?? []) : demoPlayers();
  const takes = generateTakes({ fixtures: window, oddsByFixture, players });
  return takes
    .map((t, i) => ({ id: i + 1, created_at: new Date(now).toISOString(), ...t }))
    .filter((t) => fixtureId == null || t.fixture_id === fixtureId);
}

/**
 * Signalroom win chances for undecided fixtures with both teams known —
 * the compounding loop's output. Elo learned from every cached result,
 * anchored to the latest market snapshot where one exists.
 */
export async function getPredictions(
  fixtureIds?: number[],
): Promise<Map<number, WinChance>> {
  const real = await fetchSupabaseFixtures();
  const fixtures = real ?? demoFixtures();
  const ratings = eloRatings(fixtures);
  const targets = fixtures.filter(
    (f) =>
      f.status !== "FT" &&
      f.status !== "PEN" &&
      f.home_team != null &&
      f.away_team != null &&
      (!fixtureIds || fixtureIds.includes(f.id)),
  );
  const oddsByFixture = await fetchOddsForFixtures(
    targets.map((f) => f.id),
    real !== null,
  );
  const predictions = new Map<number, WinChance>();
  for (const f of targets) {
    const mw = (oddsByFixture.get(f.id) ?? []).filter(
      (r) => r.market === "match_winner",
    );
    const chance = predictFixture(f, ratings, mw[mw.length - 1] ?? null);
    if (chance) predictions.set(f.id, chance);
  }
  return predictions;
}

export type { WinChance };

export async function getTeams(): Promise<Team[]> {
  const sb = supabaseAnon();
  if (sb) {
    try {
      const { data, error } = await sb.from("teams").select("*");
      if (!error && data?.length) return data as Team[];
    } catch {
      // fall through to demo
    }
  }
  return demoTeams();
}

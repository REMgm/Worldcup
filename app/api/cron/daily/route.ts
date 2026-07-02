import { cronAuthorized, getPinnedLeague, logQuota, pinLeague, SEASON } from "@/lib/cron";
import {
  generateAndStoreTakes,
  snapshotScorers,
  upsertFixtures,
  upsertTeams,
} from "@/lib/ingest";
import { getProvider } from "@/lib/providers";
import { ApiFootballProvider } from "@/lib/providers/apiFootball";
import { ymd } from "@/lib/format";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;

/**
 * Daily ingest (§4, 06:00 UTC): fixtures for the next 7 days, top scorers,
 * player-form snapshots → upsert into Supabase; then regenerate hot takes.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const sb = supabaseService();
  if (!sb) {
    return Response.json(
      { ok: false, error: "supabase service role not configured" },
      { status: 503 },
    );
  }

  try {
    let pinned = await getPinnedLeague(sb);
    const provider = getProvider(pinned);

    // First run: resolve league/season dynamically, pin into config (§3.2).
    if (!pinned && provider instanceof ApiFootballProvider) {
      if (!provider.configured()) {
        return Response.json(
          { ok: false, error: "API_FOOTBALL_KEY not configured" },
          { status: 503 },
        );
      }
      pinned = await provider.resolveLeague(SEASON);
      await pinLeague(sb, pinned);
    }

    const now = Date.now();
    const fixtures = await provider.getFixtures({
      from: ymd(new Date(now - DAY)),
      to: ymd(new Date(now + 7 * DAY)),
    });
    const teamCount = await upsertTeams(sb, provider.drainTeams());
    const fixtureCount = await upsertFixtures(sb, fixtures);

    const scorers = await provider.getTopScorers();
    await upsertTeams(sb, provider.drainTeams());
    const formCount = await snapshotScorers(sb, scorers);

    const takeCount = await generateAndStoreTakes(sb);
    const quota = await logQuota(sb, "daily", provider.requestCount());

    return Response.json({
      ok: true,
      provider: provider.name,
      league: pinned,
      teams: teamCount,
      fixtures: fixtureCount,
      formSnapshots: formCount,
      takes: takeCount,
      quota,
    });
  } catch (err) {
    console.error("[cron/daily]", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

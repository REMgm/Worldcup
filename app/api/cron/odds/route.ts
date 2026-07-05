import { cronAuthorized, getPinnedLeague, logQuota } from "@/lib/cron";
import { generateAndStoreTakes, storeOdds } from "@/lib/ingest";
import { getProvider } from "@/lib/providers";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOUR = 3_600_000;
// Free-tier guard: at 2x daily + T-2h runs, 8 fixtures ≈ 16–24 requests/day.
const MAX_FIXTURES_PER_RUN = 8;

/**
 * Odds snapshots (§4, 08:00/16:00 UTC): pre-match odds for fixtures inside
 * the next 48h, stored append-only so movement can be charted. Takes are
 * regenerated afterwards so market swings surface immediately.
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
    const provider = getProvider(await getPinnedLeague(sb));
    const now = Date.now();
    const { data: upcoming, error } = await sb
      .from("fixtures")
      .select("id, kickoff")
      .eq("status", "NS")
      .gte("kickoff", new Date(now).toISOString())
      .lte("kickoff", new Date(now + 48 * HOUR).toISOString())
      .order("kickoff", { ascending: true })
      .limit(MAX_FIXTURES_PER_RUN);
    if (error) throw new Error(error.message);

    let stored = 0;
    const missing: number[] = [];
    for (const f of upcoming ?? []) {
      const rows = await provider.getOdds(f.id);
      if (rows?.length) stored += await storeOdds(sb, rows);
      else missing.push(f.id);
    }

    const takes = await generateAndStoreTakes(sb);
    const quota = await logQuota(sb, "odds", provider.requestCount());

    return Response.json({
      ok: true,
      provider: provider.name,
      fixturesChecked: upcoming?.length ?? 0,
      snapshotsStored: stored,
      noOddsFor: missing,
      takes,
      quota,
    });
  } catch (err) {
    console.error("[cron/odds]", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

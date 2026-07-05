import { cronAuthorized, getPinnedLeague, logQuota } from "@/lib/cron";
import { upsertFixtures, upsertTeams } from "@/lib/ingest";
import { ymd } from "@/lib/format";
import { getProvider } from "@/lib/providers";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN = 60_000;

/**
 * Live tick (§4): scheduled every minute inside the match window, but exits
 * BEFORE any provider call unless a cached fixture is LIVE/HT or kicking
 * off within ±10 minutes. This guard is what keeps the free tier alive.
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
    const now = Date.now();
    const windowStart = new Date(now - 10 * MIN).toISOString();
    const windowEnd = new Date(now + 10 * MIN).toISOString();

    // The guard: one cheap Supabase read, zero provider requests when idle.
    const { data: active, error } = await sb
      .from("fixtures")
      .select("id, status, kickoff")
      .or(
        `status.in.(LIVE,HT),and(kickoff.gte.${windowStart},kickoff.lte.${windowEnd})`,
      );
    if (error) throw new Error(error.message);
    if (!active?.length) {
      return Response.json({ ok: true, skipped: true, reason: "no live window" });
    }

    const provider = getProvider(await getPinnedLeague(sb));
    const live = await provider.getFixtures({ live: true });
    await upsertTeams(sb, provider.drainTeams());
    let updated = await upsertFixtures(sb, live);

    // Fixtures we thought were live but the provider no longer lists have
    // finished — one date-range call finalizes their scores/status.
    const liveIds = new Set(live.map((f) => f.id));
    const stale = active.filter(
      (f) => (f.status === "LIVE" || f.status === "HT") && !liveIds.has(f.id),
    );
    if (stale.length) {
      const today = await provider.getFixtures({
        from: ymd(new Date(now - 86_400_000)),
        to: ymd(new Date(now)),
      });
      await upsertTeams(sb, provider.drainTeams());
      updated += await upsertFixtures(sb, today.filter((f) => stale.some((s) => s.id === f.id)));
    }

    const quota = await logQuota(sb, "live", provider.requestCount());
    return Response.json({
      ok: true,
      liveFixtures: live.length,
      finalized: stale.length,
      updated,
      quota,
    });
  } catch (err) {
    console.error("[cron/live]", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

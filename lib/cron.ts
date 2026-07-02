import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiFootballConfig } from "@/lib/providers/apiFootball";

/** All /api/cron/* routes require `Authorization: Bearer $CRON_SECRET` (§4). */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(provided);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const SEASON = Number(process.env.WORLD_CUP_SEASON ?? 2026);

/** League + season pinned into the `config` table at first resolution (§3.2). */
export async function getPinnedLeague(
  sb: SupabaseClient,
): Promise<ApiFootballConfig | null> {
  const { data } = await sb.from("config").select("value").eq("key", "league").maybeSingle();
  const value = data?.value as { league_id?: number; season?: number } | undefined;
  if (value?.league_id && value?.season) {
    return { leagueId: value.league_id, season: value.season };
  }
  return null;
}

export async function pinLeague(sb: SupabaseClient, cfg: ApiFootballConfig): Promise<void> {
  await sb.from("config").upsert({
    key: "league",
    value: { league_id: cfg.leagueId, season: cfg.season },
  });
}

const DAILY_BUDGET = Number(process.env.API_FOOTBALL_DAILY_BUDGET ?? 100);

/**
 * Append today's request count to the quota log and warn at 80% of the
 * free-tier budget (§11 mitigation).
 */
export async function logQuota(
  sb: SupabaseClient,
  route: string,
  requests: number,
): Promise<{ today: number; warned: boolean }> {
  const key = `quota_${new Date().toISOString().slice(0, 10)}`;
  const { data } = await sb.from("config").select("value").eq("key", key).maybeSingle();
  const existing = (data?.value as { count?: number; routes?: Record<string, number> }) ?? {};
  const today = (existing.count ?? 0) + requests;
  const routes = { ...(existing.routes ?? {}) };
  routes[route] = (routes[route] ?? 0) + requests;
  const warned = today >= DAILY_BUDGET * 0.8;
  await sb.from("config").upsert({ key, value: { count: today, routes, warned } });
  if (warned) {
    console.warn(
      `[quota] ${today}/${DAILY_BUDGET} provider requests used today (route: ${route})`,
    );
  }
  return { today, warned };
}

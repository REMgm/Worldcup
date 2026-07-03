// Worldcup Pulse — self-contained ingest running INSIDE Supabase.
// Scheduled by pg_cron (see supabase/migrations/*_schedule_ingest.sql):
//   every minute  → mode=auto  (guard: zero ESPN calls unless a fixture is
//                    live/kicking off ±10 min; full sync if cache >6h old)
//   06:00 UTC     → mode=daily (whole-tournament range + odds snapshots)
// This keeps the cache-first rule (§0.2) with no Vercel env vars required:
// the Next.js app only ever reads the Supabase cache.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const CORE = "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TEAM_COLORS: Record<string, { p: string; s: string }> = {
  ARG: { p: "#75AADB", s: "#FFFFFF" }, AUS: { p: "#FFB81C", s: "#00843D" },
  AUT: { p: "#EF3340", s: "#FFFFFF" }, BEL: { p: "#E30613", s: "#FFCB05" },
  BRA: { p: "#FFDC02", s: "#009C3B" }, CAN: { p: "#C8102E", s: "#FFFFFF" },
  COL: { p: "#FCD116", s: "#003893" }, CRO: { p: "#FF0000", s: "#FFFFFF" },
  DEN: { p: "#C8102E", s: "#FFFFFF" }, ECU: { p: "#FFDD00", s: "#034EA2" },
  EGY: { p: "#CE1126", s: "#FFFFFF" }, ENG: { p: "#FFFFFF", s: "#CE1124" },
  ESP: { p: "#AA151B", s: "#F1BF00" }, FRA: { p: "#21304D", s: "#EF4135" },
  GER: { p: "#FFFFFF", s: "#000000" }, GHA: { p: "#FCD116", s: "#006B3F" },
  IRN: { p: "#FFFFFF", s: "#DA0000" }, ITA: { p: "#0066B2", s: "#FFFFFF" },
  JPN: { p: "#12239E", s: "#FFFFFF" }, KOR: { p: "#CD2E3A", s: "#FFFFFF" },
  KSA: { p: "#006C35", s: "#FFFFFF" }, MAR: { p: "#C1272D", s: "#006233" },
  MEX: { p: "#006847", s: "#CE1126" }, NED: { p: "#FF6600", s: "#21468B" },
  NOR: { p: "#BA0C2F", s: "#00205B" }, POL: { p: "#FFFFFF", s: "#DC143C" },
  POR: { p: "#C8102E", s: "#046A38" }, SEN: { p: "#00853F", s: "#FDEF42" },
  SRB: { p: "#C6363C", s: "#0C4076" }, SUI: { p: "#DA291C", s: "#FFFFFF" },
  URU: { p: "#7BAFD4", s: "#000000" }, USA: { p: "#B22234", s: "#3C3B6E" },
  UZB: { p: "#0099B5", s: "#1EB53A" },
};

const STAGE_WINDOWS: Array<[string, string, string]> = [
  ["2026-06-11", "2026-06-27", "GRP"],
  ["2026-06-28", "2026-07-03", "R32"],
  ["2026-07-04", "2026-07-08", "R16"],
  ["2026-07-09", "2026-07-13", "QF"],
  ["2026-07-14", "2026-07-17", "SF"],
  ["2026-07-18", "2026-07-18", "3P"],
  ["2026-07-19", "2026-07-20", "F"],
];

function stageFor(noteText: string, iso: string): string | null {
  // ESPN's per-event round lives in season.slug, hyphenated ("round-of-32").
  const r = noteText.toLowerCase().replace(/[-_]/g, " ");
  if (r.includes("group") || r.includes("matchday")) return "GRP"; // cached for stats context, hidden from the bracket
  if (r.includes("round of 32")) return "R32";
  if (r.includes("round of 16")) return "R16";
  if (r.includes("quarter")) return "QF";
  if (r.includes("semi")) return "SF";
  if (r.includes("third") || r.includes("3rd")) return "3P";
  if (r.includes("final")) return "F";
  const day = iso.slice(0, 10);
  for (const [from, to, stage] of STAGE_WINDOWS) {
    if (day >= from && day <= to) return stage;
  }
  return null;
}

function mapStatus(type: any): string {
  const name = String(type?.name ?? "");
  const state = String(type?.state ?? "");
  if (name === "STATUS_HALFTIME") return "HT";
  if (name === "STATUS_FINAL_PEN") return "PEN";
  if (state === "in") return "LIVE";
  if (state === "post") return "FT";
  return "NS";
}

function parseClock(display: unknown): number | null {
  const m = /^(\d+)/.exec(String(display ?? ""));
  return m ? Number(m[1]) : null;
}

function americanToDecimal(ml: number): number | null {
  if (!Number.isFinite(ml) || ml === 0) return null;
  return ml > 0 ? 1 + ml / 100 : 1 + 100 / -ml;
}

function implied(odds: Record<string, number>): Record<string, number> {
  const inv = Object.fromEntries(
    Object.entries(odds).filter(([, v]) => v > 1).map(([k, v]) => [k, 1 / v]),
  );
  const total = Object.values(inv).reduce((a, b) => a + b, 0);
  if (total <= 0) return {};
  return Object.fromEntries(
    Object.entries(inv).map(([k, v]) => [k, Number((v / total).toFixed(4))]),
  );
}

interface TeamRow {
  id: number; name: string; code: string | null; flag_url: string | null;
  primary_color: string | null; secondary_color: string | null;
}

function mapEvent(event: any, teams: Map<number, TeamRow>) {
  const comp = event?.competitions?.[0];
  if (!comp || !event?.id) return null;
  const noteText = [
    (comp?.notes ?? []).map((n: any) => n?.headline).join(" "),
    event?.season?.slug,
  ].filter(Boolean).join(" ");
  const stage = stageFor(noteText, String(event.date ?? ""));
  if (!stage) return null; // group stage / out of scope

  const collect = (raw: any): number | null => {
    const id = Number(raw?.id);
    if (!id) return null;
    if (!teams.has(id)) {
      const code = raw.abbreviation ?? null;
      const colors = code ? TEAM_COLORS[code] : undefined;
      teams.set(id, {
        id,
        name: raw.displayName ?? raw.name ?? "Unknown",
        code,
        flag_url: raw.flag?.href ?? raw.logo ?? null,
        primary_color: colors?.p ?? null,
        secondary_color: colors?.s ?? null,
      });
    }
    return id;
  };

  const competitors: any[] = comp?.competitors ?? [];
  const home = competitors.find((c) => c?.homeAway === "home") ?? competitors[0];
  const away = competitors.find((c) => c?.homeAway === "away") ?? competitors[1];
  const homeId = collect(home?.team);
  const awayId = collect(away?.team);

  const statusType = comp?.status?.type ?? event?.status?.type;
  let status = mapStatus(statusType);
  const hp = home?.shootoutScore != null ? Number(home.shootoutScore) : null;
  const ap = away?.shootoutScore != null ? Number(away.shootoutScore) : null;
  if (status === "FT" && hp != null && ap != null) status = "PEN";

  const events = (comp?.details ?? [])
    .map((d: any) => {
      const text = String(d?.type?.text ?? "");
      let type: string | null = null;
      let detail = text;
      if (d?.scoringPlay || /goal/i.test(text)) {
        type = "goal";
        if (d?.penaltyKick) detail = "Penalty";
        else if (d?.ownGoal) detail = "Own Goal";
      } else if (d?.redCard || /red card/i.test(text)) { type = "card"; detail = "Red Card"; }
      else if (d?.yellowCard || /yellow card/i.test(text)) { type = "card"; detail = "Yellow Card"; }
      else if (/substitution/i.test(text)) type = "subst";
      if (!type) return null;
      return {
        minute: parseClock(d?.clock?.displayValue) ?? Math.round((d?.clock?.value ?? 0) / 60),
        type,
        detail: detail || type,
        team_id: Number(d?.team?.id) || 0,
        player: d?.athletesInvolved?.[0]?.displayName ?? null,
      };
    })
    .filter(Boolean);

  // ESPN reports "0" for unplayed fixtures — store null until kickoff.
  const score = (c: any) =>
    status !== "NS" && c?.score != null && c.score !== "" ? Number(c.score) : null;
  const live = status === "LIVE" || status === "HT";
  return {
    id: Number(event.id),
    kickoff: new Date(event.date ?? comp.date).toISOString(),
    stage,
    status,
    home_team: homeId,
    away_team: awayId,
    home_score: score(home),
    away_score: score(away),
    penalties: hp != null && ap != null ? { home: hp, away: ap } : null,
    venue: comp?.venue?.fullName
      ? [comp.venue.fullName, comp.venue.address?.city].filter(Boolean).join(", ")
      : null,
    events: events.length ? events : null,
    elapsed: live ? parseClock(comp?.status?.displayClock ?? event?.status?.displayClock) : null,
    updated_at: new Date().toISOString(),
  };
}

async function espn(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`espn ${url} → HTTP ${res.status}`);
  return res.json();
}

async function upsertScoreboard(sb: any, url: string) {
  const json = await espn(url);
  const teams = new Map<number, TeamRow>();
  const fixtures = (json?.events ?? [])
    .map((e: any) => mapEvent(e, teams))
    .filter(Boolean) as any[];
  if (teams.size) {
    const { error } = await sb.from("teams").upsert([...teams.values()]);
    if (error) throw new Error(`teams upsert: ${error.message}`);
  }
  // Rows without event details omit the events key entirely so an upsert
  // never wipes a timeline stored by an earlier live tick.
  const withEvents = fixtures.filter((f) => f.events != null);
  const withoutEvents = fixtures
    .filter((f) => f.events == null)
    .map(({ events: _e, ...rest }) => rest);
  for (const batch of [withEvents, withoutEvents]) {
    if (!batch.length) continue;
    const { error } = await sb.from("fixtures").upsert(batch);
    if (error) throw new Error(`fixtures upsert: ${error.message}`);
  }
  return { teams: teams.size, fixtures: fixtures.length };
}

async function snapshotOdds(sb: any) {
  const now = Date.now();
  const { data: upcoming } = await sb
    .from("fixtures")
    .select("id")
    .eq("status", "NS")
    .gte("kickoff", new Date(now).toISOString())
    .lte("kickoff", new Date(now + 48 * 3600_000).toISOString())
    .limit(8);
  let stored = 0;
  for (const f of upcoming ?? []) {
    try {
      const json = await espn(`${CORE}/events/${f.id}/competitions/${f.id}/odds`);
      const item = (json?.items ?? [])[0];
      if (!item) continue;
      const captured_at = new Date().toISOString();
      const bookmaker = item?.provider?.name ?? "ESPN consensus";
      const rows: any[] = [];
      const dec: Record<string, number> = {};
      for (const [key, side] of [
        ["home", item?.homeTeamOdds],
        ["away", item?.awayTeamOdds],
        ["draw", item?.drawOdds],
      ] as const) {
        const d = americanToDecimal(Number(side?.moneyLine ?? side?.moneyline ?? NaN));
        if (d) dec[key] = d;
      }
      if (Object.keys(dec).length >= 2) {
        rows.push({ fixture_id: f.id, captured_at, bookmaker, market: "match_winner", values: implied(dec) });
      }
      const over = americanToDecimal(Number(item?.overOdds ?? NaN));
      const under = americanToDecimal(Number(item?.underOdds ?? NaN));
      if (over && under && item?.overUnder != null) {
        const p = implied({ over, under });
        rows.push({
          fixture_id: f.id, captured_at, bookmaker, market: "total_goals",
          values: { [`over_${item.overUnder}`]: p.over ?? 0, [`under_${item.overUnder}`]: p.under ?? 0 },
        });
      }
      if (rows.length) {
        const { error } = await sb.from("odds_snapshots").insert(rows);
        if (!error) stored += rows.length;
      }
    } catch {
      // odds are garnish — never fail ingest over them
    }
  }
  return stored;
}

const ymdCompact = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

Deno.serve(async (req: Request) => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let mode = new URL(req.url).searchParams.get("mode") ?? "auto";
  try {
    const body = await req.json();
    if (body?.mode) mode = body.mode;
  } catch { /* no body */ }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const now = Date.now();
    const MIN = 60_000;

    if (mode === "auto") {
      // The guard (§4): one cheap DB read decides whether ESPN is called at all.
      const { data: active, error } = await sb
        .from("fixtures")
        .select("id")
        .or(
          `status.in.(LIVE,HT),and(kickoff.gte.${new Date(now - 10 * MIN).toISOString()},kickoff.lte.${new Date(now + 10 * MIN).toISOString()})`,
        );
      if (error) throw new Error(error.message);

      if (!active?.length) {
        const { data: cfg } = await sb
          .from("config").select("value").eq("key", "last_full_sync").maybeSingle();
        const last = Date.parse((cfg?.value as any)?.at ?? 0) || 0;
        if (now - last < 6 * 3600_000) {
          return json({ ok: true, skipped: true, reason: "no live window, cache fresh" });
        }
        mode = "daily"; // stale cache → refresh
      } else {
        // Live tick: today's scoreboard covers in-play + just-finished.
        const day = ymdCompact(new Date(now));
        const prev = ymdCompact(new Date(now - 86_400_000));
        const result = await upsertScoreboard(sb, `${SITE}/scoreboard?limit=100&dates=${prev}-${day}`);
        return json({ ok: true, mode: "live", ...result });
      }
    }

    // Full sync: the whole tournament window in one range call.
    const result = await upsertScoreboard(
      sb,
      `${SITE}/scoreboard?limit=300&dates=20260611-20260720`,
    );
    const odds = await snapshotOdds(sb);
    await sb.from("config").upsert({
      key: "last_full_sync",
      value: { at: new Date().toISOString(), ...result, odds },
    });
    return json({ ok: true, mode: "daily", ...result, odds });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

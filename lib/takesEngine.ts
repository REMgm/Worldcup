import type {
  FixtureWithTeams,
  HotTake,
  OddsSnapshotRow,
  PlayerWithForm,
  TakeConfidence,
} from "@/lib/types";

/**
 * Deterministic hot-take rules engine (§5). Runs at cron/build time over
 * player form and odds-snapshot deltas. No LLM in the hot path — every take
 * is justified by the stat it reveals.
 */

export interface GeneratedTake {
  fixture_id: number | null;
  headline: string;
  body: string;
  confidence: TakeConfidence;
  revealed_stat: HotTake["revealed_stat"];
}

export interface TakesInput {
  /** Fixtures inside the editorial window (live + next ~48h), teams joined. */
  fixtures: FixtureWithTeams[];
  /** Odds snapshots per fixture, ascending by captured_at. */
  oddsByFixture: Map<number, OddsSnapshotRow[]>;
  /** Players with their recent form snapshots (ascending by date). */
  players: PlayerWithForm[];
}

const MARKET_SWING_PTS = 0.08; // "odds moved >8% against the favorite in 24h"
const XG_OVERPERF_PER_GAME = 0.4; // "xG overperformance >0.4/game"
const COIN_FLIP_GAP = 0.03;
const FORM_SPIKE = 0.5;
const HEAVY_FAVORITE = 0.6;
const CHESS_MATCH_OVER25 = 0.45;

function latest<T>(rows: T[]): T | undefined {
  return rows[rows.length - 1];
}

function pct(p: number): number {
  return Math.round(p * 100);
}

function matchWinner(rows: OddsSnapshotRow[] | undefined): OddsSnapshotRow[] {
  return (rows ?? []).filter((r) => r.market === "match_winner");
}

function sideName(f: FixtureWithTeams, side: "home" | "away"): string {
  return (side === "home" ? f.home?.name : f.away?.name) ?? "the favorite";
}

export function generateTakes(input: TakesInput, cap = 12): GeneratedTake[] {
  const takes: GeneratedTake[] = [];
  const nextFixtureByTeam = new Map<number, FixtureWithTeams>();
  for (const f of input.fixtures) {
    for (const teamId of [f.home_team, f.away_team]) {
      if (teamId != null && !nextFixtureByTeam.has(teamId)) {
        nextFixtureByTeam.set(teamId, f);
      }
    }
  }

  // ---- Market rules, one pass per fixture ----
  for (const f of input.fixtures) {
    const mw = matchWinner(input.oddsByFixture.get(f.id));
    const first = mw[0];
    const last = latest(mw);
    if (!first || !last) continue;

    const sides: Array<"home" | "away"> = ["home", "away"];
    const favSide = sides.reduce((a, b) =>
      (first.values[a] ?? 0) >= (first.values[b] ?? 0) ? a : b,
    );
    const favThen = first.values[favSide] ?? 0;
    const favNow = last.values[favSide] ?? 0;
    const swing = favThen - favNow;

    // Rule 1 — the market walked back the favorite. Spicy.
    if (first.captured_at !== last.captured_at && swing >= MARKET_SWING_PTS) {
      const fav = sideName(f, favSide);
      takes.push({
        fixture_id: f.id,
        headline: `The market is quietly bailing on ${fav}`,
        body: `Yesterday the market had ${fav} at ${pct(favThen)}% to go through. It now reads ${pct(favNow)}% — ${pct(swing)} points walked back with kickoff approaching. Money doesn't get nervous for no reason.`,
        confidence: "spicy",
        revealed_stat: {
          label: "Favorite's implied probability, 24h shift",
          value: -pct(swing),
          suffix: " pts",
        },
      });
    }

    const gap = Math.abs((last.values.home ?? 0) - (last.values.away ?? 0));

    // Rule 2 — genuine coin flip. Spicy.
    if (f.home && f.away && gap <= COIN_FLIP_GAP && gap > 0) {
      takes.push({
        fixture_id: f.id,
        headline: `${f.home.name} v ${f.away.name} is a coin flip and nobody will say it`,
        body: `Strip the overround and the market splits this one ${pct(last.values.home ?? 0)}–${pct(last.values.away ?? 0)}. Every confident prediction you read today is theatre.`,
        confidence: "spicy",
        revealed_stat: {
          label: "Gap between the sides",
          value: gap * 100,
          decimals: 1,
          suffix: " pts",
        },
      });
    }

    // Rule 6 — heavy favorite. Stone cold.
    if (swing < MARKET_SWING_PTS && favNow >= HEAVY_FAVORITE) {
      const fav = sideName(f, favSide);
      takes.push({
        fixture_id: f.id,
        headline: `${fav} should handle this — the market agrees`,
        body: `The market says ${pct(favNow)}%: as close to a banker as knockout football allows. The only drama left is the margin.`,
        confidence: "certain",
        revealed_stat: { label: "Market says", value: pct(favNow), suffix: "%" },
      });
    }

    // Rule 5 — low-scoring chess match. Stone cold.
    const totals = latest(
      (input.oddsByFixture.get(f.id) ?? []).filter((r) => r.market === "total_goals"),
    );
    const over25 = totals?.values["over_2.5"] ?? totals?.values.over_2_5;
    if (over25 != null && over25 <= CHESS_MATCH_OVER25) {
      takes.push({
        fixture_id: f.id,
        headline: `Bring coffee: ${f.home?.code ?? "?"}–${f.away?.code ?? "?"} is a chess match`,
        body: `The market gives three-plus goals just ${pct(over25)}%. Two organized blocks, one moment of quality, and an hour of shadow boxing${f.venue ? ` at ${f.venue}` : ""}.`,
        confidence: "certain",
        revealed_stat: {
          label: "Market chance of 3+ goals",
          value: pct(over25),
          suffix: "%",
        },
      });
    }
  }

  // ---- Player-form rules ----
  for (const p of input.players) {
    const snap = latest(p.form);
    if (!snap) continue;
    const fixture = p.team_id != null ? nextFixtureByTeam.get(p.team_id) : undefined;

    // Rule 3 — xG overperformance. Likely.
    const games = Math.max(1, Math.round((snap.minutes ?? 0) / 90));
    const overperf = (snap.goals ?? 0) - (snap.xg ?? 0);
    if (snap.xg != null && games >= 2 && overperf / games >= XG_OVERPERF_PER_GAME) {
      takes.push({
        fixture_id: fixture?.id ?? null,
        headline: `${p.name} is scoring goals that shouldn't exist`,
        body: `${snap.goals} goals off ${snap.xg?.toFixed(1)} expected — ${overperf.toFixed(1)} above the model across ${games} games. Either the finishing is unsustainable or we're watching something special. Both are worth the ticket.`,
        confidence: "likely",
        revealed_stat: {
          label: "Goals above expected (xG)",
          value: overperf,
          decimals: 1,
          prefix: "+",
        },
      });
    }

    // Rule 4 — form spike vs previous snapshot. Likely.
    if ((snap.form_delta ?? 0) >= FORM_SPIKE && (snap.rating ?? 0) > 0) {
      takes.push({
        fixture_id: fixture?.id ?? null,
        headline: `${p.name} has flipped a switch`,
        body: `Match rating up ${snap.form_delta?.toFixed(1)} on the last snapshot, now sitting at ${snap.rating?.toFixed(1)}. Form like this tends to decide knockout rounds${fixture?.home && fixture?.away ? ` — ${fixture.home.name} v ${fixture.away.name} is on notice` : ""}.`,
        confidence: "likely",
        revealed_stat: {
          label: "Match rating jump",
          value: snap.form_delta ?? 0,
          decimals: 1,
          prefix: "+",
        },
      });
    }
  }

  // Dedupe by headline, cap the volume, spiciest first.
  const rank: Record<TakeConfidence, number> = { spicy: 0, likely: 1, certain: 2 };
  const seen = new Set<string>();
  return takes
    .filter((t) => (seen.has(t.headline) ? false : (seen.add(t.headline), true)))
    .sort((a, b) => rank[a.confidence] - rank[b.confidence])
    .slice(0, cap);
}

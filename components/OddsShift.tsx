"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/motion";
import { matchupColors } from "@/lib/teamColors";
import type { OddsSnapshotRow, Team } from "@/lib/types";

const W = 320;
const H = 120;
const PAD = 10;

function linePath(values: number[], maxP: number): string {
  return values
    .map((v, i) => {
      const x = PAD + (i / Math.max(1, values.length - 1)) * (W - PAD * 2);
      const y = H - PAD - (v / maxP) * (H - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Odds movement chart (§6), editorial framing only (§3.4): "the market
 * says…", never a CTA. Draws implied win probability per side across the
 * captured snapshots.
 */
export default function OddsShift({
  snapshots,
  home,
  away,
}: {
  snapshots: OddsSnapshotRow[];
  home: Team | null;
  away: Team | null;
}) {
  const reduced = usePrefersReducedMotion();
  const mw = snapshots.filter((s) => s.market === "match_winner");
  if (mw.length < 2) return null;

  const colors = matchupColors(home, away);
  const homeSeries = mw.map((s) => s.values.home ?? 0);
  const awaySeries = mw.map((s) => s.values.away ?? 0);
  const maxP = Math.max(...homeSeries, ...awaySeries, 0.5) + 0.08;
  const homeNow = homeSeries[homeSeries.length - 1];
  const awayNow = awaySeries[awaySeries.length - 1];
  const homeDelta = Math.round((homeNow - homeSeries[0]) * 100);

  const draw = (delay: number) => ({
    initial: { pathLength: reduced ? 1 : 0 },
    whileInView: { pathLength: 1 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: 1.0, ease: "easeOut" as const, delay },
  });

  return (
    <div className="rounded-2xl border border-flood/5 bg-pitch-800 p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="font-display text-base font-extrabold text-flood">
          Where the market moved
        </h3>
        <span
          className={`data-nums text-xs font-bold ${homeDelta < 0 ? "text-ember" : "text-lime"}`}
        >
          {home?.code ?? "HOME"} {homeDelta >= 0 ? "▲" : "▼"} {Math.abs(homeDelta)} pts
        </span>
      </div>
      <p className="data-nums mb-4 text-xs text-flood-dim">
        market says {Math.round(homeNow * 100)}% {home?.code ?? "home"} ·{" "}
        {Math.round(awayNow * 100)}% {away?.code ?? "away"}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" fill="none" aria-hidden>
        {[0.25, 0.5].map((g) => (
          <line
            key={g}
            x1={PAD}
            x2={W - PAD}
            y1={H - PAD - (g / maxP) * (H - PAD * 2)}
            y2={H - PAD - (g / maxP) * (H - PAD * 2)}
            stroke="#F5F2E8"
            strokeOpacity="0.07"
          />
        ))}
        <motion.path
          d={linePath(homeSeries, maxP)}
          stroke={colors.home}
          strokeWidth="2.5"
          strokeLinecap="round"
          {...draw(0)}
        />
        <motion.path
          d={linePath(awaySeries, maxP)}
          stroke={colors.away}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="6 4"
          {...draw(0.15)}
        />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[10px] text-flood-dim">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded"
            style={{ background: colors.home }}
          />
          {home?.name ?? "Home"}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded"
            style={{
              background: `repeating-linear-gradient(90deg, ${colors.away} 0 6px, transparent 6px 10px)`,
            }}
          />
          {away?.name ?? "Away"}
        </span>
      </div>
      <p className="mt-3 text-[10px] italic text-flood-dim/60">
        Editorial context, not betting advice.
      </p>
    </div>
  );
}

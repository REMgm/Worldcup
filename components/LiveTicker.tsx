"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fireConfetti } from "@/lib/confetti";
import { kickoffTime } from "@/lib/format";
import { buzz } from "@/lib/haptics";
import { SIGNAL_LIME } from "@/lib/teamColors";
import type { FixtureWithTeams } from "@/lib/types";

interface LivePayload {
  live: FixtureWithTeams[];
  today: FixtureWithTeams[];
}

const POLL_MS = 30_000;

/**
 * Live scoreboard island (§4/§6). Polls /api/live — a Supabase-backed,
 * ISR-cached route handler — never a football provider. Detects score
 * changes between polls and fires team-colored confetti + a haptic tick.
 * Bottom-anchored and thumb-reachable on mobile (§9); pull-down triggers a
 * visual refetch.
 */
export default function LiveTicker() {
  const router = useRouter();
  const [data, setData] = useState<LivePayload | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scores = useRef(new Map<number, number>());

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch("/api/live", { cache: "no-store" });
      if (!res.ok) return;
      const payload: LivePayload = await res.json();

      for (const f of payload.live) {
        const total = (f.home_score ?? 0) + (f.away_score ?? 0);
        const prev = scores.current.get(f.id);
        if (prev !== undefined && total > prev) {
          // GOAL — confetti from the ticker, tiny haptic tick (§7/§9).
          fireConfetti({
            y: 0.9,
            colors: [
              f.home?.primary_color ?? SIGNAL_LIME,
              f.away?.primary_color ?? SIGNAL_LIME,
              "#F5F2E8",
            ],
          });
          buzz(10);
        }
        scores.current.set(f.id, total);
      }
      setData(payload);
    } catch {
      // network hiccup — keep the last snapshot
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchLive();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchLive]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLive();
    router.refresh(); // re-render server components so match cards update too
    setTimeout(() => setRefreshing(false), 600);
  }, [fetchLive, router]);

  const pullRefresh = useCallback(
    async (offsetY: number) => {
      if (offsetY < 44) return;
      await refresh(); // pull-down = same affordance as the button (§9)
    },
    [refresh],
  );

  const live = data?.live ?? [];
  const nextUp = data?.today?.find((f) => f.status === "NS");

  if (!data || (live.length === 0 && !nextUp)) return null;

  return (
    <motion.aside
      aria-label="Live scores"
      className="glass-overlay fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 md:inset-x-auto md:bottom-4 md:right-4 md:w-96 md:rounded-2xl"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.4 }}
      onDragEnd={(_, info) => pullRefresh(info.offset.y)}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="data-nums text-[10px] font-semibold tracking-[0.24em] text-flood-dim">
          {live.length ? "LIVE NOW" : "NEXT UP"}
          {refreshing && <span className="ml-2 text-lime">syncing…</span>}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh scores"
          className="flex size-11 items-center justify-center rounded-full text-flood-dim transition-colors hover:bg-pitch-700 hover:text-flood disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {live.map((f) => (
          <Link
            key={f.id}
            href={`/match/${f.id}`}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-pitch-800/80 px-3 py-2"
          >
            <span className="live-dot inline-block size-2 rounded-full bg-lime" />
            <span className="data-nums text-sm font-bold text-flood">
              {f.home?.code ?? "?"} {f.home_score ?? 0}–{f.away_score ?? 0}{" "}
              {f.away?.code ?? "?"}
            </span>
            <span className="data-nums text-xs text-lime">
              {f.status === "HT" ? "HT" : `${f.elapsed ?? "—"}'`}
            </span>
          </Link>
        ))}
        {!live.length && nextUp && (
          <Link
            href={`/match/${nextUp.id}`}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-pitch-800/80 px-3 py-2"
          >
            <span className="data-nums text-sm font-bold text-flood">
              {nextUp.home?.code ?? "TBD"} v {nextUp.away?.code ?? "TBD"}
            </span>
            <span className="data-nums text-xs text-flood-dim">
              {kickoffTime(nextUp.kickoff)}
            </span>
          </Link>
        )}
      </div>
    </motion.aside>
  );
}

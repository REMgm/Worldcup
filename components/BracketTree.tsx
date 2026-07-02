"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";
import type { FixtureWithTeams, Stage, Team } from "@/lib/types";

const STAGE_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "F"];
const STAGE_LABEL: Record<Stage, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  "3P": "Third place",
  F: "Final",
};

// Desktop bracket geometry.
const NODE_W = 230;
const NODE_H = 76;
const GUTTER = 48;
const SLOT = 96;

export function winnerOf(f: FixtureWithTeams): Team | null {
  if (f.status !== "FT" && f.status !== "PEN") return null;
  const h = f.home_score ?? 0;
  const a = f.away_score ?? 0;
  if (h !== a) return h > a ? f.home : f.away;
  if (f.penalties) return f.penalties.home > f.penalties.away ? f.home : f.away;
  return null;
}

function TeamRow({
  team,
  score,
  pens,
  winner,
  live,
}: {
  team: Team | null;
  score: number | null;
  pens?: number | null;
  winner: boolean;
  live: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span
        className={`data-nums truncate text-xs ${winner ? "font-bold text-flood" : "text-flood-dim"}`}
      >
        {team ? `${team.code ?? "?"} ${team.name}` : "— TBD"}
      </span>
      <span
        className={`data-nums text-xs font-bold ${winner ? "text-lime" : live ? "text-lime" : "text-flood-dim"}`}
      >
        {score ?? ""}
        {pens != null ? ` (${pens})` : ""}
      </span>
    </div>
  );
}

function BracketNode({
  fixture,
  style,
  className = "",
}: {
  fixture: FixtureWithTeams;
  style?: React.CSSProperties;
  className?: string;
}) {
  const winner = winnerOf(fixture);
  const live = fixture.status === "LIVE" || fixture.status === "HT";
  const played = fixture.status !== "NS";
  return (
    <Link
      href={`/match/${fixture.id}`}
      style={style}
      className={`block overflow-hidden rounded-xl border bg-pitch-800 py-1 transition-colors hover:border-flood/25 ${
        live ? "border-lime/40" : "border-flood/8"
      } ${className}`}
    >
      <TeamRow
        team={fixture.home}
        score={played ? fixture.home_score : null}
        pens={fixture.penalties?.home}
        winner={winner != null && winner.id === fixture.home?.id}
        live={live}
      />
      <div className="mx-3 border-t border-flood/5" />
      <TeamRow
        team={fixture.away}
        score={played ? fixture.away_score : null}
        pens={fixture.penalties?.away}
        winner={winner != null && winner.id === fixture.away?.id}
        live={live}
      />
      {live && (
        <span className="absolute right-2 top-2 flex items-center gap-1">
          <span className="live-dot inline-block size-1.5 rounded-full bg-lime" />
        </span>
      )}
    </Link>
  );
}

/**
 * Knockout tree (§6): SVG connector paths draw in (pathLength 0→1) as the
 * bracket scrolls into view, winners' paths in team color. Mobile collapses
 * to horizontal snap-scroll columns with stage tabs (§9).
 */
export default function BracketTree({ fixtures }: { fixtures: FixtureWithTeams[] }) {
  const reduced = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  const byStage = new Map<Stage, FixtureWithTeams[]>();
  for (const stage of STAGE_ORDER) {
    const list = fixtures
      .filter((f) => f.stage === stage)
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id - b.id);
    if (list.length) byStage.set(stage, list);
  }
  const thirdPlace = fixtures.find((f) => f.stage === "3P");
  const stages = STAGE_ORDER.filter((s) => byStage.has(s));
  const [activeStage, setActiveStage] = useState<Stage>(stages[0] ?? "R32");
  if (!stages.length) return null;

  const leafCount = byStage.get(stages[0])!.length;
  const totalH = leafCount * SLOT;
  const totalW = stages.length * NODE_W + (stages.length - 1) * GUTTER;

  const centerY = (round: number, index: number) =>
    Math.pow(2, round) * SLOT * (index + 0.5);
  const colX = (round: number) => round * (NODE_W + GUTTER);

  // Connector paths between consecutive rounds. Adjacency: a fixture feeds
  // the next-round tie that contains one of its teams (real bracket data
  // pre-fills known qualifiers); kickoff-position pairing is only the
  // fallback while both feeder slots are still undecided.
  const connectors: { d: string; color: string; round: number }[] = [];
  for (let r = 0; r < stages.length - 1; r++) {
    const current = byStage.get(stages[r])!;
    const next = byStage.get(stages[r + 1])!;
    current.forEach((f, j) => {
      let target = next.findIndex(
        (n) =>
          (f.home_team != null &&
            (n.home_team === f.home_team || n.away_team === f.home_team)) ||
          (f.away_team != null &&
            (n.home_team === f.away_team || n.away_team === f.away_team)),
      );
      if (target === -1) target = Math.floor(j / 2);
      if (target >= next.length) return;
      const x1 = colX(r) + NODE_W;
      const y1 = centerY(r, j);
      const x2 = colX(r + 1);
      const y2 = centerY(r + 1, target);
      const xm = x1 + GUTTER / 2;
      const winner = winnerOf(f);
      connectors.push({
        d: `M${x1} ${y1} H${xm} V${y2} H${x2}`,
        color: winner?.primary_color ?? "rgba(245,242,232,0.12)",
        round: r,
      });
    });
  }

  const scrollToStage = (stage: Stage) => {
    setActiveStage(stage);
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-stage="${stage}"]`);
    el?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  return (
    <div>
      {/* ---- mobile: stage tabs + snap scroll (§9) ---- */}
      <div className="md:hidden">
        <div role="tablist" aria-label="Bracket stage" className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {[...stages, ...(thirdPlace ? (["3P"] as Stage[]) : [])].map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={activeStage === s}
              onClick={() => scrollToStage(s)}
              className={`data-nums min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold transition-colors ${
                activeStage === s
                  ? "bg-lime text-pitch-900"
                  : "bg-pitch-800 text-flood-dim"
              }`}
            >
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
        <div ref={scrollRef} className="bracket-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
          {stages.map((s) => (
            <div key={s} data-stage={s} className="w-[86vw] max-w-xs shrink-0">
              <h3 className="data-nums mb-3 text-[10px] font-semibold tracking-[0.2em] text-flood-dim">
                {STAGE_LABEL[s].toUpperCase()}
              </h3>
              <div className="relative space-y-3">
                {byStage.get(s)!.map((f) => (
                  <div key={f.id} className="relative">
                    <BracketNode fixture={f} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {thirdPlace && (
            <div data-stage="3P" className="w-[86vw] max-w-xs shrink-0">
              <h3 className="data-nums mb-3 text-[10px] font-semibold tracking-[0.2em] text-flood-dim">
                THIRD PLACE
              </h3>
              <div className="relative">
                <BracketNode fixture={thirdPlace} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- desktop: full tree with drawn connectors ---- */}
      <div className="hidden overflow-x-auto pb-6 md:block">
        <div className="relative" style={{ width: totalW, height: totalH }}>
          <svg
            className="pointer-events-none absolute inset-0"
            width={totalW}
            height={totalH}
            fill="none"
            aria-hidden
          >
            {connectors.map((c, i) => (
              <motion.path
                key={i}
                d={c.d}
                stroke={c.color}
                strokeWidth="1.5"
                initial={{ pathLength: reduced ? 1 : 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{
                  duration: 0.8,
                  ease: "easeOut",
                  delay: reduced ? 0 : c.round * 0.12,
                }}
              />
            ))}
          </svg>
          {stages.map((s, r) => (
            <div key={s}>
              <div
                className="data-nums absolute -top-1 text-[10px] font-semibold tracking-[0.2em] text-flood-dim"
                style={{ left: colX(r) }}
              >
                {STAGE_LABEL[s].toUpperCase()}
              </div>
              {byStage.get(s)!.map((f, j) => (
                <div
                  key={f.id}
                  className="absolute"
                  style={{
                    left: colX(r),
                    top: centerY(r, j) - NODE_H / 2,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                >
                  <BracketNode fixture={f} className="relative h-full" />
                </div>
              ))}
            </div>
          ))}
          {thirdPlace && (
            <div
              className="absolute"
              style={{
                left: colX(stages.length - 1),
                top: centerY(stages.length - 1, 0) + SLOT * 0.9,
                width: NODE_W,
              }}
            >
              <div className="data-nums mb-1 text-[10px] font-semibold tracking-[0.2em] text-flood-dim">
                THIRD PLACE
              </div>
              <BracketNode fixture={thirdPlace} className="relative" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

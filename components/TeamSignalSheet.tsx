"use client";

import { motion } from "framer-motion";
import Flag from "@/components/Flag";
import { statSlide, statStagger, useCountUp } from "@/lib/motion";
import { SIGNAL_LIME } from "@/lib/teamColors";
import type { JourneyEntry, TeamTournamentStats } from "@/lib/teamStats";
import type { Stage, Team } from "@/lib/types";

const STAGE_SHORT: Record<Stage, string> = {
  GRP: "GRP",
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  "3P": "3P",
  F: "F",
};

const OUTCOME_STYLE: Record<JourneyEntry["outcome"], string> = {
  W: "border-lime/50 text-lime",
  D: "border-flood/30 text-flood-dim",
  L: "border-ember/50 text-ember",
};

/** The context trail: every game played so far, in order. */
function Journey({ journey }: { journey: JourneyEntry[] }) {
  if (!journey.length) return null;
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-flood-dim">
        Tournament so far
      </div>
      <div className="flex flex-wrap gap-1.5">
        {journey.map((j, i) => (
          <motion.span
            key={i}
            variants={statSlide}
            className={`data-nums inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-bold ${OUTCOME_STYLE[j.outcome]}`}
            title={`${STAGE_SHORT[j.stage]}: ${j.gf}–${j.ga}${j.pens ? " on pens" : ""} v ${j.opponentName ?? "?"}`}
          >
            <span>{j.outcome}</span>
            <span className="font-medium opacity-80">
              {j.gf}–{j.ga}
              {j.pens ? "p" : ""}
            </span>
            <span className="opacity-70">{j.opponentCode ?? "?"}</span>
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function CountStat({
  label,
  value,
  suffix = "",
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
}) {
  const shown = useCountUp(value, { active: true });
  return (
    <motion.div
      variants={statSlide}
      className="flex flex-col gap-0.5 rounded-xl bg-pitch-700 px-3 py-2"
    >
      <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-flood-dim">
        {label}
      </span>
      <span
        className="data-nums text-lg font-bold leading-none"
        style={{ color: accent ?? "#F5F2E8" }}
      >
        {shown}
        {suffix}
      </span>
    </motion.div>
  );
}

function NameStat({
  label,
  name,
  value,
  accent,
}: {
  label: string;
  name: string;
  value: string;
  accent?: string;
}) {
  return (
    <motion.div
      variants={statSlide}
      className="col-span-2 flex items-baseline justify-between gap-2 rounded-xl bg-pitch-700 px-3 py-2"
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-flood-dim">
          {label}
        </span>
        <span className="block truncate text-sm font-bold text-flood">{name}</span>
      </span>
      <span className="data-nums shrink-0 text-lg font-bold" style={{ color: accent }}>
        {value}
      </span>
    </motion.div>
  );
}

function TeamColumn({
  team,
  stats,
  favored,
}: {
  team: Team | null;
  stats: TeamTournamentStats;
  favored: boolean;
}) {
  const accent = team?.primary_color ?? SIGNAL_LIME;
  return (
    <motion.div
      variants={statStagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="relative overflow-hidden rounded-2xl border bg-pitch-800 p-4"
      style={{
        borderColor: favored ? accent : "rgba(245,242,232,0.06)",
        boxShadow: favored ? `0 0 32px -14px ${accent}` : undefined,
      }}
    >
      {/* WC26-style geometric corner motif in the team's color */}
      <svg
        aria-hidden
        viewBox="0 0 120 120"
        className="pointer-events-none absolute -right-6 -top-6 size-28 opacity-[0.12]"
      >
        <path d="M0 60 A60 60 0 0 1 60 0 H120 V60 Z" fill={accent} />
        <circle cx="90" cy="90" r="30" fill={accent} />
      </svg>
      <div className="mb-3 flex items-center gap-2.5">
        <Flag team={team} size={30} />
        <div className="min-w-0">
          <div className="truncate font-display text-base font-extrabold text-flood">
            {team?.name ?? "TBD"}
          </div>
          <div className="h-0.5 w-10 rounded" style={{ background: accent }} />
        </div>
        {favored && (
          <span
            className="data-nums ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-[0.14em]"
            style={{ borderColor: accent, color: accent }}
          >
            FAVORED
          </span>
        )}
      </div>
      <Journey journey={stats.journey} />
      <div className="grid grid-cols-2 gap-2">
        <CountStat label="Goals" value={stats.goalsFor} accent={accent} />
        <CountStat label="Conceded" value={stats.goalsAgainst} />
        <CountStat label="Wins" value={stats.wins} />
        <CountStat
          label="Cards"
          value={stats.yellows + stats.reds}
          suffix={stats.reds ? ` (${stats.reds}🟥)` : ""}
        />
        {stats.topScorer && (
          <NameStat
            label="Top scorer"
            name={stats.topScorer.name}
            value={`${stats.topScorer.goals}⚽`}
            accent={accent}
          />
        )}
        {stats.assistsLeader && (
          <NameStat
            label="Most assists"
            name={stats.assistsLeader.name}
            value={`${stats.assistsLeader.assists}`}
            accent={accent}
          />
        )}
        {stats.fastestGoal && (
          <NameStat
            label="Fastest goal"
            name={stats.fastestGoal.player ?? "—"}
            value={`${stats.fastestGoal.minute}'`}
            accent={accent}
          />
        )}
        {stats.avgFirstGoalMinute != null && (
          <CountStat
            label="Avg first goal"
            value={stats.avgFirstGoalMinute}
            suffix="'"
          />
        )}
        {stats.shootoutWins > 0 && (
          <CountStat label="Shootouts won" value={stats.shootoutWins} accent={accent} />
        )}
      </div>
    </motion.div>
  );
}

/**
 * "The numbers behind the signal" — per-team tournament sheets computed
 * from the cached results and event timelines: goals, top scorer, fastest
 * goal, opening-goal tempo, discipline, shootout record. Count-ups and
 * staggered slide-ins per §7; the favored side carries its team color.
 */
export default function TeamSignalSheet({
  home,
  away,
  favHome,
}: {
  home: { team: Team | null; stats: TeamTournamentStats };
  away: { team: Team | null; stats: TeamTournamentStats };
  favHome: boolean | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TeamColumn team={home.team} stats={home.stats} favored={favHome === true} />
      <TeamColumn team={away.team} stats={away.stats} favored={favHome === false} />
    </div>
  );
}

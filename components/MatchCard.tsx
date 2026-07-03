import Link from "next/link";
import Flag from "@/components/Flag";
import MomentumEdge from "@/components/MomentumEdge";
import StagePill from "@/components/StagePill";
import { kickoffDate, kickoffTime } from "@/lib/format";
import { momentumScore } from "@/lib/momentum";
import { SIGNAL_LIME } from "@/lib/teamColors";
import type { FixtureWithTeams, Team } from "@/lib/types";

function TeamSide({ team, align }: { team: Team | null; align: "left" | "right" }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <Flag team={team} size={30} />
      <div className="min-w-0">
        <div className="data-nums text-sm font-bold tracking-wide text-flood">
          {team?.code ?? "TBD"}
        </div>
        <div className="truncate text-xs text-flood-dim">{team?.name ?? "To be decided"}</div>
      </div>
    </div>
  );
}

function StatusBlock({ fixture }: { fixture: FixtureWithTeams }) {
  if (fixture.status === "LIVE" || fixture.status === "HT") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-lime">
        <span className="live-dot inline-block size-2 rounded-full bg-lime" />
        {fixture.status === "HT" ? "HT" : `${fixture.elapsed ?? "—"}'`}
      </span>
    );
  }
  if (fixture.status === "FT" || fixture.status === "PEN") {
    return (
      <span className="data-nums text-xs font-semibold text-flood-dim">
        {fixture.status === "PEN" ? "FT · PENS" : "FT"}
      </span>
    );
  }
  return (
    <span className="data-nums text-xs text-flood-dim">
      {kickoffDate(fixture.kickoff)} · {kickoffTime(fixture.kickoff)}
    </span>
  );
}

export default function MatchCard({
  fixture,
  oddsDelta = 0,
}: {
  fixture: FixtureWithTeams;
  /** Market movement toward the away side (§7 momentum term), from getOddsDeltas. */
  oddsDelta?: number;
}) {
  const played = fixture.status !== "NS";
  const homeColor = fixture.home?.primary_color ?? SIGNAL_LIME;
  const awayColor = fixture.away?.primary_color ?? SIGNAL_LIME;
  const momentum = momentumScore(fixture, oddsDelta);
  const glowColor = momentum >= 0 ? awayColor : homeColor;

  return (
    <Link
      href={`/match/${fixture.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-flood/5 bg-pitch-800 p-4 pl-6 transition-colors hover:border-flood/15"
    >
      <MomentumEdge homeColor={homeColor} awayColor={awayColor} momentum={momentum} />
      {/* subtle momentum glow — content cards stay opaque, no glass (§8) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full opacity-[0.07] blur-2xl"
        style={{ background: glowColor }}
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <StagePill stage={fixture.stage} />
        <StatusBlock fixture={fixture} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={fixture.home} align="left" />
        <div className="px-1 text-center">
          {played ? (
            <>
              <div className="score-display text-3xl text-flood">
                {fixture.home_score ?? 0}–{fixture.away_score ?? 0}
              </div>
              {fixture.penalties && (
                <div className="data-nums text-[10px] text-flood-dim">
                  {fixture.penalties.home}–{fixture.penalties.away} pens
                </div>
              )}
            </>
          ) : (
            <div className="score-display text-xl text-flood-dim/60">vs</div>
          )}
        </div>
        <TeamSide team={fixture.away} align="right" />
      </div>
      {fixture.venue && (
        <div className="mt-3 truncate text-[11px] text-flood-dim/70">{fixture.venue}</div>
      )}
    </Link>
  );
}

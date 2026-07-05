import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventsTimeline from "@/components/EventsTimeline";
import Flag from "@/components/Flag";
import HotTakeCard from "@/components/HotTakeCard";
import OddsShift from "@/components/OddsShift";
import PredictionMeter from "@/components/PredictionMeter";
import ShareButton from "@/components/ShareButton";
import StagePill from "@/components/StagePill";
import TeamSignalSheet from "@/components/TeamSignalSheet";
import {
  getFixtureById,
  getFixtures,
  getHotTakes,
  getOddsForFixture,
  getPredictions,
} from "@/lib/data";
import { hostCity, textOnCity } from "@/lib/cities";
import { kickoffDate, kickoffTime } from "@/lib/format";
import { SIGNAL_LIME } from "@/lib/teamColors";
import { teamTournamentStats } from "@/lib/teamStats";

export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fixture = await getFixtureById(Number(id));
  if (!fixture) return { title: "Match" };
  const title =
    fixture.status === "NS"
      ? `${fixture.home?.code ?? "TBD"} v ${fixture.away?.code ?? "TBD"}`
      : `${fixture.home?.code ?? "?"} ${fixture.home_score}–${fixture.away_score} ${fixture.away?.code ?? "?"}`;
  return { title };
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const fixtureId = Number(id);
  if (!Number.isFinite(fixtureId)) notFound();

  const fixture = await getFixtureById(fixtureId);
  if (!fixture) notFound();

  const [odds, takes, predictions, allFixtures] = await Promise.all([
    getOddsForFixture(fixtureId),
    getHotTakes(fixtureId),
    getPredictions([fixtureId]),
    getFixtures(),
  ]);

  const played = fixture.status !== "NS";
  const live = fixture.status === "LIVE" || fixture.status === "HT";
  const chance = predictions.get(fixtureId) ?? null;

  // Signal favor: the higher-percentage side sets the page's color register.
  const favHome = chance ? chance.home >= chance.away : null;
  const favTeam = favHome == null ? null : favHome ? fixture.home : fixture.away;
  const favColor = favTeam?.primary_color ?? SIGNAL_LIME;
  const favPct = chance ? Math.round((favHome ? chance.home : chance.away) * 100) : null;

  const homeStats =
    fixture.home_team != null ? teamTournamentStats(allFixtures, fixture.home_team) : null;
  const awayStats =
    fixture.away_team != null ? teamTournamentStats(allFixtures, fixture.away_team) : null;

  const shareText =
    fixture.home && fixture.away
      ? chance && !played
        ? `${fixture.home.name} v ${fixture.away.name} — Signalroom win chance: ${fixture.home.code} ${Math.round(chance.home * 100)}% · ${fixture.away.code} ${Math.round(chance.away * 100)}%.`
        : `${fixture.home.name} ${fixture.home_score ?? ""}–${fixture.away_score ?? ""} ${fixture.away.name} — Worldcup Signalroom.`
      : "Worldcup Signalroom — winning the knockouts.";

  // Signalroom win chance for the favored side: Elo learned from every
  // cached result, anchored to the market. Editorial context only (§3.4).
  let meter: { label: string; probability: number; color: string } | null = null;
  if (chance && fixture.home && fixture.away && !played) {
    const favHome = chance.home >= chance.away;
    const fav = favHome ? fixture.home : fixture.away;
    meter = {
      label: `Signalroom win chance — ${fav.name}`,
      probability: favHome ? chance.home : chance.away,
      color: fav.primary_color ?? SIGNAL_LIME,
    };
  }

  return (
    <div className="pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StagePill stage={fixture.stage} />
        <span className="data-nums text-xs text-flood-dim">
          {kickoffDate(fixture.kickoff)} · {kickoffTime(fixture.kickoff)}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </span>
        {(() => {
          const city = hostCity(fixture.venue);
          return city ? (
            <span
              className="data-nums rounded-md px-2 py-1 text-[10px] font-bold tracking-[0.1em]"
              style={{ background: city.color, color: textOnCity(city.color) }}
            >
              {city.name} 26
            </span>
          ) : null;
        })()}
        <span className="ml-auto">
          <ShareButton
            title="Worldcup Signalroom"
            text={shareText}
            url={`/match/${fixture.id}`}
          />
        </span>
      </div>

      {favTeam && favPct != null && !played && (
        <div
          className="data-nums mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-[0.14em]"
          style={{ borderColor: favColor, color: favColor }}
        >
          ⚽ SIGNAL FAVORS {favTeam.name.toUpperCase()} · {favPct}%
        </div>
      )}

      {/* scoreboard — tinted toward the favored side */}
      <div
        className="relative mb-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 overflow-hidden rounded-3xl border border-flood/5 bg-pitch-800 p-6 md:p-10"
        style={
          favTeam && !played
            ? {
                background: `linear-gradient(${favHome ? 105 : 255}deg, ${favColor}2e 0%, rgba(16,30,23,0) 55%), #101E17`,
              }
            : undefined
        }
      >
        {favTeam && !played && (
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-[0.08] blur-[2px] ${favHome ? "-left-8" : "-right-8"}`}
          >
            <Flag team={favTeam} size={220} />
          </span>
        )}
        <div className="relative flex flex-col items-center gap-3 text-center">
          <Flag team={fixture.home} size={favHome === true ? 64 : 56} />
          <div>
            <div
              className="font-display text-xl font-black md:text-2xl"
              style={{ color: favHome === true ? favColor : "#F5F2E8" }}
            >
              {fixture.home?.name ?? "TBD"}
            </div>
            <div className="data-nums text-xs text-flood-dim">{fixture.home?.code ?? ""}</div>
            {chance && !played && (
              <div className="data-nums mt-1 text-lg font-bold text-lime" title="Signalroom win chance">
                {Math.round(chance.home * 100)}%
              </div>
            )}
          </div>
        </div>
        <div className="text-center">
          {played ? (
            <>
              <div className="score-display text-6xl text-flood md:text-8xl">
                {fixture.home_score ?? 0}–{fixture.away_score ?? 0}
              </div>
              {fixture.penalties && (
                <div className="data-nums mt-1 text-sm text-flood-dim">
                  {fixture.penalties.home}–{fixture.penalties.away} on penalties
                </div>
              )}
              <div className="mt-2">
                {live ? (
                  <span className="flex items-center justify-center gap-2 text-sm font-bold text-lime">
                    <span className="live-dot inline-block size-2.5 rounded-full bg-lime" />
                    {fixture.status === "HT" ? "HALF TIME" : `${fixture.elapsed ?? "—"}'`}
                  </span>
                ) : (
                  <span className="data-nums text-sm font-semibold text-flood-dim">
                    {fixture.status === "PEN" ? "FULL TIME · PENALTIES" : "FULL TIME"}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="score-display text-4xl text-flood-dim/50 md:text-6xl">vs</div>
          )}
        </div>
        <div className="relative flex flex-col items-center gap-3 text-center">
          <Flag team={fixture.away} size={favHome === false ? 64 : 56} />
          <div>
            <div
              className="font-display text-xl font-black md:text-2xl"
              style={{ color: favHome === false ? favColor : "#F5F2E8" }}
            >
              {fixture.away?.name ?? "TBD"}
            </div>
            <div className="data-nums text-xs text-flood-dim">{fixture.away?.code ?? ""}</div>
            {chance && !played && (
              <div className="data-nums mt-1 text-lg font-bold text-lime" title="Signalroom win chance">
                {Math.round(chance.away * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-8">
          {fixture.events?.length ? (
            <section>
              <h2 className="mb-4 font-display text-xl font-black text-flood">How it happened</h2>
              <EventsTimeline fixture={fixture} />
            </section>
          ) : null}

          {takes.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-black text-flood">The Signals</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {takes.map((take) => (
                  <HotTakeCard
                    key={take.id}
                    take={take}
                    colors={[
                      fixture.home?.primary_color ?? SIGNAL_LIME,
                      fixture.away?.primary_color ?? "#F5F2E8",
                    ]}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {meter && (
            <PredictionMeter
              label={meter.label}
              probability={meter.probability}
              color={meter.color}
            />
          )}
          <OddsShift snapshots={odds} home={fixture.home} away={fixture.away} />
        </div>
      </div>

      {homeStats && awayStats && (
        <section className="mt-12">
          <h2 className="mb-1 font-display text-xl font-black text-flood">
            The numbers behind the signal
          </h2>
          <p className="mb-5 text-sm text-flood-dim">
            Tournament sheets computed from every cached result and goal
            timeline — the same data the prediction loop learns from.
          </p>
          <TeamSignalSheet
            home={{ team: fixture.home, stats: homeStats }}
            away={{ team: fixture.away, stats: awayStats }}
            favHome={played ? null : favHome}
          />
        </section>
      )}
    </div>
  );
}

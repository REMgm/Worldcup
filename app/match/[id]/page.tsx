import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventsTimeline from "@/components/EventsTimeline";
import Flag from "@/components/Flag";
import HotTakeCard from "@/components/HotTakeCard";
import OddsShift from "@/components/OddsShift";
import PredictionMeter from "@/components/PredictionMeter";
import StagePill from "@/components/StagePill";
import { getFixtureById, getHotTakes, getOddsForFixture } from "@/lib/data";
import { kickoffDate, kickoffTime } from "@/lib/format";
import { SIGNAL_LIME } from "@/lib/teamColors";

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

  const [odds, takes] = await Promise.all([
    getOddsForFixture(fixtureId),
    getHotTakes(fixtureId),
  ]);

  const matchWinner = odds.filter((o) => o.market === "match_winner");
  const latestOdds = matchWinner[matchWinner.length - 1];
  const played = fixture.status !== "NS";
  const live = fixture.status === "LIVE" || fixture.status === "HT";

  // Market-implied chance to advance for the favored side: win prob plus
  // half the draw (knockout ties resolve). Editorial context only (§3.4).
  let meter: { label: string; probability: number; color: string } | null = null;
  if (latestOdds && fixture.home && fixture.away && !played) {
    const draw = latestOdds.values.draw ?? 0;
    const homeAdv = (latestOdds.values.home ?? 0) + draw / 2;
    const awayAdv = (latestOdds.values.away ?? 0) + draw / 2;
    const favHome = homeAdv >= awayAdv;
    const fav = favHome ? fixture.home : fixture.away;
    meter = {
      label: `Market-implied chance ${fav.name} advance`,
      probability: favHome ? homeAdv : awayAdv,
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
      </div>

      {/* scoreboard */}
      <div className="mb-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-3xl border border-flood/5 bg-pitch-800 p-6 md:p-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <Flag team={fixture.home} size={56} />
          <div>
            <div className="font-display text-xl font-black text-flood md:text-2xl">
              {fixture.home?.name ?? "TBD"}
            </div>
            <div className="data-nums text-xs text-flood-dim">{fixture.home?.code ?? ""}</div>
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
        <div className="flex flex-col items-center gap-3 text-center">
          <Flag team={fixture.away} size={56} />
          <div>
            <div className="font-display text-xl font-black text-flood md:text-2xl">
              {fixture.away?.name ?? "TBD"}
            </div>
            <div className="data-nums text-xs text-flood-dim">{fixture.away?.code ?? ""}</div>
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
              <h2 className="mb-4 font-display text-xl font-black text-flood">The takes</h2>
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
    </div>
  );
}

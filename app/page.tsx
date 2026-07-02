import Link from "next/link";
import BracketTree from "@/components/BracketTree";
import Hero from "@/components/Hero";
import HotTakeCard from "@/components/HotTakeCard";
import MatchCard from "@/components/MatchCard";
import { getFixtures, getHotTakes, getLiveSnapshot, isDemoData } from "@/lib/data";
import { SIGNAL_LIME } from "@/lib/teamColors";

// Cache-first (§0.2): pages render from the Supabase cache (or demo data)
// on an ISR window — the client never talks to a football provider.
export const revalidate = 60;

export default async function Home() {
  const [fixtures, { live, today }, takes, demo] = await Promise.all([
    getFixtures(),
    getLiveSnapshot(),
    getHotTakes(),
    isDemoData(),
  ]);

  const upcoming = fixtures
    .filter((f) => f.status === "NS" && new Date(f.kickoff).getTime() > Date.now())
    .slice(0, 4);
  const slate = [...live, ...today.filter((f) => !live.some((l) => l.id === f.id))].slice(0, 6);
  const cards = slate.length ? slate : upcoming;
  const takesById = new Map(fixtures.map((f) => [f.id, f]));

  return (
    <>
      <Hero />

      <section id="today" className="mb-14 scroll-mt-20">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-black text-flood">
            {slate.length ? "Today's slate" : "Up next"}
          </h2>
          <Link href="/bracket" className="text-sm font-medium text-lime hover:underline">
            Full bracket →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((f) => (
            <MatchCard key={f.id} fixture={f} />
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="mb-1 font-display text-2xl font-black text-flood">The takes</h2>
        <p className="mb-5 text-sm text-flood-dim">
          Every take ships with the stat that justifies it. Tap to see the receipts.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {takes.slice(0, 3).map((take) => {
            const f = take.fixture_id != null ? takesById.get(take.fixture_id) : null;
            return (
              <HotTakeCard
                key={take.id}
                take={take}
                colors={[
                  f?.home?.primary_color ?? SIGNAL_LIME,
                  f?.away?.primary_color ?? "#F5F2E8",
                ]}
              />
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-black text-flood">The road to the final</h2>
          <Link href="/bracket" className="text-sm font-medium text-lime hover:underline">
            Open →
          </Link>
        </div>
        <BracketTree fixtures={fixtures.filter((f) => f.stage !== "R32")} />
      </section>

      {demo && (
        <p className="data-nums text-[10px] tracking-[0.14em] text-flood-dim/60">
          DEMO DATA — connect Supabase + API-Football keys to go live (see README)
        </p>
      )}
    </>
  );
}

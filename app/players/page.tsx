import type { Metadata } from "next";
import PlayerCard from "@/components/PlayerCard";
import PlayerCarousel from "@/components/PlayerCarousel";
import { getPlayersWithForm } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Form leaderboard",
  description: "Who's actually in form — five-snapshot trends, xG and ratings.",
};

export default async function PlayersPage() {
  const players = await getPlayersWithForm();
  const ranked = [...players].sort((a, b) => {
    const ra = a.form[a.form.length - 1]?.rating ?? 0;
    const rb = b.form[b.form.length - 1]?.rating ?? 0;
    return rb - ra;
  });

  return (
    <div className="pt-8">
      <p className="data-nums mb-2 text-[11px] font-semibold tracking-[0.3em] text-lime">
        FORM LEADERBOARD
      </p>
      <h1 className="mb-2 font-display text-4xl font-black text-flood md:text-5xl">
        Who&rsquo;s hot
      </h1>
      <p className="mb-8 max-w-lg text-sm text-flood-dim">
        Five-day form trends from the tournament data. Tap a card for the stat
        sheet. Caricatures land as the art queue drains — photos stand in.
      </p>

      {/* mobile: elastic drag carousel (§9) */}
      <PlayerCarousel players={ranked} />

      {/* desktop grid */}
      <div className="hidden gap-4 md:grid md:grid-cols-3 lg:grid-cols-4">
        {ranked.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}

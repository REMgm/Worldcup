import type { Metadata } from "next";
import BracketTree from "@/components/BracketTree";
import { getFixtures } from "@/lib/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Bracket",
  description: "The full knockout bracket, drawn live.",
};

export default async function BracketPage() {
  const fixtures = await getFixtures();

  return (
    <div className="pt-8">
      <p className="data-nums mb-2 text-[11px] font-semibold tracking-[0.3em] text-lime">
        KNOCKOUT
      </p>
      <h1 className="mb-2 font-display text-4xl font-black text-flood md:text-5xl">
        The bracket
      </h1>
      <p className="mb-8 max-w-lg text-sm text-flood-dim">
        Winners&rsquo; paths draw in their colors. Tap any tie for momentum,
        market moves and the takes.
      </p>
      <BracketTree fixtures={fixtures} />
    </div>
  );
}

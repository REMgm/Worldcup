import type { Metadata } from "next";
import BracketTree from "@/components/BracketTree";
import { getFixtures, getPredictions } from "@/lib/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "The Knockout",
  description: "The full knockout bracket, drawn live, with win-chance signals.",
};

export default async function BracketPage() {
  const [fixtures, predictions] = await Promise.all([
    getFixtures(),
    getPredictions(),
  ]);

  return (
    <div className="pt-8">
      <p className="data-nums mb-2 text-[11px] font-semibold tracking-[0.3em] text-lime">
        SIGNALROOM
      </p>
      <h1 className="mb-2 font-display text-4xl font-black text-flood md:text-5xl">
        The Knockout
      </h1>
      <p className="mb-8 max-w-lg text-sm text-flood-dim">
        Winners&rsquo; paths draw in their colors; percentages are the
        Signalroom&rsquo;s win chances, recomputed after every result. Tap any
        tie for momentum, market moves and the signals.
      </p>
      <BracketTree fixtures={fixtures} predictions={Object.fromEntries(predictions)} />
    </div>
  );
}

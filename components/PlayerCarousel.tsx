"use client";

import PlayerCard from "@/components/PlayerCard";
import type { PlayerWithForm } from "@/lib/types";

/**
 * Mobile carousel (§9). Native horizontal scroll with snap points instead
 * of a pointer-only drag surface: touch keeps its elastic feel, and
 * keyboard/screen-reader users can reach every card without the viewport
 * desyncing. Desktop shows the grid instead — this renders only below md.
 */
export default function PlayerCarousel({ players }: { players: PlayerWithForm[] }) {
  return (
    <div
      className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:hidden"
      aria-label="Player form cards"
    >
      {players.map((p) => (
        <div key={p.id} className="w-64 shrink-0 snap-center">
          <PlayerCard player={p} />
        </div>
      ))}
    </div>
  );
}

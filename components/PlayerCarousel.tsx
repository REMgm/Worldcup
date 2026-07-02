"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import type { PlayerWithForm } from "@/lib/types";

/**
 * Mobile carousel (§9): Framer drag="x" with elastic constraints. Desktop
 * shows the grid instead — this renders only below md.
 */
export default function PlayerCarousel({ players }: { players: PlayerWithForm[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragLimit, setDragLimit] = useState(0);

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current?.offsetWidth ?? 0;
      const track = trackRef.current?.scrollWidth ?? 0;
      setDragLimit(Math.max(0, track - viewport));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [players.length]);

  return (
    <div ref={viewportRef} className="overflow-hidden md:hidden">
      <motion.div
        ref={trackRef}
        className="flex gap-4"
        drag="x"
        dragConstraints={{ left: -dragLimit, right: 0 }}
        dragElastic={0.12}
      >
        {players.map((p) => (
          <div key={p.id} className="w-64 shrink-0">
            <PlayerCard player={p} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

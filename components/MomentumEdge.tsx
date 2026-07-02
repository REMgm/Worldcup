"use client";

import { motion } from "framer-motion";

/**
 * MatchCard momentum color edge (§7): a 3px gradient between the two team
 * colors whose balance point tracks the momentum score. Framer animates the
 * gradient over 1.2s ease when the score shifts.
 */
export default function MomentumEdge({
  homeColor,
  awayColor,
  momentum, // -1 home … +1 away
}: {
  homeColor: string;
  awayColor: string;
  momentum: number;
}) {
  const mid = 50 - momentum * 35; // more home momentum → home color reaches further down
  const gradient = `linear-gradient(180deg, ${homeColor} 0%, ${homeColor} ${Math.max(4, mid - 16)}%, ${awayColor} ${Math.min(96, mid + 16)}%, ${awayColor} 100%)`;
  return (
    <motion.span
      aria-hidden
      className="absolute inset-y-2 left-0 w-[3px] rounded-full"
      initial={false}
      animate={{ background: gradient }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    />
  );
}

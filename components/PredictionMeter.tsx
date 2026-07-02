"use client";

import { motion } from "framer-motion";
import { useCountUp, usePrefersReducedMotion } from "@/lib/motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

/**
 * Animated gauge with spring physics (§6). Shows the market-implied chance
 * for the favored side — framed as context, never a tip.
 */
export default function PredictionMeter({
  label,
  probability, // 0..1
  color = "#C8F542",
}: {
  label: string;
  probability: number;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = usePrefersReducedMotion();
  const p = Math.max(0, Math.min(1, probability));
  const pct = useCountUp(p * 100, { active: inView });

  // 180° arc, radius 80, centered at (100, 95).
  const angle = inView ? -180 + p * 180 : -180;

  return (
    <div
      ref={ref}
      className="flex flex-col items-center rounded-2xl border border-flood/5 bg-pitch-800 p-5"
    >
      <svg viewBox="0 0 200 110" className="w-full max-w-56" aria-hidden>
        <path
          d="M20 95 A80 80 0 0 1 180 95"
          fill="none"
          stroke="#F5F2E8"
          strokeOpacity="0.08"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <motion.path
          d="M20 95 A80 80 0 0 1 180 95"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          initial={{ pathLength: reduced ? p : 0 }}
          animate={{ pathLength: inView ? p : 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 20 }
          }
        />
        {/* needle — transformBox: view-box makes the origin resolve in SVG
            user units, so it pivots on the gauge hub, not its own bbox */}
        <motion.line
          x1="100"
          y1="95"
          x2="172"
          y2="95"
          stroke="#F5F2E8"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transformBox: "view-box", transformOrigin: "100px 95px" }}
          initial={{ rotate: -180 }}
          animate={{ rotate: angle }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 14 }
          }
        />
        <circle cx="100" cy="95" r="5" fill="#F5F2E8" />
      </svg>
      <div className="data-nums -mt-2 text-4xl font-bold" style={{ color }}>
        {pct}%
      </div>
      <div className="mt-1 text-center text-xs text-flood-dim">{label}</div>
    </div>
  );
}

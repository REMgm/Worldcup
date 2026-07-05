"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/motion";
import type { FormSnapshot } from "@/lib/types";

/**
 * Five-snapshot rating sparkline (§6). The path draws itself on viewport
 * entry; static under reduced motion.
 */
export default function FormSparkline({
  form,
  width = 132,
  height = 36,
  color = "#C8F542",
}: {
  form: FormSnapshot[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ratings = form
    .map((f) => f.rating)
    .filter((r): r is number => r != null)
    .slice(-5);
  if (ratings.length < 2) return null;

  const min = Math.min(...ratings) - 0.2;
  const max = Math.max(...ratings) + 0.2;
  const pad = 4;
  const points = ratings.map((r, i) => {
    const x = pad + (i / (ratings.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (r - min) / (max - min)) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-label={`Form trend: ${ratings[0].toFixed(1)} to ${ratings[ratings.length - 1].toFixed(1)}`}
    >
      <motion.path
        d={d}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduced ? 1 : 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

"use client";

import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { fireConfetti } from "@/lib/confetti";
import { usePrefersReducedMotion } from "@/lib/motion";

// Ease-out with a small overshoot so the needle swings past the target and
// settles back — reads as spring physics without detaching from the hub.
function easeOutBack(t: number): number {
  const c1 = 1.0;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const CX = 100;
const CY = 95;
const NEEDLE_R = 72;
const SWEEP_MS = 1200; // §7 hard cap

/**
 * Signalroom win-chance gauge (§6). The needle is drawn from the hub to a
 * point computed off the animated angle, so it is geometrically anchored to
 * the center at every frame. On viewport entry it sweeps 0 → predicted
 * percentage (arc, needle and count-up in lockstep) and lands with an
 * energy burst. Reduced motion: jump to final, no burst.
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
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const burstFired = useRef(false);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setProgress(1);
      setDone(true);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SWEEP_MS);
      setProgress(easeOutBack(t));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setProgress(1);
        setDone(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced]);

  // The energy burst: team-colored spray from the gauge as the needle lands.
  useEffect(() => {
    if (!done || reduced || burstFired.current || !ref.current) return;
    burstFired.current = true;
    const rect = ref.current.getBoundingClientRect();
    fireConfetti({
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
      colors: [color, "#F5F2E8"],
      particleCount: 120,
    });
  }, [done, reduced, color]);

  const sweep = Math.max(0, progress) * p; // fraction of the semicircle
  const angle = (-180 + Math.min(sweep, 1) * 180) * (Math.PI / 180);
  const x2 = CX + NEEDLE_R * Math.cos(angle);
  const y2 = CY + NEEDLE_R * Math.sin(angle);
  const pct = Math.round(Math.min(sweep, 1) * 100);

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
        <path
          d="M20 95 A80 80 0 0 1 180 95"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${Math.min(sweep, 1)} 1`}
          style={done ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
        />
        {/* needle — endpoint computed from the animated angle, always hub-anchored */}
        <line
          x1={CX}
          y1={CY}
          x2={x2}
          y2={y2}
          stroke="#F5F2E8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r="5" fill="#F5F2E8" />
      </svg>
      <div
        className={`data-nums -mt-2 text-4xl font-bold ${done && !reduced ? "meter-land" : ""}`}
        style={{ color }}
      >
        {pct}%
      </div>
      <div className="mt-1 text-center text-xs text-flood-dim">{label}</div>
    </div>
  );
}

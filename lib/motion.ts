"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

// ---- Springs (§7) ----
export const snap: Transition = { type: "spring", stiffness: 500, damping: 30 }; // chips, pills
export const bounce: Transition = { type: "spring", stiffness: 300, damping: 14 }; // stat slide-ins
export const settle: Transition = { type: "spring", stiffness: 120, damping: 20 }; // cards, page elements

// ---- Variants ----

/** Stat slide-in: x -24→0, opacity 0→1, `bounce`. Use inside a
 *  `staggerChildren` container for the 0.06s per-stat cascade. */
export const statSlide: Variants = {
  hidden: { x: -24, opacity: 0 },
  show: { x: 0, opacity: 1, transition: bounce },
};

export const statStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const cardIn: Variants = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: settle },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

/**
 * Single global reduced-motion check (§7 hard rule). Confetti, loops and
 * count-ups all consult this one hook. Client components only.
 */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

/** Imperative check for non-React call sites (confetti event bus). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animated number count-up: 0.8s, easeOut. Under reduced motion it jumps
 * straight to the final value (§7).
 */
export function useCountUp(
  target: number,
  opts: { duration?: number; decimals?: number; active?: boolean } = {},
): string {
  const { duration = 0.8, decimals = 0, active = true } = opts;
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reduced || duration <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setValue(target * easeOutCubic(t));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, reduced, active]);

  return value.toFixed(decimals);
}

"use client";

import { prefersReducedMotion } from "@/lib/motion";

export interface ConfettiBurst {
  /** Normalized origin (0–1). Defaults to center-ish. */
  x?: number;
  y?: number;
  colors?: string[];
  particleCount?: number;
}

export const CONFETTI_EVENT = "wcp:confetti";

/**
 * Event-bus trigger for the ConfettiLayer portal (§6/§7). Any client
 * component can fire a burst; the layer owns the canvas. No-op under
 * `prefers-reduced-motion` — the single global guard lives here so
 * callers never need their own check.
 */
export function fireConfetti(burst: ConfettiBurst = {}): void {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;
  window.dispatchEvent(new CustomEvent<ConfettiBurst>(CONFETTI_EVENT, { detail: burst }));
}

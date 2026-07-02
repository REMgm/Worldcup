"use client";

import { useEffect, useRef } from "react";
import type { CreateTypes } from "canvas-confetti";
import { CONFETTI_EVENT, type ConfettiBurst } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { SIGNAL_LIME } from "@/lib/teamColors";

/**
 * Confetti portal (§6/§7). One fixed canvas, fired through the
 * `fireConfetti` event bus: spicy take reveals, live goal events.
 * canvas-confetti is loaded lazily on the first burst.
 */
export default function ConfettiLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<CreateTypes | null>(null);

  useEffect(() => {
    let disposed = false;

    const handler = async (event: Event) => {
      if (prefersReducedMotion()) return; // §7 hard rule
      const burst = (event as CustomEvent<ConfettiBurst>).detail ?? {};
      if (!confettiRef.current && canvasRef.current) {
        const mod = await import("canvas-confetti");
        if (disposed || !canvasRef.current) return;
        confettiRef.current = mod.default.create(canvasRef.current, {
          resize: true,
          useWorker: true,
        });
      }
      confettiRef.current?.({
        particleCount: burst.particleCount ?? 350,
        spread: 75,
        startVelocity: 42,
        decay: 0.9,
        ticks: 160, // ~0.8s of life (§7: 350 count, 0.8s)
        origin: { x: burst.x ?? 0.5, y: burst.y ?? 0.6 },
        colors: burst.colors?.length ? burst.colors : [SIGNAL_LIME, "#F5F2E8"],
        disableForReducedMotion: true,
      });
    };

    window.addEventListener(CONFETTI_EVENT, handler);
    return () => {
      disposed = true;
      window.removeEventListener(CONFETTI_EVENT, handler);
      confettiRef.current?.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
    />
  );
}

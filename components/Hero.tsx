"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * Hero (§6/§8): photoreal stadium-atmosphere placeholder built from layered
 * gradients (floodlight haze, pitch glow, crowd bokeh) with light parallax.
 * Swap the background stack for the Higgsfield key visual when the asset
 * lands — the content layer stays as-is. The tournament pulse line draws
 * once on load.
 */
export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "22%"]);
  const hazeY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "36%"]);

  return (
    <section
      ref={ref}
      className="relative -mx-4 mb-8 flex items-end overflow-hidden md:mb-12 md:min-h-[66vh] md:rounded-b-3xl"
    >
      {/* --- photoreal atmosphere placeholder stack --- */}
      <motion.div aria-hidden style={{ y: bgY }} className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,#21382b_0%,#101e17_45%,#060d09_100%)]" />
        {/* floodlights */}
        <div className="absolute -top-24 left-[12%] h-96 w-40 rotate-[18deg] bg-[radial-gradient(closest-side,rgba(245,242,232,0.14),transparent)] blur-2xl" />
        <div className="absolute -top-24 right-[12%] h-96 w-40 -rotate-[18deg] bg-[radial-gradient(closest-side,rgba(245,242,232,0.12),transparent)] blur-2xl" />
        {/* wet-pitch reflection */}
        <div className="absolute bottom-0 h-40 w-full bg-[linear-gradient(180deg,transparent,rgba(200,245,66,0.05))]" />
        {/* WC26 geometric shape-language (kit palette, marks-free) */}
        <svg
          aria-hidden
          viewBox="0 0 240 240"
          className="absolute -right-10 top-10 size-52 opacity-[0.14] md:right-6 md:size-72"
        >
          <path d="M0 120 A120 120 0 0 1 120 0 H240 V120 Z" fill="#6C2BD9" />
          <path d="M0 120 H120 V240 A120 120 0 0 1 0 120 Z" fill="#52F5C3" />
          <path d="M120 120 H240 V240 A120 120 0 0 0 120 120 Z" fill="#FF2D1A" />
          <circle cx="180" cy="60" r="34" fill="#2653F1" />
        </svg>
      </motion.div>
      {/* crowd bokeh */}
      <motion.div aria-hidden style={{ y: hazeY }} className="absolute inset-0 opacity-40">
        <div className="absolute left-[8%] top-[30%] size-2 rounded-full bg-flood/50 blur-[2px]" />
        <div className="absolute left-[22%] top-[22%] size-1.5 rounded-full bg-lime/60 blur-[1px]" />
        <div className="absolute left-[64%] top-[18%] size-2 rounded-full bg-flood/40 blur-[2px]" />
        <div className="absolute left-[81%] top-[34%] size-1.5 rounded-full bg-flood/50 blur-[1px]" />
        <div className="absolute left-[43%] top-[12%] size-1 rounded-full bg-lime/50 blur-[1px]" />
      </motion.div>

      {/* --- content — compact on mobile so the live match card sits in the
             first viewport (squeezed top), full-bleed cinematic on desktop --- */}
      <div className="relative z-10 w-full px-4 pb-5 pt-8 md:px-8 md:pb-10 md:pt-32">
        <p className="data-nums mb-2 text-[11px] font-semibold tracking-[0.3em] text-lime md:mb-3">
          KNOCKOUT STAGE · LIVE
        </p>
        <h1 className="font-display text-4xl font-black leading-[0.92] tracking-tight text-flood md:text-8xl">
          WINNING THE
          <br />
          <span className="text-lime">KNOCKOUTS</span>
        </h1>
        <p className="mt-3 hidden max-w-md text-sm text-flood-dim sm:block md:text-base">
          Thirty-two teams walked in. One walks out. Live scores, market moves
          and takes with the receipts attached.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5 md:mt-6 md:gap-3">
          <Link
            href="/bracket"
            className="flex min-h-11 items-center rounded-full bg-lime px-5 text-sm font-bold text-pitch-900 transition-transform hover:scale-[1.03] md:px-6"
          >
            The Knockout
          </Link>
          <Link
            href="#today"
            className="flex min-h-11 items-center rounded-full border border-flood/20 px-5 text-sm font-semibold text-flood transition-colors hover:bg-pitch-700 md:px-6"
          >
            Today&apos;s Matches
          </Link>
        </div>

        {/* tournament pulse line */}
        <svg
          viewBox="0 0 600 40"
          className="mt-5 h-5 w-full max-w-2xl md:mt-10 md:h-8"
          fill="none"
          aria-hidden
        >
          <motion.path
            d="M0 20 H140 l10 -12 12 24 10 -12 H320 l8 -8 10 16 8 -8 H470 l12 -14 14 26 10 -12 H600"
            stroke="#C8F542"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{ filter: "drop-shadow(0 0 6px rgba(200,245,66,0.6))" }}
          />
        </svg>
      </div>
    </section>
  );
}

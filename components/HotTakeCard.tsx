"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useId, useRef, useState } from "react";
import { fireConfetti } from "@/lib/confetti";
import { buzz } from "@/lib/haptics";
import { settle, useCountUp } from "@/lib/motion";
import type { HotTake, TakeConfidence } from "@/lib/types";

const CONFIDENCE_META: Record<
  TakeConfidence,
  { label: string; className: string }
> = {
  certain: { label: "STONE COLD", className: "text-flood border-flood/30" },
  likely: { label: "LIKELY", className: "text-lime border-lime/40" },
  spicy: { label: "SPICY 🌶", className: "text-ember border-ember/40" },
};

function RevealedStat({ stat }: { stat: NonNullable<HotTake["revealed_stat"]> }) {
  const value = useCountUp(stat.value, {
    decimals: stat.decimals ?? 0,
    active: true,
  });
  return (
    <div className="mt-4 rounded-xl bg-pitch-700 px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-flood-dim">
        {stat.label}
      </div>
      <div className="data-nums text-3xl font-bold text-lime">
        {stat.prefix ?? ""}
        {value}
        {stat.suffix ?? ""}
      </div>
    </div>
  );
}

/**
 * The signature interaction (§7): collapsed shows only the category chip and
 * a blurred headline. Tap → blur dissolves in 0.25s, the card expands with
 * `settle`, the justifying stat counts up. Spicy takes burst team-colored
 * confetti from the card's origin. The disclosure trigger is a real button
 * with aria-expanded/aria-controls; the revealed content lives outside it
 * so screen readers get headings and paragraphs, not a flattened label.
 */
export default function HotTakeCard({
  take,
  colors,
}: {
  take: HotTake;
  colors?: string[];
}) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const meta = CONFIDENCE_META[take.confidence] ?? CONFIDENCE_META.likely;

  const reveal = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    buzz(10);
    if (take.confidence === "spicy" && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      fireConfetti({
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
        colors,
        particleCount: 350,
      });
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      transition={settle}
      className="w-full rounded-2xl border border-flood/5 bg-pitch-800 p-5 transition-colors hover:border-flood/15"
    >
      <button
        type="button"
        onClick={reveal}
        aria-expanded={open}
        aria-controls={bodyId}
        className="block min-h-11 w-full cursor-pointer text-left"
      >
        <span
          className={`data-nums inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] ${meta.className}`}
        >
          {meta.label}
        </span>
        <span
          className={`take-blur mt-3 block font-display text-xl font-extrabold leading-tight text-flood ${open ? "revealed" : ""}`}
        >
          {take.headline}
        </span>
        {!open && (
          <span className="data-nums mt-2 block text-[10px] tracking-[0.2em] text-flood-dim">
            TAP TO REVEAL
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={settle}
            className="overflow-hidden"
          >
            <p className="mt-3 text-sm leading-relaxed text-flood-dim">{take.body}</p>
            {take.revealed_stat && <RevealedStat stat={take.revealed_stat} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

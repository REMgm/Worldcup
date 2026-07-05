"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import FormSparkline from "@/components/FormSparkline";
import StatChip from "@/components/StatChip";
import { settle, statSlide, statStagger, usePrefersReducedMotion } from "@/lib/motion";
import { SIGNAL_LIME } from "@/lib/teamColors";
import type { PlayerWithForm } from "@/lib/types";

function latest(p: PlayerWithForm) {
  return p.form[p.form.length - 1];
}

/**
 * Flip card (§6/§7): caricature (or licensed photo fallback) on the front,
 * stat sheet with staggered chips on the back. 3D rotateY with `settle`.
 * While the Higgsfield caricature queue drains, players without imagery get
 * a satirical placeholder monogram — never a near-photo AI likeness (§0.3).
 */
export default function PlayerCard({ player }: { player: PlayerWithForm }) {
  const [flipped, setFlipped] = useState(false);
  const reduced = usePrefersReducedMotion();
  const snap = latest(player);
  const teamColor = player.team?.primary_color ?? SIGNAL_LIME;
  const imageUrl = player.stylized_url ?? player.photo_url;
  const initials = player.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="h-80 w-full [perspective:1200px]">
      <motion.button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative block h-full w-full cursor-pointer text-left [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduced ? { duration: 0 } : settle}
        aria-pressed={flipped}
      >
        {/* front */}
        <div
          aria-hidden={flipped}
          className="absolute inset-0 overflow-hidden rounded-2xl border border-flood/5 bg-pitch-800 [backface-visibility:hidden]"
        >
          <div
            className="relative h-52 w-full"
            style={{
              background: `radial-gradient(120% 100% at 50% 0%, ${teamColor}33 0%, #101E17 70%)`,
            }}
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={player.name}
                fill
                sizes="(max-width: 768px) 70vw, 280px"
                className="object-cover object-top"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <span
                  className="font-display text-6xl font-black"
                  style={{ color: teamColor }}
                >
                  {initials}
                </span>
                <span className="data-nums text-[9px] tracking-[0.2em] text-flood-dim">
                  CARICATURE IN PRODUCTION
                </span>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="font-display text-lg font-extrabold leading-tight text-flood">
              {player.name}
            </div>
            <div className="data-nums mt-1 text-xs text-flood-dim">
              {player.position ?? "—"} · {player.team?.code ?? "—"}
            </div>
            {snap?.rating != null && (
              <div className="data-nums mt-3 inline-block rounded-full bg-pitch-700 px-3 py-1 text-sm font-bold text-lime">
                {snap.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {/* back */}
        <div
          aria-hidden={!flipped}
          className="absolute inset-0 overflow-hidden rounded-2xl border border-flood/10 bg-pitch-700 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <div className="font-display text-base font-extrabold text-flood">
            {player.name}
          </div>
          <div className="data-nums mb-3 text-[10px] tracking-[0.16em] text-flood-dim">
            TOURNAMENT SHEET
          </div>
          <motion.div
            className="grid grid-cols-2 gap-2"
            variants={statStagger}
            initial="hidden"
            animate={flipped ? "show" : "hidden"}
          >
            {[
              { label: "Goals", value: snap?.goals ?? 0, accent: true },
              { label: "Assists", value: snap?.assists ?? 0 },
              { label: "xG", value: snap?.xg?.toFixed(1) ?? "—" },
              { label: "Minutes", value: snap?.minutes ?? 0 },
            ].map((s) => (
              <motion.div key={s.label} variants={statSlide}>
                <StatChip label={s.label} value={s.value} accent={s.accent} />
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-flood-dim">
              Form, last 5 snapshots
            </div>
            <FormSparkline form={player.form} color={teamColor} />
          </div>
        </div>
      </motion.button>
    </div>
  );
}

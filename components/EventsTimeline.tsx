"use client";

import { motion } from "framer-motion";
import { statSlide, statStagger } from "@/lib/motion";
import type { FixtureWithTeams } from "@/lib/types";

function icon(type: string, detail: string): string {
  if (type === "goal") return "⚽";
  if (type === "card") return /red/i.test(detail) ? "🟥" : "🟨";
  if (type === "subst") return "🔁";
  if (type === "var") return "📺";
  return "•";
}

/** Match timeline with the §7 stat slide-in: x -24→0, `bounce`, 0.06s stagger. */
export default function EventsTimeline({ fixture }: { fixture: FixtureWithTeams }) {
  const events = [...(fixture.events ?? [])].sort((a, b) => a.minute - b.minute);
  if (!events.length) return null;

  return (
    <motion.ol
      className="space-y-2"
      variants={statStagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {events.map((ev, i) => {
        const isHome = ev.team_id === fixture.home_team;
        const team = isHome ? fixture.home : fixture.away;
        const isGoal = ev.type === "goal";
        return (
          <motion.li
            key={`${ev.minute}-${i}`}
            variants={statSlide}
            className={`flex items-center gap-3 rounded-xl bg-pitch-800 px-4 py-3 ${isGoal ? "border-l-2" : ""}`}
            style={isGoal ? { borderColor: team?.primary_color ?? "#C8F542" } : undefined}
          >
            <span className="data-nums w-10 shrink-0 text-sm font-bold text-flood-dim">
              {ev.minute}
              {ev.extra ? `+${ev.extra}` : ""}&rsquo;
            </span>
            <span aria-hidden>{icon(ev.type, ev.detail)}</span>
            <span className="sr-only">{ev.detail || ev.type}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm ${isGoal ? "font-bold text-flood" : "text-flood-dim"}`}>
                {ev.player ?? ev.detail}
              </span>
              {ev.assist && (
                <span className="block truncate text-xs text-flood-dim/70">
                  assist: {ev.assist}
                </span>
              )}
            </span>
            <span className="data-nums shrink-0 text-xs font-semibold text-flood-dim">
              {team?.code ?? ""}
            </span>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

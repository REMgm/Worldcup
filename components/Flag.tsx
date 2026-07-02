"use client";

import Image from "next/image";
import { useState } from "react";
import type { Team } from "@/lib/types";

/** Pick black/white text by background luminance so trigram tiles stay
 *  readable on dark kit colors (navy, deep red). */
function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#F5F2E8";
  const n = parseInt(m[1], 16);
  const luma = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luma > 140 ? "#0A1410" : "#F5F2E8";
}

function Tile({
  team,
  size,
  className,
}: {
  team: Team | null;
  size: number;
  className: string;
}) {
  const bg = team?.primary_color ?? "#21382b";
  return (
    <span
      style={{
        width: size,
        height: Math.round(size * 0.72),
        background: bg,
        color: textOn(bg),
        fontSize: Math.max(9, Math.round(size * 0.28)),
      }}
      className={`data-nums inline-flex shrink-0 items-center justify-center rounded-[3px] font-bold ${className}`}
    >
      {team?.code ?? "?"}
    </span>
  );
}

/** Team flag with a trigram tile fallback when the flag asset is missing or
 *  fails to load (provider URLs can 404). */
export default function Flag({
  team,
  size = 28,
  className = "",
}: {
  team: Team | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  if (!team?.flag_url || broken) {
    return <Tile team={team} size={size} className={className} />;
  }
  return (
    <Image
      src={team.flag_url}
      alt={`${team.name} flag`}
      width={size}
      height={Math.round(size * 0.72)}
      className={`shrink-0 rounded-[3px] object-cover ${className}`}
      style={{ width: size, height: Math.round(size * 0.72) }}
      onError={() => setBroken(true)}
    />
  );
}

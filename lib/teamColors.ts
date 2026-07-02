/** Kit colors per FIFA trigram, used for momentum edges, bracket paths and
 *  confetti particles. Fallback is the electric-lime signal color. */
export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  ARG: { primary: "#75AADB", secondary: "#FFFFFF" },
  AUS: { primary: "#FFB81C", secondary: "#00843D" },
  AUT: { primary: "#EF3340", secondary: "#FFFFFF" },
  BEL: { primary: "#E30613", secondary: "#FFCB05" },
  BRA: { primary: "#FFDC02", secondary: "#009C3B" },
  CAN: { primary: "#C8102E", secondary: "#FFFFFF" },
  COL: { primary: "#FCD116", secondary: "#003893" },
  CRO: { primary: "#FF0000", secondary: "#FFFFFF" },
  DEN: { primary: "#C8102E", secondary: "#FFFFFF" },
  ECU: { primary: "#FFDD00", secondary: "#034EA2" },
  EGY: { primary: "#CE1126", secondary: "#FFFFFF" },
  ENG: { primary: "#FFFFFF", secondary: "#CE1124" },
  ESP: { primary: "#AA151B", secondary: "#F1BF00" },
  FRA: { primary: "#21304D", secondary: "#EF4135" },
  GER: { primary: "#FFFFFF", secondary: "#000000" },
  GHA: { primary: "#FCD116", secondary: "#006B3F" },
  IRN: { primary: "#FFFFFF", secondary: "#DA0000" },
  ITA: { primary: "#0066B2", secondary: "#FFFFFF" },
  JPN: { primary: "#12239E", secondary: "#FFFFFF" },
  KOR: { primary: "#CD2E3A", secondary: "#FFFFFF" },
  KSA: { primary: "#006C35", secondary: "#FFFFFF" },
  MAR: { primary: "#C1272D", secondary: "#006233" },
  MEX: { primary: "#006847", secondary: "#CE1126" },
  NED: { primary: "#FF6600", secondary: "#21468B" },
  NOR: { primary: "#BA0C2F", secondary: "#00205B" },
  POL: { primary: "#FFFFFF", secondary: "#DC143C" },
  POR: { primary: "#C8102E", secondary: "#046A38" },
  SEN: { primary: "#00853F", secondary: "#FDEF42" },
  SRB: { primary: "#C6363C", secondary: "#0C4076" },
  SUI: { primary: "#DA291C", secondary: "#FFFFFF" },
  URU: { primary: "#7BAFD4", secondary: "#000000" },
  USA: { primary: "#B22234", secondary: "#3C3B6E" },
  UZB: { primary: "#0099B5", secondary: "#1EB53A" },
};

export const SIGNAL_LIME = "#C8F542";

export function teamColor(code: string | null | undefined): string {
  if (!code) return SIGNAL_LIME;
  return TEAM_COLORS[code]?.primary ?? SIGNAL_LIME;
}

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

export function colorDistance(a: string, b: string): number {
  const ca = rgb(a);
  const cb = rgb(b);
  if (!ca || !cb) return 255;
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
}

/**
 * Two distinguishable series colors for a matchup. When both kits are close
 * (Croatia red vs Morocco red), the away side falls back to its secondary
 * color, or neutral — a chart where both lines read identical is worse than
 * an off-kit color.
 */
export function matchupColors(
  home: { primary_color: string | null; secondary_color: string | null } | null,
  away: { primary_color: string | null; secondary_color: string | null } | null,
): { home: string; away: string } {
  const h = home?.primary_color ?? SIGNAL_LIME;
  let a = away?.primary_color ?? "#B9B7AC";
  if (colorDistance(h, a) < 90) {
    const secondary = away?.secondary_color;
    a = secondary && colorDistance(h, secondary) >= 90 ? secondary : "#B9B7AC";
  }
  return { home: h, away: a };
}

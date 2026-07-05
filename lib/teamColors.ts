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
  ALG: { primary: "#006233", secondary: "#FFFFFF" },
  PAR: { primary: "#D52B1E", secondary: "#0038A8" },
  CIV: { primary: "#FF8200", secondary: "#009A44" },
  SWE: { primary: "#FFCD00", secondary: "#006AA7" },
  COD: { primary: "#007FFF", secondary: "#F7D618" },
  BIH: { primary: "#002F6C", secondary: "#FCD116" },
  CPV: { primary: "#003893", secondary: "#F7D116" },
  RSA: { primary: "#007749", secondary: "#FFB81C" },
  JOR: { primary: "#CE1126", secondary: "#007A3D" },
  QAT: { primary: "#8A1538", secondary: "#FFFFFF" },
  TUN: { primary: "#E70013", secondary: "#FFFFFF" },
  PAN: { primary: "#DA121A", secondary: "#072357" },
  SCO: { primary: "#0065BF", secondary: "#FFFFFF" },
  TUR: { primary: "#E30A17", secondary: "#FFFFFF" },
  UKR: { primary: "#FFD700", secondary: "#0057B7" },
  NGA: { primary: "#008751", secondary: "#FFFFFF" },
};

/** API-Football fixture/topscorer team objects carry no trigram — derive it
 *  from the team name (providers that do send codes take precedence). */
export const NAME_TO_CODE: Record<string, string> = {
  argentina: "ARG", australia: "AUS", austria: "AUT", belgium: "BEL",
  brazil: "BRA", canada: "CAN", colombia: "COL", croatia: "CRO",
  denmark: "DEN", ecuador: "ECU", egypt: "EGY", england: "ENG",
  spain: "ESP", france: "FRA", germany: "GER", ghana: "GHA",
  iran: "IRN", "ir iran": "IRN", italy: "ITA", japan: "JPN",
  "south korea": "KOR", "korea republic": "KOR", "saudi arabia": "KSA",
  morocco: "MAR", mexico: "MEX", netherlands: "NED", norway: "NOR",
  poland: "POL", portugal: "POR", senegal: "SEN", serbia: "SRB",
  switzerland: "SUI", uruguay: "URU", "united states": "USA",
  usa: "USA", uzbekistan: "UZB", algeria: "ALG", paraguay: "PAR",
  "ivory coast": "CIV", "cote d'ivoire": "CIV", "côte d'ivoire": "CIV",
  sweden: "SWE", "congo dr": "COD", "dr congo": "COD",
  "bosnia-herzegovina": "BIH", "bosnia and herzegovina": "BIH",
  "cape verde": "CPV", "cabo verde": "CPV", "south africa": "RSA",
  jordan: "JOR", qatar: "QAT", tunisia: "TUN", panama: "PAN",
  scotland: "SCO", turkey: "TUR", "türkiye": "TUR", ukraine: "UKR",
  nigeria: "NGA", "new zealand": "NZL", wales: "WAL", greece: "GRE",
  romania: "ROU", slovakia: "SVK", slovenia: "SVN", czechia: "CZE",
  "costa rica": "CRC", honduras: "HON", jamaica: "JAM", chile: "CHI",
  peru: "PER", venezuela: "VEN", bolivia: "BOL", "curaçao": "CUW",
  curacao: "CUW", haiti: "HAI",
};

export function codeForName(name: string | null | undefined): string | null {
  if (!name) return null;
  return NAME_TO_CODE[name.trim().toLowerCase()] ?? null;
}

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

/**
 * WC26 host cities with the per-city palette from the tournament's visual
 * identity (color language only — no FIFA marks are reproduced). Venue
 * strings from the feed are matched by keyword.
 */
export interface HostCity {
  name: string;
  color: string;
}

const CITIES: Array<[RegExp, HostCity]> = [
  [/atlanta|mercedes-benz/i, { name: "ATLANTA", color: "#29C5D6" }],
  [/boston|foxborough|gillette/i, { name: "BOSTON", color: "#1E7A34" }],
  [/dallas|arlington|at&t/i, { name: "DALLAS", color: "#0E5A50" }],
  [/guadalajara|zapopan|akron/i, { name: "GUADALAJARA", color: "#E4287C" }],
  [/houston|nrg/i, { name: "HOUSTON", color: "#3B8EF2" }],
  [/kansas city|arrowhead/i, { name: "KANSAS CITY", color: "#E8173D" }],
  [/los angeles|inglewood|sofi/i, { name: "LOS ANGELES", color: "#FF6B57" }],
  [/mexico city|azteca/i, { name: "MEXICO CITY", color: "#7C3AED" }],
  [/miami|hard rock/i, { name: "MIAMI", color: "#F25CA2" }],
  [/monterrey|guadalupe|bbva/i, { name: "MONTERREY", color: "#2BC4A9" }],
  [/new york|new jersey|east rutherford|metlife/i, { name: "NEW YORK NEW JERSEY", color: "#1D2B6B" }],
  [/philadelphia|lincoln financial/i, { name: "PHILADELPHIA", color: "#2653F1" }],
  [/san francisco|santa clara|levi/i, { name: "SF BAY AREA", color: "#E8481C" }],
  [/seattle|lumen/i, { name: "SEATTLE", color: "#8A7D1C" }],
  [/toronto|bmo/i, { name: "TORONTO", color: "#2F4BE0" }],
  [/vancouver|bc place/i, { name: "VANCOUVER", color: "#1B4D3E" }],
];

export function hostCity(venue: string | null | undefined): HostCity | null {
  if (!venue) return null;
  for (const [pattern, city] of CITIES) {
    if (pattern.test(venue)) return city;
  }
  return null;
}

/** Black or floodlight-white text depending on the chip color's luminance. */
export function textOnCity(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#F5F2E8";
  const n = parseInt(m[1], 16);
  const luma = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luma > 140 ? "#0A1410" : "#F5F2E8";
}

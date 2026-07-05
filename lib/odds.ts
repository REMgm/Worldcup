/** Odds math shared by providers. Editorial context only (§3.4). */

/** Decimal odds → implied probabilities with the overround stripped. */
export function impliedProbabilities(
  odds: Record<string, number>,
): Record<string, number> {
  const inverted = Object.fromEntries(
    Object.entries(odds)
      .filter(([, v]) => typeof v === "number" && v > 1)
      .map(([k, v]) => [k, 1 / v]),
  );
  const total = Object.values(inverted).reduce((a, b) => a + b, 0);
  if (total <= 0) return {};
  return Object.fromEntries(
    Object.entries(inverted).map(([k, v]) => [k, Number((v / total).toFixed(4))]),
  );
}

/** American moneyline → decimal odds. +150 → 2.5, -150 → 1.667. */
export function americanToDecimal(ml: number): number | null {
  if (!Number.isFinite(ml) || ml === 0) return null;
  return ml > 0 ? 1 + ml / 100 : 1 + 100 / -ml;
}

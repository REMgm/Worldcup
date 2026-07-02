/** Capability-checked vibration wrapper (§9). Silent no-op where the
 *  Vibration API is missing (iOS Safari) — never a permission prompt. */
export function buzz(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore — haptics are best-effort garnish
  }
}

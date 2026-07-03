/** Display timezone: Netherlands (CEST, UTC+2 during the tournament).
 *  Formatted with a fixed IANA zone on the server, so SSR output is
 *  deterministic — no hydration drift from the viewer's locale. */
export const DISPLAY_TZ = "Europe/Amsterdam";

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TZ,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: DISPLAY_TZ,
});

const tzNameFmt = new Intl.DateTimeFormat("en-US", {
  timeZoneName: "short",
  timeZone: DISPLAY_TZ,
});

/** "CEST" / "CET" for the given instant. */
export function tzLabel(iso: string): string {
  const parts = tzNameFmt.formatToParts(new Date(iso));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "CEST";
}

/** e.g. "21:00 CEST" */
export function kickoffTime(iso: string): string {
  const d = new Date(iso);
  return `${timeFmt.format(d)} ${tzLabel(iso)}`;
}

/** e.g. "Jul 3" (in Netherlands time — a 00:30 CEST kickoff shows the NL date) */
export function kickoffDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

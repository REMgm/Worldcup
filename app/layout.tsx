import type { Metadata, Viewport } from "next";
import Link from "next/link";
import ConfettiLayer from "@/components/ConfettiLayer";
import LiveTicker from "@/components/LiveTicker";
// Type system (§8): condensed/expanded grotesque display, humanist body,
// tabular-nums mono for every number on the site. Self-hosted variable
// fonts (no build-time Google Fonts fetch).
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Worldcup Pulse — the knockout bracket, live",
    template: "%s · Worldcup Pulse",
  },
  description:
    "Live knockout bracket, match momentum, player form and prediction reveals. Editorial takes, not tips.",
  openGraph: {
    title: "Worldcup Pulse",
    description: "The knockout bracket is the product. Takes, not tips.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1410",
};

const NAV = [
  { href: "/", label: "Matches" },
  { href: "/bracket", label: "Bracket" },
  { href: "/players", label: "Form" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-pitch-900">
      <body className="min-h-dvh antialiased">
        <header className="sticky top-0 z-50 glass-overlay border-x-0 border-t-0">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link
              href="/"
              className="font-display text-lg font-black tracking-tight text-flood"
            >
              WORLDCUP<span className="text-lime">PULSE</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-flood-dim transition-colors hover:bg-pitch-700 hover:text-flood"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* Bottom padding keeps content clear of the thumb-anchored ticker (§9). */}
        <main className="mx-auto max-w-6xl px-4 pb-32 md:pb-20">{children}</main>

        <footer className="mx-auto max-w-6xl px-4 pb-40 pt-8 text-xs text-flood-dim/70 md:pb-24">
          <p>
            Odds shown as editorial context only — takes, not tips. No betting
            CTAs, no affiliates. Player imagery: satirical caricature register;
            licensed photos as fallback.
          </p>
        </footer>

        <LiveTicker />
        <ConfettiLayer />
      </body>
    </html>
  );
}

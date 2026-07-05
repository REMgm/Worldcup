"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Share affordance for signals and matches. Mobile gets the native share
 * sheet (WhatsApp, socials, everything the OS offers) via the Web Share
 * API; desktop falls back to a small menu with WhatsApp, X and copy-link.
 */
export default function ShareButton({
  title,
  text,
  url,
  compact = false,
}: {
  title: string;
  text: string;
  /** Absolute or app-relative URL; resolved against the origin at click time. */
  url?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const resolveUrl = () =>
    new URL(url ?? window.location.href, window.location.origin).toString();

  const share = async () => {
    const shareUrl = resolveUrl();
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        return; // user dismissed the sheet — don't pop the fallback menu
      }
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${resolveUrl()}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the menu links still work
    }
  };

  const message = () => encodeURIComponent(`${text} ${resolveUrl()}`);

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={share}
        aria-label="Share"
        aria-expanded={open}
        className={`flex items-center justify-center gap-1.5 rounded-full border border-flood/15 text-flood-dim transition-colors hover:bg-pitch-700 hover:text-flood ${
          compact ? "size-11" : "min-h-11 px-4 text-xs font-semibold"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.6 6.8-4.2M8.6 13.4l6.8 4.2" />
        </svg>
        {!compact && <span>Share</span>}
      </button>
      {open && (
        <div className="glass-overlay absolute bottom-full right-0 z-50 mb-2 w-44 rounded-xl p-1.5">
          <a
            href={`https://wa.me/?text=${message()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center rounded-lg px-3 text-sm text-flood hover:bg-pitch-700"
          >
            WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${message()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center rounded-lg px-3 text-sm text-flood hover:bg-pitch-700"
          >
            X / Twitter
          </a>
          <button
            type="button"
            onClick={copy}
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-sm text-flood hover:bg-pitch-700"
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}

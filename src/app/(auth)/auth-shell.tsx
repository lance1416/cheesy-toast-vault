"use client";

import type { ReactNode } from "react";
import Link from "next/link";

const TRUST_POINTS = [
  "Client-side AES-256-GCM encryption",
  "Zero-knowledge architecture",
  "Self-hosted, your hardware",
];

export default function AuthShell({
  children,
  cardLabel,
  above,
  footer,
}: {
  children: ReactNode;
  cardLabel: string;
  above?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}>
      {/* ── Left: decorative brand panel (lg+) ── */}
      <div className="hidden lg:flex w-96 shrink-0 flex-col bg-stone-900 px-10 py-10 relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 500px 400px at 20% 65%, rgba(217,119,6,0.13) 0%, transparent 70%)",
          }}
        />

        {/* Brand */}
        <Link href="/" className="relative z-10 flex items-center gap-2 group w-fit">
          <span className="text-lg select-none" aria-hidden="true">
            🧀
          </span>
          <span
            className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Cheesy Toast Vault
          </span>
        </Link>

        {/* Quote + trust points */}
        <div className="relative z-10 mt-auto mb-auto">
          <p
            className="text-white text-2xl font-medium leading-snug mb-8"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Your secrets,
            <br />
            kept warm &amp; safe.
          </p>
          <ul className="space-y-3">
            {TRUST_POINTS.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-stone-400 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-stone-700 text-xs">Built on Next.js · Open source</p>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-canvas">
        <div className="w-full max-w-sm">
          {/* Mobile brand — hidden on lg (decorative panel shows there) */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-block group">
              <span className="text-4xl block mb-3 select-none" aria-hidden="true">
                🧀
              </span>
              <h1
                className="text-2xl font-bold text-default group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors"
                style={{ fontFamily: "var(--font-playfair, serif)" }}
              >
                Cheesy Toast Vault
              </h1>
            </Link>
            <p className="text-sm text-muted mt-1.5 tracking-wide">
              Your secrets, kept warm &amp; safe.
            </p>
          </div>

          {above}

          <div className="bg-surface rounded-xl border border-line/60 px-8 py-8">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-6">
              {cardLabel}
            </p>
            {children}
          </div>

          {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
        </div>
      </div>
    </div>
  );
}

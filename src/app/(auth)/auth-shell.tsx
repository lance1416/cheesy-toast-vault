"use client";

import type { ReactNode } from "react";

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
    <div
      className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-4 select-none" aria-hidden="true">
            🧀
          </span>
          <h1
            className="text-[1.75rem] font-bold text-default leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Cheesy Toast Vault
          </h1>
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
  );
}

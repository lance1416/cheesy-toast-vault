"use client";

import Link from "next/link";

export default function VaultHeader({
  vaultName,
  actions,
}: {
  vaultName: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-line/80">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted hover:text-default hover:bg-line transition-colors shrink-0 whitespace-nowrap"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            All vaults
          </Link>
          <span className="text-stone-300 select-none" aria-hidden="true">
            /
          </span>
          <h1
            className="text-sm font-semibold text-default truncate"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            {vaultName}
          </h1>
        </div>

        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

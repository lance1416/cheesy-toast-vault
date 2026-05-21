"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import UserAvatar from "@/components/user-avatar";
import ThemeToggle from "@/components/theme-toggle";

export default function VaultHeader({
  vaultName,
  actions,
  mobileActions,
}: {
  vaultName: string;
  actions?: React.ReactNode;
  /** Flat list of items rendered inside the mobile overlay (no nested dropdowns). */
  mobileActions?: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-line/80">
        {/* ── Mobile layout: back | centred title | hamburger ── */}
        <div className="md:hidden h-14 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-3 gap-2">
          <Link
            href="/vaults"
            aria-label="All vaults"
            className="flex items-center justify-center w-9 h-9 rounded-xl text-muted hover:text-default hover:bg-line transition-colors"
          >
            <svg
              width="16"
              height="16"
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
          </Link>

          <h1
            className="text-sm font-semibold text-default text-center truncate"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            {vaultName}
          </h1>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-muted hover:text-default hover:bg-line transition-colors"
          >
            {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* ── Desktop layout: breadcrumb | actions | avatar ── */}
        <div className="hidden md:flex max-w-7xl mx-auto w-full px-6 h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href="/vaults"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted hover:text-default hover:bg-line transition-colors shrink-0 whitespace-nowrap"
            >
              <svg
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
            <span className="text-subtle select-none" aria-hidden="true">
              /
            </span>
            <h1
              className="text-sm font-semibold text-default truncate"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              {vaultName}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actions && (
              <>
                <div className="flex items-center gap-1.5">{actions}</div>
                <div className="w-px h-5 bg-line" role="separator" aria-hidden="true" />
              </>
            )}
            <UserAvatar />
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden bg-canvas/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="fixed inset-x-3 top-[3.75rem] z-40 md:hidden rounded-2xl bg-surface border border-line/50 shadow-2xl shadow-black/15 p-2 space-y-0.5"
            style={{ animation: "menu-in 0.15s ease-out" }}
          >
            {/* Vault-specific actions — flat items, no nested dropdowns */}
            {mobileActions && (
              <>
                <div className="space-y-0.5">{mobileActions}</div>
                <div className="h-px bg-line/50 my-1 mx-1" />
              </>
            )}
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center px-3 py-2.5 text-sm text-muted hover:text-default hover:bg-sunken rounded-xl transition-colors"
            >
              Settings
            </Link>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted">Theme</span>
              <ThemeToggle />
            </div>
            <div className="h-px bg-line/50 my-1 mx-1" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left rounded-xl px-3 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Sign out
            </button>
          </nav>
        </>
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import CreateVaultModal from "./create-vault-modal";
import ThemeToggle from "@/components/theme-toggle";
import type { VaultSummary } from "./vault-card";

// ─── Icons ────────────────────────────────────────────────────────────────────

function VaultIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function AppSidebar({
  user,
  initialVaults,
}: {
  user: { email: string };
  initialVaults: VaultSummary[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <aside className="hidden md:flex w-56 shrink-0 flex-col bg-surface border-r border-line/60">
        {/* Brand */}
        <div className="h-14 px-4 flex items-center border-b border-line/60 shrink-0">
          <Link href="/vaults" className="flex items-center gap-2 group min-w-0">
            <span className="text-xl select-none shrink-0" aria-hidden="true">
              🧀
            </span>
            <span
              className="text-[13px] font-bold text-default group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors leading-tight truncate"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Cheesy Toast Vault
            </span>
          </Link>
        </div>

        {/* Vault nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2" aria-label="Vaults">
          <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold text-subtle uppercase tracking-widest select-none">
            My Vaults
          </p>

          {initialVaults.map((vault) => {
            const isActive = pathname === `/vault/${vault.id}`;
            return (
              <Link
                key={vault.id}
                href={`/vault/${vault.id}`}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  isActive
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium"
                    : "text-muted hover:text-default hover:bg-sunken"
                }`}
              >
                <VaultIcon active={isActive} />
                <span className="flex-1 truncate min-w-0">{vault.name}</span>
                <span className="text-[11px] text-subtle tabular-nums shrink-0 ml-auto">
                  {vault._count.entries}
                </span>
              </Link>
            );
          })}

          {initialVaults.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-subtle italic">No vaults yet</p>
          )}

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-subtle hover:text-default hover:bg-sunken transition-colors w-full mt-1"
          >
            <PlusIcon />
            New vault
          </button>
        </nav>

        {/* Footer */}
        <div className="border-t border-line/60 p-2 shrink-0 space-y-0.5">
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
              pathname === "/settings"
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium"
                : "text-muted hover:text-default hover:bg-sunken"
            }`}
          >
            <SettingsIcon active={pathname === "/settings"} />
            Settings
          </Link>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            <span className="text-xs text-subtle truncate flex-1 min-w-0" title={user.email}>
              {user.email}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              aria-label="Sign out"
              title="Sign out"
              className="text-subtle hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5 shrink-0"
            >
              <SignOutIcon />
            </button>
          </div>
        </div>
      </aside>

      {showCreate && (
        <CreateVaultModal
          onClose={() => setShowCreate(false)}
          onCreated={(vaultId) => {
            setShowCreate(false);
            router.push(`/vault/${vaultId}`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

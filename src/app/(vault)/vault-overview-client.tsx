"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import CreateVaultModal from "./create-vault-modal";

type VaultSummary = {
  id: string;
  name: string;
  updatedAt: Date;
  _count: { entries: number };
};

export default function VaultOverviewClient({
  email,
  vaults,
}: {
  email: string;
  vaults: VaultSummary[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div
      className="min-h-screen bg-amber-50"
      style={{
        fontFamily: "var(--font-dm-sans, sans-serif)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
      }}
    >
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-stone-200/80">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <span
            aria-label="Cheesy Toast Vault"
            className="text-lg font-bold text-stone-800 tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            <span aria-hidden="true">🧀 </span>Cheesy Toast Vault
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-stone-400 truncate max-w-40">
              {email}
            </span>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-stone-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              + New vault
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {vaults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-5 select-none" aria-hidden="true">
              🔐
            </span>
            <h2
              className="text-xl font-semibold text-stone-700 mb-2"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              No vaults yet
            </h2>
            <p className="text-sm text-stone-400 mb-6">Create your first vault to get started.</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              + Create vault
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaults.map((vault) => (
              <button
                key={vault.id}
                type="button"
                onClick={() => router.push(`/vault/${vault.id}`)}
                className="bg-white rounded-xl border border-stone-200/80 shadow-sm shadow-stone-100 p-5 text-left hover:border-amber-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2
                    className="text-base font-semibold text-stone-800 group-hover:text-amber-700 transition-colors"
                    style={{ fontFamily: "var(--font-playfair, serif)" }}
                  >
                    {vault.name}
                  </h2>
                  <span className="text-stone-300 group-hover:text-amber-500 transition-colors mt-0.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                </div>
                <p className="text-sm text-stone-400">
                  {vault._count.entries} {vault._count.entries === 1 ? "entry" : "entries"}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateVaultModal
          onClose={() => setShowCreate(false)}
          onCreated={(vaultId) => {
            setShowCreate(false);
            router.push(`/vault/${vaultId}`);
          }}
        />
      )}
    </div>
  );
}

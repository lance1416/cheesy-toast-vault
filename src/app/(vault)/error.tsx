"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function VaultError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-surface rounded-xl border border-line/60 px-8 py-10">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">
            500 — Server error
          </p>
          <h1 className="text-lg font-bold text-default mb-2">Something went wrong</h1>
          <p className="text-sm text-muted mb-6">
            An unexpected error occurred on the server. Try again, or go back to the vault list.
          </p>
          <div className="flex gap-3">
            <button
              onClick={unstable_retry}
              className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98]"
            >
              Try again
            </button>
            <Link
              href="/"
              className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition text-center"
            >
              All vaults
            </Link>
          </div>
          {error.digest && (
            <p className="mt-5 text-xs text-subtle font-mono">ref: {error.digest}</p>
          )}
        </div>
      </div>
    </div>
  );
}

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
        <div className="bg-surface rounded-2xl border border-line/80 shadow-sm shadow-black/5 px-8 py-10">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">
            Service unavailable
          </p>
          <h1 className="text-lg font-bold text-default mb-2">Could not reach the database</h1>
          <p className="text-sm text-muted mb-6">
            The server could not be contacted. Check that it is running and try again.
          </p>
          <div className="flex gap-3">
            <button
              onClick={unstable_retry}
              className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98]"
            >
              Try again
            </button>
            <Link
              href="/login"
              className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition text-center"
            >
              Back to login
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

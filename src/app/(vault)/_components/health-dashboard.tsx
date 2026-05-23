"use client";

import { useEffect, useState } from "react";
import { decryptEntry, passwordStrength } from "@/lib/crypto";
import { isStalePassword } from "@/lib/stale-password";
import type { EntryPayload, EncryptedEntryProp } from "@/types/vault";

type RawVault = { id: string; name: string; entries: EncryptedEntryProp[] };

type Health =
  | { status: "computing" }
  | { status: "ready"; weak: number; stale: number; duplicate: number; total: number };

function StatChip({ label, count, loading }: { label: string; count: number; loading: boolean }) {
  if (loading) {
    return <div className="h-7 w-24 rounded-full bg-line/60 animate-pulse" />;
  }
  const active = count > 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
        active
          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
          : "bg-surface text-subtle border-line/60"
      }`}
    >
      <span className={`tabular-nums font-semibold ${active ? "" : "text-muted"}`}>{count}</span>
      {label}
    </span>
  );
}

export default function HealthDashboard({
  rawVaults,
  keys,
}: {
  rawVaults: RawVault[];
  keys: Record<string, CryptoKey>;
}) {
  const [health, setHealth] = useState<Health>({ status: "computing" });

  useEffect(() => {
    const unlockedVaults = rawVaults.filter((v) => keys[v.id]);
    if (unlockedVaults.length === 0) return;

    let cancelled = false;

    Promise.all(
      unlockedVaults.flatMap((v) =>
        v.entries
          .filter((e) => !e.entryType || e.entryType === "login")
          .map(async (e) => {
            try {
              return await decryptEntry<EntryPayload>(keys[v.id]!, e.encryptedBlob, e.iv);
            } catch {
              return null;
            }
          }),
      ),
    ).then((results) => {
      if (cancelled) return;
      const entries = results.filter((r): r is EntryPayload => r !== null);

      const now = Date.now();
      let weak = 0;
      let stale = 0;
      const passwordCounts = new Map<string, number>();

      for (const e of entries) {
        if (e.password && passwordStrength(e.password).score <= 1) weak++;
        if (isStalePassword(e.passwordChangedAt, now)) stale++;
        if (e.password) passwordCounts.set(e.password, (passwordCounts.get(e.password) ?? 0) + 1);
      }

      const duplicate = entries.filter(
        (e) => e.password && (passwordCounts.get(e.password) ?? 0) > 1,
      ).length;

      setHealth({ status: "ready", weak, stale, duplicate, total: entries.length });
    });

    return () => {
      cancelled = true;
    };
  }, [rawVaults, keys]);

  const loading = health.status === "computing";
  const weak = health.status === "ready" ? health.weak : 0;
  const stale = health.status === "ready" ? health.stale : 0;
  const duplicate = health.status === "ready" ? health.duplicate : 0;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-subtle mr-1">Password health</span>
      <StatChip label="weak" count={weak} loading={loading} />
      <StatChip label="stale" count={stale} loading={loading} />
      <StatChip label="reused" count={duplicate} loading={loading} />
    </div>
  );
}

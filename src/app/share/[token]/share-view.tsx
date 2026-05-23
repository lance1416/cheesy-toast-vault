"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { decryptEntry } from "@/lib/crypto";
import type { EntryPayload } from "@/types/vault";
import { CopyIcon } from "@/components/icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (secondsLeft === null) return;
    const id = setTimeout(() => {
      if (secondsLeft <= 1) {
        navigator.clipboard.writeText("").catch(() => {});
        setSecondsLeft(null);
      } else {
        setSecondsLeft(secondsLeft - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  function handleCopy() {
    navigator.clipboard
      .writeText(value)
      .then(() => setSecondsLeft(30))
      .catch(() => {});
  }

  const label = secondsLeft !== null ? `Copied — clears in ${secondsLeft}s` : "Copy to clipboard";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className="text-subtle hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
    >
      {secondsLeft !== null ? (
        <span className="text-xs font-mono font-medium text-amber-600 dark:text-amber-400 tabular-nums w-5 text-center inline-block">
          {secondsLeft}
        </span>
      ) : (
        <CopyIcon />
      )}
    </button>
  );
}

function Field({
  label,
  value,
  secret = false,
  copyable = true,
}: {
  label: string;
  value: string;
  secret?: boolean;
  copyable?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-line/40 last:border-0">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-subtle mb-0.5">
          {label}
        </p>
        {secret && !revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="text-xs text-muted hover:text-default transition-colors"
          >
            •••••••••
          </button>
        ) : (
          <p className="text-sm text-default break-all">{value}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="text-xs text-subtle hover:text-default transition-colors"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
        {copyable && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} day${d !== 1 ? "s" : ""}`;
  if (h > 0) return `${h} hour${h !== 1 ? "s" : ""}`;
  return `${m} minute${m !== 1 ? "s" : ""}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShareView({
  rawToken,
  encryptedBlob,
  iv,
  entryType,
  label,
  expiresAt,
  viewCount,
  maxViews,
}: {
  rawToken: string;
  encryptedBlob: string;
  iv: string;
  entryType: string;
  label: string;
  expiresAt: string;
  viewCount: number;
  maxViews: number | null;
}) {
  const [payload, setPayload] = useState<EntryPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function decrypt() {
      try {
        const keyBytes = new Uint8Array(rawToken.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
        const shareKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
          "decrypt",
        ]);
        const result = await decryptEntry<EntryPayload>(shareKey, encryptedBlob, iv);
        setPayload(result);
      } catch {
        setError(true);
      }
    }
    void decrypt();
  }, [rawToken, encryptedBlob, iv]);

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="text-3xl select-none" aria-hidden="true">
          🧀
        </div>
        <p className="text-xs text-muted">Shared via Cheesy Toast Vault</p>
      </div>

      {/* Entry card */}
      <div className="rounded-2xl border border-line/60 bg-surface shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-line/40 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-default truncate">{label}</h1>
            <p className="text-xs text-muted mt-0.5 capitalize">{entryType}</p>
          </div>
        </div>

        {error && (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-red-500 dark:text-red-400">
              Failed to decrypt this entry. The link may be corrupted.
            </p>
          </div>
        )}

        {!error && payload === null && (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-muted">Decrypting…</p>
          </div>
        )}

        {payload && (
          <div className="px-5">
            {/* Login fields */}
            {(entryType === "login" || !entryType) && (
              <>
                {payload.url && <Field label="URL" value={payload.url} />}
                {payload.username && <Field label="Username" value={payload.username} />}
                {payload.email && <Field label="Email" value={payload.email} />}
                {payload.password && (
                  <Field label="Password" value={payload.password} secret copyable />
                )}
                {payload.notes && <Field label="Notes" value={payload.notes} copyable={false} />}
              </>
            )}

            {/* Note fields */}
            {entryType === "note" && (
              <>{payload.body && <Field label="Content" value={payload.body} copyable={false} />}</>
            )}

            {/* Card fields */}
            {entryType === "card" && (
              <>
                {payload.cardholderName && (
                  <Field label="Cardholder" value={payload.cardholderName} />
                )}
                {payload.cardNumber && (
                  <Field label="Card number" value={payload.cardNumber} secret copyable />
                )}
                {payload.cardExpiry && <Field label="Expiry" value={payload.cardExpiry} />}
                {payload.cardCvv && <Field label="CVV" value={payload.cardCvv} secret copyable />}
                {payload.cardPin && <Field label="PIN" value={payload.cardPin} secret copyable />}
                {payload.notes && <Field label="Notes" value={payload.notes} copyable={false} />}
              </>
            )}

            {/* Identity fields */}
            {entryType === "identity" && (
              <>
                {payload.fullName && <Field label="Full name" value={payload.fullName} />}
                {payload.email && <Field label="Email" value={payload.email} />}
                {payload.phone && <Field label="Phone" value={payload.phone} />}
                {payload.address && <Field label="Address" value={payload.address} />}
                {payload.idNumber && (
                  <Field label="ID number" value={payload.idNumber} secret copyable />
                )}
                {payload.notes && <Field label="Notes" value={payload.notes} copyable={false} />}
              </>
            )}
          </div>
        )}

        {/* Expiry footer */}
        <div className="px-5 py-3 bg-sunken/50 border-t border-line/40 flex items-center justify-between">
          <p className="text-xs text-subtle">
            Expires in <span className="font-medium text-muted">{timeUntil(expiresAt)}</span>
          </p>
          {maxViews !== null && (
            <p className="text-xs text-subtle">
              <span className="font-medium text-muted">{viewCount}</span> / {maxViews} views
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-subtle">
        This entry was decrypted in your browser.{" "}
        <Link href="/" className="text-amber-700 dark:text-amber-400 hover:underline">
          Create your own vault →
        </Link>
      </p>
    </div>
  );
}

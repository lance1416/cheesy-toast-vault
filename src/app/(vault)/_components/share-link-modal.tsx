"use client";

import { useState } from "react";
import { encryptEntry, decryptEntry } from "@/lib/crypto";
import Modal from "@/components/modal";
import AlertBanner from "@/components/alert-banner";
import { CopyIcon } from "@/components/icons";
import type { EncryptedEntryProp, EntryPayload } from "@/types/vault";

const EXPIRY_OPTIONS = [
  { label: "1 hour", ms: 60 * 60 * 1_000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1_000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1_000 },
  { label: "30 days", ms: 30 * 24 * 60 * 60 * 1_000 },
];

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Phase = "configure" | "loading" | "done";

export default function ShareLinkModal({
  entry,
  cryptoKey,
  onClose,
}: {
  entry: EncryptedEntryProp;
  cryptoKey: CryptoKey;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("configure");
  const [expiryMs, setExpiryMs] = useState(EXPIRY_OPTIONS[1].ms);
  const [limitViews, setLimitViews] = useState(false);
  const [maxViews, setMaxViews] = useState(5);
  const [shareUrl, setShareUrl] = useState("");
  const [rawToken, setRawToken] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);

  async function handleGenerate() {
    setError("");
    setPhase("loading");
    try {
      // Decrypt entry with vault key
      const payload = await decryptEntry<EntryPayload>(cryptoKey, entry.encryptedBlob, entry.iv);

      // Generate a 32-byte random token encoded as hex (URL-safe; base64 can contain '/')
      const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(tokenBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Import token bytes directly as an AES-GCM-256 key
      const shareKey = await crypto.subtle.importKey("raw", tokenBytes, "AES-GCM", false, [
        "encrypt",
      ]);

      // Re-encrypt with the share key
      const { encryptedBlob, iv } = await encryptEntry(shareKey, payload);

      // Hash the token for server-side lookup
      const tokenHash = await sha256Hex(token);

      // Determine entry name from payload
      const label = (payload.name as string | undefined) ?? entry.entryType;

      const expiresAt = new Date(Date.now() + expiryMs).toISOString();

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenHash,
          encryptedBlob,
          iv,
          entryType: entry.entryType,
          label,
          expiresAt,
          maxViews: limitViews ? maxViews : undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create share link");
      }

      const url = `${window.location.origin}/share/${token}`;
      setShareUrl(url);
      setRawToken(token);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("configure");
    }
  }

  async function handleRevoke() {
    setRevoking(true);
    setError("");
    try {
      const res = await fetch(`/api/share/${rawToken}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke link.");
    } finally {
      setRevoking(false);
    }
  }

  function handleCopy() {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <Modal title="Share entry" titleId="share-link-title" onClose={onClose}>
      <div className="space-y-4">
        {error && <AlertBanner message={error} />}

        {phase === "configure" && (
          <>
            <p className="text-sm text-muted">
              Generate a read-only link to this entry. The recipient decrypts it in their browser —
              your vault password is never shared.
            </p>

            {/* Expiry picker */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted">Expires after</p>
              <div className="grid grid-cols-2 gap-2">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.ms}
                    type="button"
                    onClick={() => setExpiryMs(opt.ms)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                      expiryMs === opt.ms
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                        : "border-line text-muted hover:border-amber-300 dark:hover:border-amber-700 hover:text-default"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* View limit */}
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={limitViews}
                  onChange={(e) => setLimitViews(e.target.checked)}
                  className="rounded border-line accent-amber-500"
                />
                <span className="text-sm text-default">Limit number of views</span>
              </label>
              {limitViews && (
                <div className="flex items-center gap-3 ml-6">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxViews}
                    onChange={(e) => setMaxViews(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 rounded-lg border border-line bg-sunken/50 px-3 py-1.5 text-sm text-default outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                  <span className="text-sm text-muted">views</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
            >
              Generate link
            </button>
          </>
        )}

        {phase === "loading" && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">Encrypting…</p>
          </div>
        )}

        {phase === "done" && (
          <>
            <p className="text-sm text-muted">
              Your share link is ready. Anyone with this link can view the entry.
            </p>

            {/* URL display */}
            <div className="flex items-center gap-2 rounded-lg border border-line/60 bg-sunken/50 px-3 py-2.5">
              <p className="flex-1 text-xs font-mono text-default truncate">{shareUrl}</p>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy share link"
                className="shrink-0 text-subtle hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                {copied ? (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Copied!
                  </span>
                ) : (
                  <CopyIcon />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleRevoke()}
              disabled={revoking}
              className="w-full rounded-lg border border-red-200 dark:border-red-900/50 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {revoking ? "Revoking…" : "Revoke link"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

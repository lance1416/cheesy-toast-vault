"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/modal";

type Phase = "setup" | "verify" | "backupCodes";

export default function TotpModal({
  onClose,
  onEnabled,
}: {
  onClose: () => void;
  onEnabled: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("setup");

  // Setup phase
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [setupError, setSetupError] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  // Verify phase
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Backup codes phase
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Fetch secret on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/totp", { method: "POST" })
      .then((r) =>
        r.ok ? r.json() : r.json().then((d: { error?: string }) => Promise.reject(d.error)),
      )
      .then(async ({ secret: s, otpAuthUrl }: { secret: string; otpAuthUrl: string }) => {
        if (cancelled) return;
        setSecret(s);
        const { toDataURL } = await import("qrcode");
        const url = await toDataURL(otpAuthUrl, { width: 200, margin: 1 });
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((msg: unknown) => {
        if (!cancelled)
          setSetupError(typeof msg === "string" ? msg : "Failed to generate setup code.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase === "verify") codeInputRef.current?.focus();
  }, [phase]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code: code.replace(/\s/g, "") }),
      });
      const data = (await res.json()) as { backupCodes?: string[]; error?: string };
      if (!res.ok) {
        setVerifyError(data.error ?? "Invalid code.");
        return;
      }
      setBackupCodes(data.backupCodes ?? []);
      setPhase("backupCodes");
    } catch {
      setVerifyError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret).then(() => {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    });
  }

  function copyCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2000);
    });
  }

  // ── Setup phase ──────────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <Modal title="Set up two-factor authentication" titleId="totp-setup-title" onClose={onClose}>
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password,
            etc.), then click Continue.
          </p>

          {setupError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {setupError}
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="TOTP QR code — scan with your authenticator app"
                width={200}
                height={200}
                className="rounded-lg border border-line"
              />
            ) : (
              <div className="w-[200px] h-[200px] rounded-lg border border-line bg-sunken animate-pulse" />
            )}

            <div className="w-full space-y-1.5">
              <p className="text-xs font-medium text-muted">Or enter the key manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-line bg-sunken/50 px-3 py-2 text-xs font-mono text-default tracking-wider break-all">
                  {secret || "Loading…"}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  disabled={!secret}
                  aria-label="Copy secret key"
                  className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted hover:text-default hover:bg-line transition-colors disabled:opacity-50"
                >
                  {secretCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setPhase("verify")}
              disabled={!secret}
              className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Verify phase ─────────────────────────────────────────────────────────────

  if (phase === "verify") {
    return (
      <Modal title="Confirm your authenticator" titleId="totp-verify-title" onClose={onClose}>
        <form onSubmit={handleVerify} className="space-y-5">
          <p className="text-sm text-muted">
            Enter the 6-digit code shown in your authenticator app to confirm setup.
          </p>

          <div className="space-y-1.5">
            <label
              htmlFor="setup-totp-code"
              className="block text-xs font-medium text-muted tracking-wide"
            >
              Authenticator code
            </label>
            <input
              ref={codeInputRef}
              id="setup-totp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface text-center tracking-[0.25em] font-mono"
            />
          </div>

          {verifyError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {verifyError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCode("");
                setVerifyError("");
                setPhase("setup");
              }}
              className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? "Enabling…" : "Enable 2FA"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  // ── Backup codes phase ───────────────────────────────────────────────────────

  return (
    <Modal title="Save your backup codes" titleId="totp-backup-title" onClose={onClose} scrollable>
      <div className="space-y-5">
        <div
          role="alert"
          className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
        >
          <strong>Save these codes now.</strong> They{"'"}re shown only once. Each code can be used
          once if you lose access to your authenticator.
        </div>

        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((c) => (
            <code
              key={c}
              className="rounded-lg border border-line bg-sunken/50 px-3 py-2 text-sm font-mono text-default text-center tracking-wider"
            >
              {c}
            </code>
          ))}
        </div>

        <button
          type="button"
          onClick={copyCodes}
          className="w-full rounded-lg border border-line py-2 text-sm font-medium text-muted hover:text-default hover:bg-line transition-colors"
        >
          {codesCopied ? "Copied!" : "Copy all codes"}
        </button>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line accent-amber-600"
          />
          <span className="text-sm text-muted">
            I{"'"}ve saved these backup codes in a safe place.
          </span>
        </label>

        <button
          type="button"
          disabled={!saved}
          onClick={() => {
            onEnabled();
            onClose();
          }}
          className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

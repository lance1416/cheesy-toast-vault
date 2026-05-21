"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeIcon, ChevronIcon, CopyIcon, ShieldIcon, CloseIcon } from "@/components/icons";
import { checkBreach } from "@/lib/crypto";
import { isStalePassword, passwordAgeDays as getPasswordAgeDays } from "@/lib/stale-password";
import type { DecryptedEntry } from "@/types/vault";

const NOW_MS = Date.now();

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className="text-subtle hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
    >
      {copied ? <span className="text-xs font-medium text-amber-600">✓</span> : <CopyIcon />}
    </button>
  );
}

// ─── Favicon ──────────────────────────────────────────────────────────────────

function LetterAvatar({ name }: { name: string }) {
  return (
    <div className="w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-xs font-semibold text-muted shrink-0 select-none">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function Favicon({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);

  const domain = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }, [url]);

  if (!domain || failed) return <LetterAvatar name={name} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
      alt=""
      width={24}
      height={24}
      className="w-6 h-6 rounded-md object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

// ─── TOTP row ─────────────────────────────────────────────────────────────────

function TotpRow({ secret }: { secret: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30); // set on first tick
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        const [{ generate: otpGenerate }, { createGuardrails }] = await Promise.all([
          import("otplib"),
          import("@otplib/core"),
        ]);
        // Lower the minimum from 128 bits (16 bytes) to 80 bits (10 bytes) so that
        // 16-character base32 secrets — the format GitHub and Google use — are accepted.
        // RFC 4226 requires ≥ 128 bits for new deployments, but 80-bit secrets are
        // widely deployed and supported by every major authenticator app.
        const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 });
        const token = await otpGenerate({ secret, guardrails });
        if (!cancelled) setCode(token);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void generate();

    const interval = setInterval(() => {
      const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
      if (!cancelled) setSecondsLeft(remaining);
      if (remaining === 30) void generate(); // window rolled over
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [secret]);

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-muted">2FA Code</span>
      {error ? (
        <span className="flex-1 text-xs text-red-500 dark:text-red-400">Invalid secret</span>
      ) : (
        <>
          <span className="flex-1 font-mono text-sm text-default tracking-widest">
            {code ?? "……"}
          </span>
          <span
            className={`text-xs shrink-0 tabular-nums ${secondsLeft <= 5 ? "text-amber-600 dark:text-amber-400" : "text-muted"}`}
          >
            {secondsLeft}s
          </span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy 2FA code"}
            className="text-subtle hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            {copied ? <span className="text-xs font-medium text-amber-600">✓</span> : <CopyIcon />}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

export default function EntryCard({
  entry,
  onEdit,
  onHistory,
  vaultName,
}: {
  entry: DecryptedEntry;
  onEdit: () => void;
  onHistory?: () => void;
  vaultName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [breachStatus, setBreachStatus] = useState<"idle" | "checking" | "safe" | "error" | number>(
    "idle",
  );

  async function handleBreachCheck() {
    setBreachStatus("checking");
    try {
      const count = await checkBreach(entry.password);
      setBreachStatus(count === 0 ? "safe" : count);
    } catch {
      setBreachStatus("error");
    }
  }

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(entry.updatedAt)),
    [entry.updatedAt],
  );

  const passwordAgeDays = getPasswordAgeDays(entry.passwordChangedAt, NOW_MS);
  const isStale = isStalePassword(entry.passwordChangedAt, NOW_MS);

  const displayHost = useMemo(() => {
    if (!entry.url) return null;
    try {
      return new URL(entry.url).hostname.replace(/^www\./, "");
    } catch {
      return entry.url;
    }
  }, [entry.url]);

  return (
    <div className="bg-surface rounded-lg border border-line/60 overflow-hidden">
      {/* Header — click anywhere to expand/collapse */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        {entry.url ? (
          <Favicon url={entry.url} name={entry.name} />
        ) : (
          <LetterAvatar name={entry.name} />
        )}

        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold text-default leading-snug truncate"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            {entry.name}
          </p>
          {displayHost && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted hover:text-amber-600 dark:hover:text-amber-400 transition-colors truncate inline-block max-w-full leading-none mt-0.5"
            >
              {displayHost}
            </a>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {vaultName && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-muted border border-line/60 max-w-[96px] truncate shrink-0">
              {vaultName}
            </span>
          )}
          {isStale && (
            <span
              title={`Password last changed ${passwordAgeDays} days ago`}
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
            >
              {passwordAgeDays}d
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-xs font-medium text-muted hover:text-amber-700 dark:hover:text-amber-500 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            aria-expanded={open}
            aria-controls={`entry-body-${entry.id}`}
            aria-label={open ? "Collapse entry" : "Expand entry"}
            className="text-subtle hover:text-default transition-colors"
          >
            <ChevronIcon open={open} />
          </button>
        </div>
      </div>

      {/* Body — collapsible */}
      {open && (
        <div
          id={`entry-body-${entry.id}`}
          className="px-4 pt-3 pb-4 border-t border-divider space-y-2"
        >
          {[
            {
              label: "Username",
              value: entry.username,
              actions: <CopyButton value={entry.username} />,
            },
            { label: "Email", value: entry.email, actions: <CopyButton value={entry.email} /> },
          ].map(({ label, value, actions }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
              <span className="flex-1 truncate text-sm text-default">{value}</span>
              <div className="shrink-0">{actions}</div>
            </div>
          ))}

          {/* Password row — separate to support inline breach check */}
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted">Password</span>
            <span className="flex-1 truncate text-sm text-default font-mono">
              {showPassword ? entry.password : "••••••••"}
            </span>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-subtle hover:text-default transition-colors"
              >
                <EyeIcon open={showPassword} />
              </button>
              <CopyButton value={entry.password} />
              {breachStatus === "idle" && (
                <button
                  type="button"
                  onClick={handleBreachCheck}
                  aria-label="Check for breaches"
                  className="text-subtle hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <ShieldIcon />
                </button>
              )}
              {breachStatus === "checking" && (
                <span className="text-xs text-subtle animate-pulse">checking</span>
              )}
              {breachStatus !== "idle" && breachStatus !== "checking" && (
                <div className="flex items-center gap-1">
                  {breachStatus === "safe" && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Safe
                    </span>
                  )}
                  {breachStatus === "error" && <span className="text-xs text-muted">Failed</span>}
                  {typeof breachStatus === "number" && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      Seen {breachStatus.toLocaleString()}×
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setBreachStatus("idle")}
                    aria-label="Dismiss breach result"
                    className="text-subtle hover:text-default transition-colors"
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {entry.totpSecret && <TotpRow secret={entry.totpSecret} />}

          {entry.notes && (
            <div className="flex gap-2 pt-1">
              <span className="w-20 shrink-0 text-xs font-medium text-muted pt-0.5">Notes</span>
              <p className="flex-1 text-sm text-muted whitespace-pre-wrap break-words">
                {entry.notes}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 mt-1 border-t border-divider">
            <div className="flex flex-wrap gap-1">
              {entry.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-block rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              {onHistory && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHistory();
                  }}
                  className="text-xs text-subtle hover:text-default transition-colors"
                >
                  History
                </button>
              )}
              <span className="text-xs text-muted">{formattedDate}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

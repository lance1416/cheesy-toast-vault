"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EyeIcon,
  ChevronIcon,
  CopyIcon,
  ShieldIcon,
  CloseIcon,
  PinIcon,
  NoteIcon,
  CreditCardIcon,
  IdentityIcon,
  KeyIcon,
} from "@/components/icons";
import { checkBreach } from "@/lib/crypto";
import { isStalePassword, passwordAgeDays as getPasswordAgeDays } from "@/lib/stale-password";
import type { DecryptedEntry, CustomEntryTypeDef } from "@/types/vault";
import { BUILTIN_ENTRY_TYPES as BUILTINS } from "@/types/vault";

const NOW_MS = Date.now();

// ─── Copy button ──────────────────────────────────────────────────────────────

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

// ─── Favicon ──────────────────────────────────────────────────────────────────

function LetterAvatar({ name, className }: { name: string; className: string }) {
  return (
    <div className={`flex items-center justify-center text-xs font-bold select-none ${className}`}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function Favicon({ url, name, className }: { url: string; name: string; className: string }) {
  const [failed, setFailed] = useState(false);

  const domain = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }, [url]);

  if (!domain || failed) return <LetterAvatar name={name} className={className} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
      alt=""
      width={16}
      height={16}
      className="w-4 h-4 rounded-sm object-contain"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Type icon ────────────────────────────────────────────────────────────────

function TypeIcon({
  entry,
  customTypes,
}: {
  entry: DecryptedEntry;
  customTypes: CustomEntryTypeDef[];
}) {
  if (entry.entryType === "note") {
    return (
      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
        <NoteIcon size={14} />
      </div>
    );
  }
  if (entry.entryType === "card") {
    return (
      <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
        <CreditCardIcon size={14} />
      </div>
    );
  }
  if (entry.entryType === "identity") {
    return (
      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
        <IdentityIcon size={14} />
      </div>
    );
  }
  if (!BUILTINS.includes(entry.entryType)) {
    const ct = customTypes.find((t) => t.id === entry.entryType);
    return (
      <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-xs font-bold text-stone-600 dark:text-stone-400 shrink-0 select-none">
        {(ct?.name[0] ?? "?").toUpperCase()}
      </div>
    );
  }
  // login / undefined
  if (entry.url) {
    return (
      <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
        <Favicon
          url={entry.url}
          name={entry.name}
          className="w-4 h-4 text-stone-500 dark:text-stone-400"
        />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 shrink-0">
      <KeyIcon size={14} />
    </div>
  );
}

// ─── Entry subtitle ───────────────────────────────────────────────────────────

function entrySubtitle(entry: DecryptedEntry, customTypes: CustomEntryTypeDef[]): string | null {
  switch (entry.entryType) {
    case "login":
    case undefined:
      if (entry.username) return entry.username;
      if (entry.email) return entry.email;
      if (entry.url) {
        try {
          return new URL(entry.url).hostname.replace(/^www\./, "");
        } catch {
          return entry.url;
        }
      }
      return null;
    case "note":
      return entry.body ? (entry.body.split("\n")[0]?.slice(0, 50) ?? null) : "Secure note";
    case "card":
      if (entry.cardholderName) return entry.cardholderName;
      if (entry.cardNumber) return `•••• ${entry.cardNumber.slice(-4)}`;
      return "Payment card";
    case "identity":
      return entry.fullName ?? entry.email ?? "Identity";
    default: {
      const ct = customTypes.find((t) => t.id === entry.entryType);
      return ct?.name ?? null;
    }
  }
}

// ─── TOTP row ─────────────────────────────────────────────────────────────────

function TotpRow({ secret }: { secret: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [error, setError] = useState(false);
  const [copyCountdown, setCopyCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (copyCountdown === null) return;
    const id = setTimeout(() => {
      if (copyCountdown <= 1) {
        navigator.clipboard.writeText("").catch(() => {});
        setCopyCountdown(null);
      } else {
        setCopyCountdown(copyCountdown - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [copyCountdown]);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        const [{ generate: otpGenerate }, { createGuardrails }] = await Promise.all([
          import("otplib"),
          import("@otplib/core"),
        ]);
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
      if (remaining === 30) void generate();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [secret]);

  function handleCopy() {
    if (!code) return;
    navigator.clipboard
      .writeText(code)
      .then(() => setCopyCountdown(30))
      .catch(() => {});
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
            aria-label={
              copyCountdown !== null ? `Copied — clears in ${copyCountdown}s` : "Copy 2FA code"
            }
            title={
              copyCountdown !== null ? `Copied — clears in ${copyCountdown}s` : "Copy 2FA code"
            }
            className="text-subtle hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            {copyCountdown !== null ? (
              <span className="text-xs font-mono font-medium text-amber-600 dark:text-amber-400 tabular-nums w-5 text-center inline-block">
                {copyCountdown}
              </span>
            ) : (
              <CopyIcon />
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Entry card (list row) ────────────────────────────────────────────────────

export default function EntryCard({
  entry,
  onEdit,
  onHistory,
  onTogglePin,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  vaultName,
  customTypes = [],
}: {
  entry: DecryptedEntry;
  onEdit: () => void;
  onHistory?: () => void;
  onTogglePin?: (pinned: boolean) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  vaultName?: string;
  customTypes?: CustomEntryTypeDef[];
}) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [breachStatus, setBreachStatus] = useState<"idle" | "checking" | "safe" | "error" | number>(
    "idle",
  );

  async function handleBreachCheck() {
    setBreachStatus("checking");
    try {
      const count = await checkBreach(entry.password ?? "");
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
  const subtitle = entrySubtitle(entry, customTypes);

  return (
    <li className="list-none">
      {/* ── Collapsed row ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-sunken/40 dark:hover:bg-white/[0.02] transition-colors select-none group"
        onClick={() => (selectionMode ? onToggleSelect?.() : setOpen((v) => !v))}
      >
        {/* Left: selection or type icon */}
        {selectionMode ? (
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-amber-500 border-amber-500 text-white" : "border-line bg-surface"}`}
            aria-hidden="true"
          >
            {selected && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <polyline
                  points="2,6 5,9 10,3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        ) : (
          <TypeIcon entry={entry} customTypes={customTypes} />
        )}

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate leading-snug ${entry.pinned ? "text-amber-700 dark:text-amber-400" : "text-default"}`}
          >
            {entry.name}
          </p>
          {subtitle && (
            <p className="text-xs text-muted truncate leading-snug mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Right: badges + actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {vaultName && (
            <span className="hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-muted border border-line/60 max-w-[80px] truncate">
              {vaultName}
            </span>
          )}
          {isStale && (
            <span
              title={`Password last changed ${passwordAgeDays} days ago`}
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
            >
              {passwordAgeDays}d
            </span>
          )}
          {!selectionMode && onTogglePin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(!entry.pinned);
              }}
              aria-label={entry.pinned ? "Unpin entry" : "Pin entry"}
              title={entry.pinned ? "Unpin entry" : "Pin entry"}
              className={`transition-colors ${entry.pinned ? "text-amber-500 dark:text-amber-400 hover:text-muted" : "text-subtle opacity-0 group-hover:opacity-100 hover:text-amber-500 dark:hover:text-amber-400"}`}
            >
              <PinIcon filled={entry.pinned} />
            </button>
          )}
          {!selectionMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-xs font-medium text-muted opacity-0 group-hover:opacity-100 hover:text-amber-700 dark:hover:text-amber-400 transition-all"
            >
              Edit
            </button>
          )}
          {!selectionMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              aria-expanded={open}
              aria-label={open ? "Collapse entry" : "Expand entry"}
              className="text-subtle hover:text-default transition-colors"
            >
              <ChevronIcon open={open} />
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {open && !selectionMode && (
        <div
          id={`entry-body-${entry.id}`}
          className="px-4 pt-3 pb-4 border-t border-divider bg-sunken/30 space-y-2"
        >
          {/* ── Login ── */}
          {(!entry.entryType || entry.entryType === "login") && (
            <>
              {[
                {
                  label: "Username",
                  value: entry.username ?? "",
                  actions: <CopyButton value={entry.username ?? ""} />,
                },
                {
                  label: "Email",
                  value: entry.email ?? "",
                  actions: <CopyButton value={entry.email ?? ""} />,
                },
              ].map(({ label, value, actions }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
                  <span className="flex-1 truncate text-sm text-default">{value}</span>
                  <div className="shrink-0">{actions}</div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-medium text-muted">Password</span>
                <span className="flex-1 truncate text-sm text-default font-mono">
                  {showPassword ? (entry.password ?? "") : "••••••••"}
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
                  <CopyButton value={entry.password ?? ""} />
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
                      {breachStatus === "error" && (
                        <span className="text-xs text-muted">Failed</span>
                      )}
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
              {entry.url && (
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted">URL</span>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs text-muted hover:text-amber-600 dark:hover:text-amber-400 transition-colors truncate"
                  >
                    {entry.url}
                  </a>
                </div>
              )}
              {entry.notes && (
                <div className="flex gap-2 pt-1">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted pt-0.5">Notes</span>
                  <p className="flex-1 text-sm text-muted whitespace-pre-wrap break-words">
                    {entry.notes}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Note ── */}
          {entry.entryType === "note" && (
            <p className="text-sm text-default whitespace-pre-wrap break-words">{entry.body}</p>
          )}

          {/* ── Card ── */}
          {entry.entryType === "card" && (
            <>
              {entry.cardholderName && (
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted">Name</span>
                  <span className="flex-1 truncate text-sm text-default">
                    {entry.cardholderName}
                  </span>
                  <CopyButton value={entry.cardholderName} />
                </div>
              )}
              {entry.cardNumber && (
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted">Number</span>
                  <span className="flex-1 truncate text-sm text-default font-mono">
                    {showPassword
                      ? entry.cardNumber
                      : `•••• •••• •••• ${entry.cardNumber.slice(-4)}`}
                  </span>
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Hide number" : "Show number"}
                      className="text-subtle hover:text-default transition-colors"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                    <CopyButton value={entry.cardNumber} />
                  </div>
                </div>
              )}
              {entry.cardExpiry && (
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted">Expiry</span>
                  <span className="flex-1 text-sm text-default">{entry.cardExpiry}</span>
                  <CopyButton value={entry.cardExpiry} />
                </div>
              )}
              {entry.cardCvv && (
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted">CVV</span>
                  <span className="flex-1 font-mono text-sm text-default">
                    {showPassword ? entry.cardCvv : "•••"}
                  </span>
                  <CopyButton value={entry.cardCvv} />
                </div>
              )}
              {entry.cardPin && (
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted">PIN</span>
                  <span className="flex-1 font-mono text-sm text-default">
                    {"•".repeat(entry.cardPin.length)}
                  </span>
                  <CopyButton value={entry.cardPin} />
                </div>
              )}
              {entry.notes && (
                <div className="flex gap-2 pt-1">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted pt-0.5">Notes</span>
                  <p className="flex-1 text-sm text-muted whitespace-pre-wrap break-words">
                    {entry.notes}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Identity ── */}
          {entry.entryType === "identity" && (
            <>
              {[
                { label: "Full name", value: entry.fullName },
                { label: "Email", value: entry.email },
                { label: "Phone", value: entry.phone },
                { label: "ID number", value: entry.idNumber },
              ]
                .filter((r) => r.value)
                .map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
                    <span className="flex-1 truncate text-sm text-default">{value}</span>
                    <CopyButton value={value!} />
                  </div>
                ))}
              {entry.address && (
                <div className="flex gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted pt-0.5">
                    Address
                  </span>
                  <p className="flex-1 text-sm text-default whitespace-pre-wrap break-words">
                    {entry.address}
                  </p>
                </div>
              )}
              {entry.notes && (
                <div className="flex gap-2 pt-1">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted pt-0.5">Notes</span>
                  <p className="flex-1 text-sm text-muted whitespace-pre-wrap break-words">
                    {entry.notes}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Custom type ── */}
          {!BUILTINS.includes(entry.entryType) &&
            (() => {
              const ct = customTypes.find((t) => t.id === entry.entryType);
              if (!ct) {
                return (
                  <p className="text-xs text-subtle italic">Custom type definition was deleted.</p>
                );
              }
              return (
                <>
                  {ct.fields.map((field) => {
                    const value = entry.customFields?.[field.id];
                    if (!value) return null;
                    return (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs font-medium text-muted truncate">
                          {field.label}
                        </span>
                        {field.kind === "multiline" ? (
                          <p className="flex-1 text-sm text-default whitespace-pre-wrap break-words">
                            {value}
                          </p>
                        ) : field.kind === "secret" ? (
                          <span className="flex-1 font-mono text-sm text-default">••••••••</span>
                        ) : (
                          <span className="flex-1 truncate text-sm text-default">{value}</span>
                        )}
                        <CopyButton value={value} />
                      </div>
                    );
                  })}
                  {entry.notes && (
                    <div className="flex gap-2 pt-1">
                      <span className="w-20 shrink-0 text-xs font-medium text-muted pt-0.5">
                        Notes
                      </span>
                      <p className="flex-1 text-sm text-muted whitespace-pre-wrap break-words">
                        {entry.notes}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}

          {/* Footer row */}
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
    </li>
  );
}

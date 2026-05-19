"use client";

import { useMemo, useState } from "react";
import { generatePassword, generatePassphrase } from "@/lib/crypto";

const SEPARATORS = [
  { label: "-", value: "-" },
  { label: ".", value: "." },
  { label: "space", value: " " },
  { label: "none", value: "" },
] as const;

type Mode = "password" | "passphrase";

export default function PasswordGenerator({
  onUse,
  onClose,
}: {
  onUse: (password: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("password");

  // Password options
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);

  // Passphrase options
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(false);

  // Increment to force regeneration without changing options
  const [seed, setSeed] = useState(0);

  const generated = useMemo(
    () =>
      mode === "password"
        ? generatePassword({ length, uppercase, numbers, symbols })
        : generatePassphrase({ wordCount, separator, capitalize }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, length, uppercase, numbers, symbols, wordCount, separator, capitalize, seed],
  );

  return (
    <div className="mt-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {/* Mode toggle */}
        <div
          role="group"
          aria-label="Generator mode"
          className="flex rounded-lg border border-line overflow-hidden text-xs font-medium"
        >
          {(["password", "passphrase"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-2.5 py-1 capitalize transition-colors ${
                mode === m
                  ? "bg-stone-800 dark:bg-amber-600 text-white"
                  : "text-muted hover:text-default hover:bg-line"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted hover:text-default transition-colors"
        >
          Close
        </button>
      </div>

      {/* Generated value */}
      <div className="flex items-center gap-2 bg-surface rounded-lg border border-line px-3 py-2">
        <code className="flex-1 text-sm font-mono text-default break-all">{generated}</code>
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          aria-label="Regenerate"
          className="shrink-0 text-subtle hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
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
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>

      {/* Options */}
      {mode === "password" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted w-12 shrink-0">Length</label>
            <input
              type="range"
              min={12}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="flex-1 accent-amber-600 dark:accent-amber-400"
            />
            <span className="text-xs font-mono text-muted w-6 text-right">{length}</span>
          </div>
          {(
            [
              ["uppercase", "A–Z", uppercase, setUppercase],
              ["numbers", "0–9", numbers, setNumbers],
              ["symbols", "!@#…", symbols, setSymbols],
            ] as const
          ).map(([key, labelText, checked, setter]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setter(e.target.checked)}
                className="accent-amber-600 dark:accent-amber-400 rounded"
              />
              <span className="text-xs text-muted">{labelText}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted w-12 shrink-0">Words</label>
            <input
              type="range"
              min={3}
              max={6}
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              className="flex-1 accent-amber-600 dark:accent-amber-400"
            />
            <span className="text-xs font-mono text-muted w-4 text-right">{wordCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted w-12 shrink-0">Separator</span>
            <div role="group" aria-label="Separator" className="flex gap-1">
              {SEPARATORS.map((sep) => (
                <button
                  key={sep.label}
                  type="button"
                  onClick={() => setSeparator(sep.value)}
                  aria-pressed={separator === sep.value}
                  className={`rounded px-2 py-0.5 text-xs transition-colors ${
                    separator === sep.value
                      ? "bg-stone-800 dark:bg-amber-600 text-white"
                      : "text-muted hover:text-default hover:bg-line"
                  }`}
                >
                  {sep.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={capitalize}
              onChange={(e) => setCapitalize(e.target.checked)}
              className="accent-amber-600 dark:accent-amber-400 rounded"
            />
            <span className="text-xs text-muted">Capitalize words</span>
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onUse(generated);
          onClose();
        }}
        className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
      >
        Use this password
      </button>
    </div>
  );
}

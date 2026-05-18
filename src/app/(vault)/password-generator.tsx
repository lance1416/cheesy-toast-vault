"use client";

import { useMemo, useState } from "react";
import { generatePassword } from "@/lib/crypto";

export default function PasswordGenerator({
  onUse,
  onClose,
}: {
  onUse: (password: string) => void;
  onClose: () => void;
}) {
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  // Increment to force a new password without changing options
  const [seed, setSeed] = useState(0);

  const generated = useMemo(
    () => generatePassword({ length, uppercase, numbers, symbols }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [length, uppercase, numbers, symbols, seed],
  );

  return (
    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Generated password
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          Close
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 px-3 py-2">
        <code className="flex-1 text-sm font-mono text-stone-800 break-all">{generated}</code>
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          aria-label="Regenerate password"
          className="shrink-0 text-stone-400 hover:text-amber-600 transition-colors"
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

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500 w-12 shrink-0">Length</label>
          <input
            type="range"
            min={12}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="flex-1 accent-amber-600"
          />
          <span className="text-xs font-mono text-stone-600 w-6 text-right">{length}</span>
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
              className="accent-amber-600 rounded"
            />
            <span className="text-xs text-stone-600">{labelText}</span>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          onUse(generated);
          onClose();
        }}
        className="w-full rounded-lg bg-stone-800 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
      >
        Use this password
      </button>
    </div>
  );
}

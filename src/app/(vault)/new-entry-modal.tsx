"use client";

import { useEffect, useRef, useState } from "react";
import { encryptEntry } from "@/lib/crypto";
import TagSelector, { type Tag } from "./tag-selector";

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
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
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  suffix,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-stone-500 tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-white pr-10"
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function NewEntryModal({
  cryptoKey,
  tags: initialTags,
  onTagCreated,
  onClose,
  onSuccess,
}: {
  cryptoKey: CryptoKey;
  tags: Tag[];
  onTagCreated: (tag: Tag) => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>(initialTags);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleBackdropClick(e: React.MouseEvent) {
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { encryptedBlob, iv } = await encryptEntry(cryptoKey, {
        name,
        url: url || undefined,
        username,
        email,
        password,
      });

      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedBlob, iv, tagIds: selectedTagIds }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save entry");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdropClick}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-entry-title"
        className="w-full max-w-md bg-white rounded-2xl border border-stone-200/80 shadow-xl px-8 py-8"
        style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="new-entry-title"
            className="text-xl font-bold text-stone-800 tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            New Entry
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-stone-500 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Name"
            id="new-name"
            value={name}
            onChange={setName}
            placeholder="e.g. GitHub"
            required
          />
          <Field
            label="URL"
            id="new-url"
            type="url"
            value={url}
            onChange={setUrl}
            placeholder="e.g. https://github.com"
          />
          <Field
            label="Username"
            id="new-username"
            value={username}
            onChange={setUsername}
            placeholder="e.g. johndoe"
          />
          <Field
            label="Email"
            id="new-email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="e.g. john@example.com"
          />
          <Field
            label="Password"
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-stone-300 hover:text-stone-500 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            }
          />

          <TagSelector
            available={availableTags}
            selectedIds={selectedTagIds}
            onToggle={(id) =>
              setSelectedTagIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              )
            }
            onCreated={(tag) => {
              setAvailableTags((prev) =>
                prev.some((t) => t.id === tag.id)
                  ? prev
                  : [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
              );
              setSelectedTagIds((prev) => [...prev, tag.id]);
              onTagCreated(tag);
            }}
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name}
              className="flex-1 rounded-lg bg-stone-800 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

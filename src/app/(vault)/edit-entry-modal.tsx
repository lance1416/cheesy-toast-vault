"use client";

import { useEffect, useRef, useState } from "react";
import { encryptEntry, decryptEntry } from "@/lib/crypto";

type EntryPayload = {
  name: string;
  url?: string;
  username: string;
  email: string;
  password: string;
};

type EncryptedEntry = {
  id: string;
  encryptedBlob: string;
  iv: string;
  tags: { id: string; name: string }[];
};

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

export default function EditEntryModal({
  entry,
  cryptoKey,
  onClose,
  onSuccess,
}: {
  entry: EncryptedEntry;
  cryptoKey: CryptoKey;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [decrypted, setDecrypted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);

  // Decrypt on mount
  useEffect(() => {
    let cancelled = false;
    decryptEntry<EntryPayload>(cryptoKey, entry.encryptedBlob, entry.iv).then((payload) => {
      if (cancelled) return;
      setName(payload.name);
      setUrl(payload.url ?? "");
      setUsername(payload.username);
      setEmail(payload.email);
      setPassword(payload.password);
      setDecrypted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cryptoKey, entry]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleBackdropClick(e: React.MouseEvent) {
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { encryptedBlob, iv } = await encryptEntry(cryptoKey, {
        name,
        url: url || undefined,
        username,
        email,
        password,
      });
      const res = await fetch(`/api/vault/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedBlob, iv }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/vault/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onSuccess();
    } catch {
      setError("Failed to delete entry.");
      setDeleting(false);
      setConfirmDelete(false);
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
        aria-labelledby="edit-entry-title"
        className="w-full max-w-md bg-white rounded-2xl border border-stone-200/80 shadow-xl px-8 py-8 max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="edit-entry-title"
            className="text-xl font-bold text-stone-800 tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Edit Entry
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

        {!decrypted ? (
          <div className="py-8 text-center text-sm text-stone-400">Decrypting…</div>
        ) : (
          <>
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Name" id="edit-name" value={name} onChange={setName} required />
              <Field
                label="URL"
                id="edit-url"
                type="url"
                value={url}
                onChange={setUrl}
                placeholder="https://"
              />
              <Field label="Username" id="edit-username" value={username} onChange={setUsername} />
              <Field label="Email" id="edit-email" type="email" value={email} onChange={setEmail} />
              <Field
                label="Password"
                id="edit-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
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

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name}
                  className="flex-1 rounded-lg bg-stone-800 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>

            {/* Delete */}
            <div className="mt-5 pt-5 border-t border-stone-100">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete entry
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <p className="text-sm text-red-700">
                    Delete <span className="font-bold">{name}</span>? This cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-stone-200 bg-white py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

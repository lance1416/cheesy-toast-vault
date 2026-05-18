"use client";

import { useState } from "react";
import { encryptEntry, passwordStrength } from "@/lib/crypto";
import Field from "@/components/field";
import Modal from "@/components/modal";
import { EyeIcon } from "@/components/icons";
import TagSelector, { type Tag } from "./tag-selector";
import PasswordGenerator from "./password-generator";

function StrengthBar({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  const colors = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-lime-500", "bg-green-500"];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : "bg-line"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {label}
      </p>
    </div>
  );
}

export default function NewEntryModal({
  vaultId,
  cryptoKey,
  tags: initialTags,
  onTagCreated,
  onClose,
  onSuccess,
}: {
  vaultId: string;
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
  const [notes, setNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>(initialTags);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
        notes: notes || undefined,
        passwordChangedAt: new Date().toISOString(),
      });
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultId, encryptedBlob, iv, tagIds: selectedTagIds }),
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
    <Modal title="New Entry" titleId="new-entry-title" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Name"
          id="new-name"
          value={name}
          onChange={setName}
          placeholder="e.g. GitHub"
          required
          autoFocus
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

        <div>
          <Field
            label="Password"
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            suffix={
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-subtle hover:text-default transition-colors"
                >
                  <EyeIcon open={showPassword} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerator((v) => !v)}
                  aria-label="Toggle password generator"
                  className="text-subtle hover:text-amber-600 transition-colors ml-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
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
            }
          />
          {showGenerator && (
            <PasswordGenerator
              onUse={(p) => {
                setPassword(p);
                setShowPassword(true);
              }}
              onClose={() => setShowGenerator(false)}
            />
          )}
          {password && <StrengthBar password={password} />}
        </div>

        <Field
          label="Notes"
          id="new-notes"
          value={notes}
          onChange={setNotes}
          placeholder="Recovery codes, hints…"
          multiline
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
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name}
            className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

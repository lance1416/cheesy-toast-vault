"use client";

import { useState } from "react";
import { encryptEntry } from "@/lib/crypto";
import Field from "@/components/field";
import Modal from "@/components/modal";
import { EyeIcon } from "@/components/icons";
import TagSelector, { type Tag } from "./tag-selector";

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
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-stone-400 hover:text-stone-500 transition-colors"
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
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
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
    </Modal>
  );
}

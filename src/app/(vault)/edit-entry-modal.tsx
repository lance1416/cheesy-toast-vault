"use client";

import { useEffect, useState } from "react";
import { encryptEntry, decryptEntry } from "@/lib/crypto";
import Field from "@/components/field";
import Modal from "@/components/modal";
import { EyeIcon } from "@/components/icons";
import type { EntryPayload, EncryptedEntryProp } from "@/types/vault";
import TagSelector, { type Tag } from "./tag-selector";

export default function EditEntryModal({
  entry,
  cryptoKey,
  tags: initialTags,
  onTagCreated,
  onClose,
  onSuccess,
}: {
  entry: EncryptedEntryProp;
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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(entry.tags.map((t) => t.id));
  const [availableTags, setAvailableTags] = useState<Tag[]>(initialTags);
  const [decrypted, setDecrypted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ encryptedBlob, iv, tagIds: selectedTagIds }),
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
    <Modal title="Edit Entry" titleId="edit-entry-title" onClose={onClose} scrollable>
      {!decrypted ? (
        <div className="py-8 text-center text-sm text-stone-400">Decrypting…</div>
      ) : (
        <>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Name" id="edit-name" value={name} onChange={setName} required autoFocus />
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
    </Modal>
  );
}

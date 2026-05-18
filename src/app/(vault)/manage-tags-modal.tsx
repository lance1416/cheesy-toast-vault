"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/modal";
import { EditIcon, TrashIcon } from "@/components/icons";
import type { Tag } from "./tag-selector";

function TagRow({
  tag,
  onUpdated,
  onDeleted,
}: {
  tag: Tag;
  onUpdated: (tag: Tag) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) {
      setEditing(false);
      setName(tag.name);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/tags/${tag.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as Tag;
      onUpdated(updated);
      setEditing(false);
    } catch {
      setName(tag.name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(tag.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5 border-b border-stone-100 last:border-0">
        <span className="text-sm text-stone-500">
          Delete <span className="font-medium text-stone-700">{tag.name}</span>?
        </span>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-stone-100 last:border-0">
      {editing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSave();
              }
              if (e.key === "Escape") {
                setEditing(false);
                setName(tag.name);
              }
            }}
            maxLength={32}
            className="flex-1 rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-amber-400/20"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(tag.name);
            }}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-stone-700">{tag.name}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${tag.name}`}
            className="text-stone-400 hover:text-stone-500 transition-colors"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${tag.name}`}
            className="text-stone-400 hover:text-red-400 transition-colors"
          >
            <TrashIcon />
          </button>
        </>
      )}
    </div>
  );
}

export default function ManageTagsModal({
  tags,
  onClose,
  onTagUpdated,
  onTagDeleted,
}: {
  tags: Tag[];
  onClose: () => void;
  onTagUpdated: (tag: Tag) => void;
  onTagDeleted: (id: string) => void;
}) {
  return (
    <Modal
      title="Manage Tags"
      titleId="manage-tags-title"
      onClose={onClose}
      maxWidth="max-w-sm"
      scrollable
    >
      {tags.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-6">No tags yet.</p>
      ) : (
        <div>
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} onUpdated={onTagUpdated} onDeleted={onTagDeleted} />
          ))}
        </div>
      )}
    </Modal>
  );
}

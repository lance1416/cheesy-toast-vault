"use client";

import { useEffect, useRef, useState } from "react";
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
            className="text-stone-300 hover:text-stone-500 transition-colors"
            aria-label={`Rename ${tag.name}`}
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
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-stone-300 hover:text-red-400 transition-colors"
            aria-label={`Delete ${tag.name}`}
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
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
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
        aria-labelledby="manage-tags-title"
        className="w-full max-w-sm bg-white rounded-2xl border border-stone-200/80 shadow-xl px-6 py-6 max-h-[80vh] overflow-y-auto"
        style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            id="manage-tags-title"
            className="text-lg font-bold text-stone-800 tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Manage Tags
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

        {tags.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">No tags yet.</p>
        ) : (
          <div>
            {tags.map((tag) => (
              <TagRow key={tag.id} tag={tag} onUpdated={onTagUpdated} onDeleted={onTagDeleted} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

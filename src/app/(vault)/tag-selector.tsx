"use client";

import { useState } from "react";

export type Tag = { id: string; name: string };

export default function TagSelector({
  available,
  selectedIds,
  onToggle,
  onCreated,
}: {
  available: Tag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreated: (tag: Tag) => void;
}) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const tag = (await res.json()) as Tag;
      onCreated(tag);
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-stone-600 tracking-wide">Tags</span>

      {available.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {available.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggle(tag.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                  selected
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-stone-50 text-stone-600 border-stone-200 hover:border-amber-300 hover:text-amber-700"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="New tag…"
          maxLength={32}
          className="flex-1 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-500 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 focus:bg-white"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!newName.trim() || creating}
          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}

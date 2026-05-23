"use client";

import { useState } from "react";
import Modal from "@/components/modal";
import AlertBanner from "@/components/alert-banner";
import type { CustomEntryTypeDef, CustomFieldDef, FieldKind } from "@/types/vault";

const KIND_LABELS: Record<FieldKind, string> = {
  text: "Text",
  secret: "Secret",
  url: "URL",
  email: "Email",
  date: "Date",
  multiline: "Multiline",
};

const KINDS = Object.keys(KIND_LABELS) as FieldKind[];

function newField(): CustomFieldDef {
  return { id: crypto.randomUUID(), label: "", kind: "text" };
}

export default function CreateCustomTypeModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: CustomEntryTypeDef;
  onClose: () => void;
  onSaved: (type: CustomEntryTypeDef) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [fields, setFields] = useState<CustomFieldDef[]>(
    existing?.fields.length ? existing.fields : [newField()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(id: string, patch: Partial<CustomFieldDef>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const validFields = fields.filter((f) => f.label.trim());
    if (!trimmedName) {
      setError("Type name is required.");
      return;
    }
    if (validFields.length === 0) {
      setError("Add at least one field.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const payload = { name: trimmedName, fields: validFields };
      const res = existing
        ? await fetch(`/api/entry-types/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/entry-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save type");
      }
      const saved = (await res.json()) as CustomEntryTypeDef;
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={existing ? "Edit entry type" : "New entry type"}
      titleId="custom-type-title"
      onClose={onClose}
      scrollable
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Type name */}
        <div className="space-y-1.5">
          <label htmlFor="ct-name" className="block text-sm font-medium text-muted">
            Type name
          </label>
          <input
            id="ct-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Server credentials"
            required
            autoFocus
            className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
          />
        </div>

        {/* Fields */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted">Fields</p>

          {fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder={`Field ${i + 1} label`}
                aria-label={`Field ${i + 1} label`}
                className="flex-1 min-w-0 rounded-lg border border-line bg-sunken/50 px-3 py-2 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
              />
              <select
                value={field.kind}
                onChange={(e) => updateField(field.id, { kind: e.target.value as FieldKind })}
                aria-label={`Field ${i + 1} kind`}
                className="rounded-lg border border-line bg-sunken/50 px-2 py-2 text-sm text-muted outline-none focus:border-amber-400 transition shrink-0"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                disabled={fields.length === 1}
                aria-label="Remove field"
                className="text-subtle hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setFields((prev) => [...prev, newField()])}
            disabled={fields.length >= 20}
            className="text-xs font-medium text-muted hover:text-amber-700 dark:hover:text-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add field
          </button>
        </div>

        {error && <AlertBanner message={error} />}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Create type"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

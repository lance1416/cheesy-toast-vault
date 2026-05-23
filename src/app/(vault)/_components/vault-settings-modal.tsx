"use client";

import { useState } from "react";
import { deriveCryptoKey, generateSalt, bufferToBase64, encryptEntry } from "@/lib/crypto";
import Modal from "@/components/modal";
import Field from "@/components/field";
import AlertBanner from "@/components/alert-banner";

type Phase = "idle" | "setup" | "remove-confirm";

type SeedEntry = { name: string; username: string; password: string };

const DEFAULT_SEEDS: SeedEntry[] = [
  { name: "", username: "", password: "" },
  { name: "", username: "", password: "" },
  { name: "", username: "", password: "" },
];

export default function VaultSettingsModal({
  vaultId,
  hasDecoy,
  onClose,
  onDecoyChanged,
}: {
  vaultId: string;
  hasDecoy: boolean;
  onClose: () => void;
  onDecoyChanged: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [decoyPassword, setDecoyPassword] = useState("");
  const [decoyConfirm, setDecoyConfirm] = useState("");
  const [seeds, setSeeds] = useState<SeedEntry[]>(DEFAULT_SEEDS);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setDecoyPassword("");
    setDecoyConfirm("");
    setSeeds(DEFAULT_SEEDS);
    setError("");
  }

  function updateSeed(i: number, field: keyof SeedEntry, value: string) {
    setSeeds((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function handleSave() {
    setError("");

    if (decoyPassword.length < 8) {
      setError("Decoy password must be at least 8 characters.");
      return;
    }
    if (decoyPassword !== decoyConfirm) {
      setError("Passwords do not match.");
      return;
    }
    const filledSeeds = seeds.filter((s) => s.name.trim());
    if (filledSeeds.length === 0) {
      setError("Add at least one decoy entry so the password can be verified on unlock.");
      return;
    }

    setSaving(true);
    try {
      const saltBytes = generateSalt();
      const decoySalt = bufferToBase64(saltBytes);
      const decoyKey = await deriveCryptoKey(decoyPassword, saltBytes);

      // Save the decoySalt on the vault
      const patchRes = await fetch(`/api/vaults/${vaultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decoySalt }),
      });
      if (!patchRes.ok) throw new Error("Failed to save decoy salt.");

      // Encrypt and POST seed entries as isDecoy = true
      for (const seed of filledSeeds) {
        const payload = {
          type: "login",
          name: seed.name.trim(),
          username: seed.username.trim() || undefined,
          password: seed.password.trim() || undefined,
          passwordChangedAt: new Date().toISOString(),
        };
        const { encryptedBlob, iv } = await encryptEntry(decoyKey, payload);
        await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultId,
            encryptedBlob,
            iv,
            entryType: "login",
            isDecoy: true,
          }),
        });
      }

      onDecoyChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setError("");
    try {
      const res = await fetch(`/api/vaults/${vaultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decoySalt: null }),
      });
      if (!res.ok) throw new Error("Failed to remove decoy.");
      onDecoyChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Vault settings" titleId="vault-settings-title" scrollable>
      <div className="space-y-5">
        {/* ── Decoy section ──────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-default">Decoy password</p>
              <p className="text-xs text-muted mt-0.5">
                {hasDecoy
                  ? "A decoy password is configured. Unlocking with it shows dummy entries only."
                  : "Set a second password that reveals dummy entries, hiding your real data."}
              </p>
            </div>
            {hasDecoy && phase === "idle" && (
              <span className="shrink-0 ml-3 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/50">
                Active
              </span>
            )}
          </div>

          {error && <AlertBanner message={error} />}

          {/* idle state */}
          {phase === "idle" && (
            <div className="flex flex-wrap gap-2">
              {!hasDecoy ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setPhase("setup");
                  }}
                  className="rounded-lg bg-stone-800 dark:bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
                >
                  Add decoy password
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setPhase("setup");
                    }}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:text-default hover:bg-sunken transition-colors"
                  >
                    Change decoy password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setPhase("remove-confirm");
                    }}
                    className="rounded-lg border border-red-200 dark:border-red-900/50 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Remove decoy
                  </button>
                </>
              )}
            </div>
          )}

          {/* setup form */}
          {phase === "setup" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
              className="space-y-4"
            >
              <div className="space-y-3">
                <Field
                  label="Decoy password"
                  id="decoy-password"
                  type="password"
                  value={decoyPassword}
                  onChange={setDecoyPassword}
                />
                <Field
                  label="Confirm decoy password"
                  id="decoy-confirm"
                  type="password"
                  value={decoyConfirm}
                  onChange={setDecoyConfirm}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted">
                  Decoy entries{" "}
                  <span className="font-normal text-subtle">
                    — shown when unlocked with the decoy password
                  </span>
                </p>
                {seeds.map((seed, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-line/60 bg-sunken/40 p-3 space-y-2"
                  >
                    <p className="text-xs font-medium text-muted">Entry {i + 1}</p>
                    <Field
                      label="Name"
                      id={`seed-name-${i}`}
                      type="text"
                      value={seed.name}
                      onChange={(v) => updateSeed(i, "name", v)}
                      placeholder="e.g. Google"
                    />
                    <Field
                      label="Username"
                      id={`seed-username-${i}`}
                      type="text"
                      value={seed.username}
                      onChange={(v) => updateSeed(i, "username", v)}
                      placeholder="optional"
                    />
                    <Field
                      label="Password hint"
                      id={`seed-password-${i}`}
                      type="text"
                      value={seed.password}
                      onChange={(v) => updateSeed(i, "password", v)}
                      placeholder="optional"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    resetForm();
                  }}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-line py-2 text-sm font-medium text-muted hover:bg-sunken transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Save decoy"}
                </button>
              </div>
            </form>
          )}

          {/* remove confirm */}
          {phase === "remove-confirm" && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 space-y-3">
              <p className="text-sm text-red-700 dark:text-red-400">
                This will permanently delete all decoy entries and remove the decoy password.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPhase("idle")}
                  disabled={removing}
                  className="flex-1 rounded-lg border border-line py-2 text-sm font-medium text-muted hover:bg-sunken transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={removing}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removing ? "Removing…" : "Remove decoy"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}

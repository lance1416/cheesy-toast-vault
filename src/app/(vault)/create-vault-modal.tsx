"use client";

import { useState } from "react";
import { useVault } from "@/lib/vault-context";
import { deriveCryptoKey, generateSalt, bufferToBase64 } from "@/lib/crypto";
import Field from "@/components/field";
import Modal from "@/components/modal";
import { EyeIcon } from "@/components/icons";

export default function CreateVaultModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (vaultId: string) => void;
}) {
  const { setKey } = useVault();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const passwordShort = password.length > 0 && password.length < 12;
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const salt = generateSalt();
      const saltB64 = bufferToBase64(salt);
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, salt: saltB64 }),
      });
      if (res.status === 409) {
        setError("A vault with that name already exists.");
        return;
      }
      if (!res.ok) throw new Error();
      const { id } = (await res.json()) as { id: string };
      const key = await deriveCryptoKey(password, salt);
      setKey(id, key);
      onCreated(id);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Vault" titleId="create-vault-title" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Vault Name"
          id="vault-name"
          value={name}
          onChange={setName}
          placeholder="e.g. Personal, Work"
          required
          autoFocus
        />
        <Field
          label="Vault Password"
          id="vault-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="At least 12 characters"
          required
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-stone-500 hover:text-stone-700 transition-colors"
            >
              <EyeIcon open={showPassword} />
            </button>
          }
        />
        {passwordShort && (
          <p className="text-xs text-amber-600 -mt-2">
            {12 - password.length} more character{12 - password.length !== 1 ? "s" : ""} needed
          </p>
        )}
        <Field
          label="Confirm Vault Password"
          id="vault-confirm"
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat your vault password"
          required
        />
        {passwordMismatch && <p className="text-xs text-red-600 -mt-2">Passwords do not match.</p>}
        <p className="text-xs text-stone-600">
          This password encrypts your vault data — it never leaves your browser.
        </p>

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
            disabled={submitting || !name || password.length < 12 || password !== confirm}
            className="flex-1 rounded-lg bg-stone-800 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Vault"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

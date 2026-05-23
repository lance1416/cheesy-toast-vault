"use client";

import { useEffect, useState } from "react";
import { encryptEntry, decryptEntry } from "@/lib/crypto";
import AlertBanner from "@/components/alert-banner";
import Field from "@/components/field";
import Modal from "@/components/modal";
import StrengthBar from "@/components/strength-bar";
import { EyeIcon } from "@/components/icons";
import type { EntryPayload, EntryType, EncryptedEntryProp } from "@/types/vault";
import type { Tag } from "@/types/vault";
import TagSelector from "./tag-selector";
import PasswordGenerator from "./password-generator";

const TYPE_LABELS: Record<EntryType, string> = {
  login: "Login",
  note: "Note",
  card: "Card",
  identity: "Identity",
};

const GENERATOR_ICON = (
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
);

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
  const entryType: EntryType = (entry.entryType as EntryType) || "login";

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  // login
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [originalPassword, setOriginalPassword] = useState("");
  const [originalPasswordChangedAt, setOriginalPasswordChangedAt] = useState<string | undefined>();
  const [totpSecret, setTotpSecret] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  // note
  const [body, setBody] = useState("");
  // card
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardPin, setCardPin] = useState("");
  const [showCardCvv, setShowCardCvv] = useState(false);
  // identity
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [idNumber, setIdNumber] = useState("");

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(entry.tags.map((t) => t.id));
  const [availableTags, setAvailableTags] = useState<Tag[]>(initialTags);
  const [decrypted, setDecrypted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    decryptEntry<EntryPayload>(cryptoKey, entry.encryptedBlob, entry.iv).then((p) => {
      if (cancelled) return;
      setName(p.name);
      setNotes(p.notes ?? "");
      // login
      setUrl(p.url ?? "");
      setUsername(p.username ?? "");
      setEmail(p.email ?? "");
      setPassword(p.password ?? "");
      setOriginalPassword(p.password ?? "");
      setOriginalPasswordChangedAt(p.passwordChangedAt);
      setTotpSecret(p.totpSecret ?? "");
      // note
      setBody(p.body ?? "");
      // card
      setCardholderName(p.cardholderName ?? "");
      setCardNumber(p.cardNumber ?? "");
      setCardExpiry(p.cardExpiry ?? "");
      setCardCvv(p.cardCvv ?? "");
      setCardPin(p.cardPin ?? "");
      // identity
      setFullName(p.fullName ?? "");
      setPhone(p.phone ?? "");
      setAddress(p.address ?? "");
      setIdNumber(p.idNumber ?? "");
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
      const payload: EntryPayload =
        entryType === "login"
          ? {
              type: entryType,
              name,
              url: url || undefined,
              username,
              email,
              password,
              notes: notes || undefined,
              passwordChangedAt:
                password !== originalPassword
                  ? new Date().toISOString()
                  : originalPasswordChangedAt,
              totpSecret: totpSecret.trim().toUpperCase() || undefined,
            }
          : entryType === "note"
            ? { type: entryType, name, body }
            : entryType === "card"
              ? {
                  type: entryType,
                  name,
                  cardholderName: cardholderName || undefined,
                  cardNumber: cardNumber || undefined,
                  cardExpiry: cardExpiry || undefined,
                  cardCvv: cardCvv || undefined,
                  cardPin: cardPin || undefined,
                  notes: notes || undefined,
                }
              : {
                  type: entryType,
                  name,
                  fullName: fullName || undefined,
                  email: email || undefined,
                  phone: phone || undefined,
                  address: address || undefined,
                  idNumber: idNumber || undefined,
                  notes: notes || undefined,
                };

      const { encryptedBlob, iv } = await encryptEntry(cryptoKey, payload);
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

  const typeLabel = TYPE_LABELS[entryType];

  return (
    <Modal title={`Edit ${typeLabel}`} titleId="edit-entry-title" onClose={onClose} scrollable>
      {!decrypted ? (
        <div className="py-8 text-center text-sm text-stone-400">Decrypting…</div>
      ) : (
        <>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Name" id="edit-name" value={name} onChange={setName} required autoFocus />

            {entryType === "login" && (
              <>
                <Field
                  label="URL"
                  id="edit-url"
                  type="url"
                  value={url}
                  onChange={setUrl}
                  placeholder="https://"
                />
                <Field
                  label="Username"
                  id="edit-username"
                  value={username}
                  onChange={setUsername}
                />
                <Field
                  label="Email"
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                />
                <div>
                  <Field
                    label="Password"
                    id="edit-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
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
                          {GENERATOR_ICON}
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
                  id="edit-notes"
                  value={notes}
                  onChange={setNotes}
                  placeholder="Recovery codes, hints…"
                  multiline
                />
                <Field
                  label="2FA Secret"
                  id="edit-totp"
                  value={totpSecret}
                  onChange={setTotpSecret}
                  placeholder="Base32 seed (leave blank to remove)"
                />
              </>
            )}

            {entryType === "note" && (
              <Field
                label="Content"
                id="edit-body"
                value={body}
                onChange={setBody}
                placeholder="Write your note…"
                multiline
                required
              />
            )}

            {entryType === "card" && (
              <>
                <Field
                  label="Cardholder name"
                  id="edit-cardholder"
                  value={cardholderName}
                  onChange={setCardholderName}
                />
                <Field
                  label="Card number"
                  id="edit-cardnumber"
                  value={cardNumber}
                  onChange={setCardNumber}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Expiry"
                    id="edit-expiry"
                    value={cardExpiry}
                    onChange={setCardExpiry}
                    placeholder="MM/YY"
                  />
                  <Field
                    label="CVV"
                    id="edit-cvv"
                    type={showCardCvv ? "text" : "password"}
                    value={cardCvv}
                    onChange={setCardCvv}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowCardCvv((v) => !v)}
                        aria-pressed={showCardCvv}
                        aria-label={showCardCvv ? "Hide CVV" : "Show CVV"}
                        className="text-subtle hover:text-default transition-colors"
                      >
                        <EyeIcon open={showCardCvv} />
                      </button>
                    }
                  />
                </div>
                <Field
                  label="PIN"
                  id="edit-pin"
                  type="password"
                  value={cardPin}
                  onChange={setCardPin}
                  placeholder="Optional"
                />
                <Field
                  label="Notes"
                  id="edit-card-notes"
                  value={notes}
                  onChange={setNotes}
                  placeholder="Additional info…"
                  multiline
                />
              </>
            )}

            {entryType === "identity" && (
              <>
                <Field
                  label="Full name"
                  id="edit-fullname"
                  value={fullName}
                  onChange={setFullName}
                />
                <Field
                  label="Email"
                  id="edit-id-email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                />
                <Field label="Phone" id="edit-phone" value={phone} onChange={setPhone} />
                <Field
                  label="Address"
                  id="edit-address"
                  value={address}
                  onChange={setAddress}
                  multiline
                />
                <Field
                  label="ID / Passport number"
                  id="edit-idnumber"
                  value={idNumber}
                  onChange={setIdNumber}
                />
                <Field
                  label="Notes"
                  id="edit-id-notes"
                  value={notes}
                  onChange={setNotes}
                  placeholder="Additional info…"
                  multiline
                />
              </>
            )}

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
                disabled={saving || !name}
                className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-5 border-t border-divider">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-lg border border-red-200 dark:border-red-900/50 py-2.5 text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                Delete entry
              </button>
            ) : (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 space-y-3">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Delete <span className="font-bold">{name}</span>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-lg border border-line bg-surface py-2 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
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

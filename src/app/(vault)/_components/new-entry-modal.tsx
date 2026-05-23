"use client";

import { useState } from "react";
import { encryptEntry } from "@/lib/crypto";
import AlertBanner from "@/components/alert-banner";
import Field from "@/components/field";
import Modal from "@/components/modal";
import StrengthBar from "@/components/strength-bar";
import { EyeIcon, LockIcon, NoteIcon, CreditCardIcon, IdentityIcon } from "@/components/icons";
import type { EntryType, Tag } from "@/types/vault";
import TagSelector from "./tag-selector";
import PasswordGenerator from "./password-generator";

const TYPE_META: { type: EntryType; label: string; icon: React.ReactNode }[] = [
  { type: "login", label: "Login", icon: <LockIcon /> },
  { type: "note", label: "Note", icon: <NoteIcon /> },
  { type: "card", label: "Card", icon: <CreditCardIcon /> },
  { type: "identity", label: "Identity", icon: <IdentityIcon /> },
];

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
  const [entryType, setEntryType] = useState<EntryType>("login");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  // login
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>(initialTags);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload =
        entryType === "login"
          ? {
              type: entryType,
              name,
              url: url || undefined,
              username,
              email,
              password,
              notes: notes || undefined,
              passwordChangedAt: new Date().toISOString(),
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
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultId, encryptedBlob, iv, entryType, tagIds: selectedTagIds }),
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

  const meta = TYPE_META.find((t) => t.type === entryType)!;

  return (
    <Modal title={`New ${meta.label}`} titleId="new-entry-title" onClose={onClose} scrollable>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type picker */}
        <div
          role="group"
          aria-label="Entry type"
          className="flex rounded-lg border border-line overflow-hidden"
        >
          {TYPE_META.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setEntryType(t.type)}
              aria-pressed={entryType === t.type}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                entryType === t.type
                  ? "bg-stone-800 dark:bg-amber-600 text-white"
                  : "text-muted hover:text-default hover:bg-sunken"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <Field
          label="Name"
          id="new-name"
          value={name}
          onChange={setName}
          placeholder={
            entryType === "note"
              ? "Note title"
              : entryType === "card"
                ? "e.g. Chase Visa"
                : entryType === "identity"
                  ? "e.g. US Passport"
                  : "e.g. GitHub"
          }
          required
          autoFocus
        />

        {/* Login fields */}
        {entryType === "login" && (
          <>
            <Field
              label="URL"
              id="new-url"
              type="url"
              value={url}
              onChange={setUrl}
              placeholder="https://"
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
              id="new-notes"
              value={notes}
              onChange={setNotes}
              placeholder="Recovery codes, hints…"
              multiline
            />
            <Field
              label="2FA Secret"
              id="new-totp"
              value={totpSecret}
              onChange={setTotpSecret}
              placeholder="Base32 seed (e.g. JBSWY3DPEHPK3PXP)"
            />
          </>
        )}

        {/* Note fields */}
        {entryType === "note" && (
          <Field
            label="Content"
            id="new-body"
            value={body}
            onChange={setBody}
            placeholder="Write your note…"
            multiline
            required
          />
        )}

        {/* Card fields */}
        {entryType === "card" && (
          <>
            <Field
              label="Cardholder name"
              id="new-cardholder"
              value={cardholderName}
              onChange={setCardholderName}
              placeholder="Name on card"
            />
            <Field
              label="Card number"
              id="new-cardnumber"
              value={cardNumber}
              onChange={setCardNumber}
              placeholder="•••• •••• •••• ••••"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Expiry"
                id="new-expiry"
                value={cardExpiry}
                onChange={setCardExpiry}
                placeholder="MM/YY"
              />
              <div>
                <Field
                  label="CVV"
                  id="new-cvv"
                  type={showCardCvv ? "text" : "password"}
                  value={cardCvv}
                  onChange={setCardCvv}
                  placeholder="•••"
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
            </div>
            <Field
              label="PIN"
              id="new-pin"
              type="password"
              value={cardPin}
              onChange={setCardPin}
              placeholder="Optional"
            />
            <Field
              label="Notes"
              id="new-card-notes"
              value={notes}
              onChange={setNotes}
              placeholder="Additional info…"
              multiline
            />
          </>
        )}

        {/* Identity fields */}
        {entryType === "identity" && (
          <>
            <Field
              label="Full name"
              id="new-fullname"
              value={fullName}
              onChange={setFullName}
              placeholder="First Last"
            />
            <Field
              label="Email"
              id="new-id-email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="e.g. john@example.com"
            />
            <Field
              label="Phone"
              id="new-phone"
              value={phone}
              onChange={setPhone}
              placeholder="+1 555 000 0000"
            />
            <Field
              label="Address"
              id="new-address"
              value={address}
              onChange={setAddress}
              placeholder="Street, City, Country"
              multiline
            />
            <Field
              label="ID / Passport number"
              id="new-idnumber"
              value={idNumber}
              onChange={setIdNumber}
              placeholder="Document number"
            />
            <Field
              label="Notes"
              id="new-id-notes"
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

export type Tag = { id: string; name: string };

export type EntryType = "login" | "note" | "card" | "identity";

export const BUILTIN_ENTRY_TYPES: readonly string[] = ["login", "note", "card", "identity"];

export type FieldKind = "text" | "secret" | "url" | "email" | "date" | "multiline";

export type CustomFieldDef = {
  id: string;
  label: string;
  kind: FieldKind;
};

export type CustomEntryTypeDef = {
  id: string;
  name: string;
  fields: CustomFieldDef[];
};

export type EntryPayload = {
  // undefined means "login" for entries created before type support was added; custom types use their cuid
  type?: string;
  name: string;
  notes?: string;
  // login
  url?: string;
  username?: string;
  email?: string;
  password?: string;
  passwordChangedAt?: string;
  totpSecret?: string;
  // note
  body?: string;
  // card
  cardholderName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardPin?: string;
  // identity
  fullName?: string;
  phone?: string;
  address?: string;
  idNumber?: string;
  // custom entry types — fieldId → value
  customFields?: Record<string, string>;
};

export type EncryptedEntryProp = {
  id: string;
  encryptedBlob: string;
  iv: string;
  pinned: boolean;
  entryType: string;
  isDecoy: boolean;
  tags: { id: string; name: string }[];
  updatedAt: string;
};

export type DecryptedEntry = EntryPayload & {
  id: string;
  pinned: boolean;
  entryType: string;
  tags: { id: string; name: string }[];
  updatedAt: string;
};

export type EntryHistoryItem = {
  id: string;
  encryptedBlob: string;
  iv: string;
  savedAt: string;
};

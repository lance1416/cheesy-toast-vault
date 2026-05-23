export type Tag = { id: string; name: string };

export type EntryType = "login" | "note" | "card" | "identity";

export type EntryPayload = {
  // undefined means "login" for entries created before type support was added
  type?: EntryType;
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
};

export type EncryptedEntryProp = {
  id: string;
  encryptedBlob: string;
  iv: string;
  pinned: boolean;
  entryType: string;
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

export type Tag = { id: string; name: string };

export type EntryPayload = {
  name: string;
  url?: string;
  username: string;
  email: string;
  password: string;
  notes?: string;
  passwordChangedAt?: string; // ISO timestamp; set on create, updated when password field changes
};

export type EncryptedEntryProp = {
  id: string;
  encryptedBlob: string;
  iv: string;
  tags: { id: string; name: string }[];
  updatedAt: string;
};

export type DecryptedEntry = EntryPayload & {
  id: string;
  tags: { id: string; name: string }[];
  updatedAt: string;
};

export type CrossVaultEntry = DecryptedEntry & {
  vaultId: string;
  vaultName: string;
};

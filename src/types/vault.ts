export type EntryPayload = {
  name: string;
  url?: string;
  username: string;
  email: string;
  password: string;
  notes?: string;
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

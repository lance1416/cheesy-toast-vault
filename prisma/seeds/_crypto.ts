/** Shared crypto helpers for seed scripts — mirrors src/lib/crypto.ts but runs in Node. */

export async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
}

export async function encryptEntry(
  key: CryptoKey,
  data: object,
): Promise<{ encryptedBlob: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(16) as Uint8Array<ArrayBuffer>);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  );
  return {
    encryptedBlob: Buffer.from(ciphertext).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
  };
}

export function saltB64(): { bytes: Uint8Array<ArrayBuffer>; b64: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(16) as Uint8Array<ArrayBuffer>);
  return { bytes, b64: Buffer.from(bytes).toString("base64") };
}

const DAY = 24 * 60 * 60 * 1000;
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

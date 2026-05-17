// Client-only — never import in Server Components or route handlers

export function generateSalt(): Uint8Array<ArrayBuffer> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}

export function bufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer as ArrayBuffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

export async function deriveCryptoKey(
  masterPassword: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptEntry(
  key: CryptoKey,
  data: object,
): Promise<{ encryptedBlob: string; iv: string }> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  );
  return { encryptedBlob: bufferToBase64(ciphertext), iv: bufferToBase64(iv) };
}

export async function decryptEntry<T>(
  key: CryptoKey,
  encryptedBlob: string,
  iv: string,
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(iv) },
    key,
    base64ToBuffer(encryptedBlob),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

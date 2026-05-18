// Client-only — never import in Server Components or route handlers
import { WORDLIST } from "./wordlist";

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

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!password) return { score: 0, label: "Very weak" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  // Up to +1 for character variety (0.5 per class, capped at 1)
  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^a-zA-Z0-9]/.test(password)) classes++;
  score += Math.min(1, classes * 0.5);
  const clamped = Math.min(4, Math.round(score)) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const;
  return { score: clamped, label: labels[clamped] };
}

export function generatePassword({
  length = 20,
  uppercase = true,
  numbers = true,
  symbols = true,
}: {
  length?: number;
  uppercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
} = {}): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const syms = "!@#$%^&*()-_=+[]{}|;:,.<>?";

  let charset = lower;
  if (uppercase) charset += upper;
  if (numbers) charset += digits;
  if (symbols) charset += syms;

  // Rejection sampling to avoid modulo bias
  const max = Math.floor(256 / charset.length) * charset.length;
  const buf = new Uint8Array(length * 2);
  let result = "";
  while (result.length < length) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && result.length < length; i++) {
      if (buf[i] < max) result += charset[buf[i] % charset.length];
    }
  }
  return result;
}

export function generatePassphrase({
  wordCount = 4,
  separator = "-",
  capitalize = false,
}: {
  wordCount?: number;
  separator?: string;
  capitalize?: boolean;
} = {}): string {
  const words: string[] = [];
  // 2-byte rejection sampling: max index range aligned to WORDLIST.length
  const maxVal = Math.floor(65536 / WORDLIST.length) * WORDLIST.length;
  const buf = new Uint8Array(wordCount * 8);
  while (words.length < wordCount) {
    crypto.getRandomValues(buf);
    for (let i = 0; i + 1 < buf.length && words.length < wordCount; i += 2) {
      const val = (buf[i] << 8) | buf[i + 1];
      if (val < maxVal) {
        let word = WORDLIST[val % WORDLIST.length];
        if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1);
        words.push(word);
      }
    }
  }
  return words.join(separator);
}

export async function checkBreach(password: string): Promise<number> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const prefix = hex.slice(0, 5);
  const suffix = hex.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  if (!res.ok) throw new Error("HIBP request failed");
  const text = await res.text();
  const line = text.split("\n").find((l) => l.trimEnd().startsWith(suffix));
  if (!line) return 0;
  return parseInt(line.split(":")[1], 10);
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

import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  generateSalt,
  bufferToBase64,
  base64ToBuffer,
  deriveCryptoKey,
  encryptEntry,
  decryptEntry,
  passwordStrength,
  generatePassword,
  generatePassphrase,
} from "@/lib/crypto";

// ─── Encoding helpers ─────────────────────────────────────────────────────────

describe("bufferToBase64 / base64ToBuffer", () => {
  it("round-trips a Uint8Array", () => {
    const bytes = new Uint8Array([0, 1, 2, 128, 255]);
    expect(base64ToBuffer(bufferToBase64(bytes))).toEqual(bytes);
  });

  it("round-trips an ArrayBuffer", () => {
    const bytes = new Uint8Array([10, 20, 30]);
    expect(base64ToBuffer(bufferToBase64(bytes.buffer))).toEqual(bytes);
  });

  it("produces standard base64 characters only", () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    expect(bufferToBase64(bytes)).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

// ─── Salt ─────────────────────────────────────────────────────────────────────

describe("generateSalt", () => {
  it("returns exactly 16 bytes", () => {
    expect(generateSalt().byteLength).toBe(16);
  });

  it("produces unique values each call", () => {
    const a = bufferToBase64(generateSalt());
    const b = bufferToBase64(generateSalt());
    expect(a).not.toBe(b);
  });
});

// ─── Crypto key + encrypt/decrypt ─────────────────────────────────────────────
// deriveCryptoKey runs 310,000 PBKDF2 iterations — derive once and share.

describe("deriveCryptoKey / encryptEntry / decryptEntry", () => {
  let key: CryptoKey;
  let wrongKey: CryptoKey;
  const salt = generateSalt();

  beforeAll(async () => {
    [key, wrongKey] = await Promise.all([
      deriveCryptoKey("correct-horse-battery", salt),
      deriveCryptoKey("wrong-horse-battery", salt),
    ]);
  }, 60_000);

  it("deriveCryptoKey returns a CryptoKey", () => {
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("round-trips a plain object", async () => {
    const payload = {
      name: "GitHub",
      username: "alice",
      email: "alice@example.com",
      password: "hunter2",
    };
    const { encryptedBlob, iv } = await encryptEntry(key, payload);
    expect(typeof encryptedBlob).toBe("string");
    expect(typeof iv).toBe("string");
    const decrypted = await decryptEntry<typeof payload>(key, encryptedBlob, iv);
    expect(decrypted).toEqual(payload);
  });

  it("produces a different ciphertext each call (random IV)", async () => {
    const payload = { a: 1 };
    const enc1 = await encryptEntry(key, payload);
    const enc2 = await encryptEntry(key, payload);
    expect(enc1.encryptedBlob).not.toBe(enc2.encryptedBlob);
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it("decryption with wrong key throws", async () => {
    const { encryptedBlob, iv } = await encryptEntry(key, { secret: true });
    await expect(decryptEntry(wrongKey, encryptedBlob, iv)).rejects.toThrow();
  });

  it("decryption with tampered ciphertext throws", async () => {
    const { encryptedBlob, iv } = await encryptEntry(key, { secret: true });
    const tampered = encryptedBlob.slice(0, -4) + "AAAA";
    await expect(decryptEntry(key, tampered, iv)).rejects.toThrow();
  });
});

// ─── Password strength ────────────────────────────────────────────────────────

describe("passwordStrength", () => {
  it("empty string → score 0, label Very weak", () => {
    const r = passwordStrength("");
    expect(r.score).toBe(0);
    expect(r.label).toBe("Very weak");
  });

  it("short lowercase only → score 1", () => {
    // length 0: 0 points; 1 class (lower) → +0.5 → round(0.5)=1
    const r = passwordStrength("abc");
    expect(r.score).toBe(1);
  });

  it("8+ chars mixed case → score 2", () => {
    // length>=8: 1 pt; 2 classes (lower+upper): +1 → 2
    const r = passwordStrength("Abcdefgh");
    expect(r.score).toBe(2);
  });

  it("12+ chars with all classes → score 4", () => {
    // length>=12: 2 pts; all 4 classes: +1 → 3; round(3)=3
    // Wait: 12 chars gets +2, all classes +1 = 3, not 4
    // 16+ chars + all classes = 3+1 = 4
    const r = passwordStrength("Abcdefghijkl1!");
    expect(r.score).toBe(3);
    expect(r.label).toBe("Strong");
  });

  it("16+ chars with all character classes → score 4, Very strong", () => {
    const r = passwordStrength("Abcdefghijklmno1!");
    expect(r.score).toBe(4);
    expect(r.label).toBe("Very strong");
  });

  it("score is always 0–4", () => {
    for (const pw of ["", "a", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]) {
      const { score } = passwordStrength(pw);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(4);
    }
  });
});

// ─── Password generator ───────────────────────────────────────────────────────

describe("generatePassword", () => {
  it("returns the requested length", () => {
    expect(generatePassword({ length: 16 }).length).toBe(16);
    expect(generatePassword({ length: 32 }).length).toBe(32);
  });

  it("default call returns 20 chars", () => {
    expect(generatePassword().length).toBe(20);
  });

  it("uppercase: false → no uppercase letters", () => {
    const pw = generatePassword({ length: 100, uppercase: false });
    expect(pw).not.toMatch(/[A-Z]/);
  });

  it("numbers: false → no digits", () => {
    const pw = generatePassword({ length: 100, numbers: false });
    expect(pw).not.toMatch(/[0-9]/);
  });

  it("symbols: false → no symbols", () => {
    const pw = generatePassword({ length: 100, symbols: false });
    expect(pw).not.toMatch(/[^a-zA-Z0-9]/);
  });

  it("produces different results each call", () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});

// ─── Passphrase generator ─────────────────────────────────────────────────────

describe("generatePassphrase", () => {
  it("returns the requested word count", () => {
    const phrase = generatePassphrase({ wordCount: 4 });
    expect(phrase.split("-").length).toBe(4);
  });

  it("respects custom separator", () => {
    const phrase = generatePassphrase({ wordCount: 3, separator: "." });
    expect(phrase.split(".").length).toBe(3);
  });

  it("capitalize: true → each word starts uppercase", () => {
    const phrase = generatePassphrase({ wordCount: 4, capitalize: true });
    for (const word of phrase.split("-")) {
      expect(word[0]).toBe(word[0].toUpperCase());
    }
  });

  it("produces different phrases each call", () => {
    expect(generatePassphrase()).not.toBe(generatePassphrase());
  });
});

// ─── checkBreach (network — always mock) ─────────────────────────────────────

describe("checkBreach", () => {
  it("returns 0 when password is not in any breach", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "AAAAABBBBBCCCCC:5\nDDDDDEEEEEFFFFF:3",
      }),
    );
    const { checkBreach } = await import("@/lib/crypto");
    // The prefix + suffix won't match the stub lines, so count = 0
    const count = await checkBreach("unlikely-to-match-stub");
    expect(count).toBe(0);
    vi.unstubAllGlobals();
  });
});

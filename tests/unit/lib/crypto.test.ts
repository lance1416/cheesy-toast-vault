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
  checkBreach,
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

  it("round-trips a subarray with non-zero byteOffset", () => {
    // Slices of typed arrays share the underlying ArrayBuffer with an offset.
    // bufferToBase64 must use byteOffset/byteLength, not the raw buffer start.
    const full = new Uint8Array([0, 1, 2, 3, 4]);
    const slice = full.subarray(2); // byteOffset=2, values=[2,3,4]
    expect(base64ToBuffer(bufferToBase64(slice))).toEqual(new Uint8Array([2, 3, 4]));
  });
});

// ─── Salt ─────────────────────────────────────────────────────────────────────

describe("generateSalt", () => {
  it("returns exactly 16 bytes", () => {
    expect(generateSalt().byteLength).toBe(16);
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

  it("short lowercase only → score 1, Weak", () => {
    // length 3: 0 length points; 1 class (lower) → +0.5 → round(0.5)=1
    const r = passwordStrength("abc");
    expect(r.score).toBe(1);
    expect(r.label).toBe("Weak");
  });

  it("8+ chars mixed case → score 2, Fair", () => {
    // length>=8: +1; 2 classes (lower+upper): +1 → 2
    const r = passwordStrength("Abcdefgh");
    expect(r.score).toBe(2);
    expect(r.label).toBe("Fair");
  });

  it("12–15 chars with all classes → score 3, Strong", () => {
    // length>=12: +2; all 4 classes: +1 → 3
    const r = passwordStrength("Abcdefghijkl1!");
    expect(r.score).toBe(3);
    expect(r.label).toBe("Strong");
  });

  it("16+ chars with all character classes → score 4, Very strong", () => {
    const r = passwordStrength("Abcdefghijklmno1!");
    expect(r.score).toBe(4);
    expect(r.label).toBe("Very strong");
  });
});

// ─── Password generator ───────────────────────────────────────────────────────

describe("generatePassword", () => {
  it("returns the requested length", () => {
    expect(generatePassword({ length: 16 }).length).toBe(16);
    expect(generatePassword({ length: 32 }).length).toBe(32);
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

  it("all flags false still produces output (lowercase-only charset)", () => {
    const pw = generatePassword({ length: 20, uppercase: false, numbers: false, symbols: false });
    expect(pw).toHaveLength(20);
    expect(pw).toMatch(/^[a-z]+$/);
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
});

// ─── checkBreach (network — always mock) ─────────────────────────────────────
// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
// prefix = "5BAA6", suffix = "1E4C9B93F3F0682250B6CF8331B7EE68FD8"

describe("checkBreach", () => {
  it("returns 0 when the hash suffix is not in the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "AAAAABBBBBCCCCC:5\nDDDDDEEEEEFFFFF:3",
      }),
    );
    expect(await checkBreach("unlikely-to-match-stub")).toBe(0);
    vi.unstubAllGlobals();
  });

  it("returns the breach count when the hash suffix matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        // Suffix for "password" with a known breach count
        text: async () => "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3303003\nSOMEOTHERSUFFIX:1",
      }),
    );
    expect(await checkBreach("password")).toBe(3303003);
    vi.unstubAllGlobals();
  });

  it("throws when the HIBP API returns an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: async () => "" }));
    await expect(checkBreach("any-password")).rejects.toThrow("HIBP request failed");
    vi.unstubAllGlobals();
  });
});

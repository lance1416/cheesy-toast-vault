import { describe, it, expect, beforeAll } from "vitest";
import { generate } from "otplib";
import {
  createMfaToken,
  verifyMfaToken,
  generateBackupCodes,
  hashBackupCode,
  normalizeBackupCode,
  generateTotpUri,
  verifyTotpToken,
  generateSecret,
} from "@/server/totp";

// ─── MFA challenge token ──────────────────────────────────────────────────────

describe("createMfaToken / verifyMfaToken", () => {
  it("verifyMfaToken returns userId for a fresh token", () => {
    const token = createMfaToken("user_abc");
    expect(verifyMfaToken(token)).toBe("user_abc");
  });

  it("different userIds produce different tokens", () => {
    const t1 = createMfaToken("user_aaa");
    const t2 = createMfaToken("user_bbb");
    expect(t1).not.toBe(t2);
  });

  it("returns null for an empty string", () => {
    expect(verifyMfaToken("")).toBeNull();
  });

  it("returns null for a malformed token (no colons)", () => {
    expect(verifyMfaToken("notavalidtoken")).toBeNull();
  });

  it("returns null for a token with a tampered HMAC", () => {
    const token = createMfaToken("user_abc");
    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyMfaToken(tampered)).toBeNull();
  });

  it("returns null for an expired token", () => {
    // Build a syntactically valid token with an expiry in the past
    const userId = "user_abc";
    const exp = Date.now() - 1_000; // already expired
    const payload = `${userId}:${exp}`;
    const fakeToken = `${payload}:badhmacsuffix`;
    // Expiry check fires before HMAC — result is null regardless of HMAC
    expect(verifyMfaToken(fakeToken)).toBeNull();
  });

  it("preserves userId containing hyphens (e.g. cuid format)", () => {
    const userId = "clxyz1234-5678";
    const token = createMfaToken(userId);
    expect(verifyMfaToken(token)).toBe(userId);
  });
});

// ─── Backup codes ─────────────────────────────────────────────────────────────

describe("generateBackupCodes", () => {
  const VALID_CHAR =
    /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/;

  it("generates the requested count (10)", () => {
    expect(generateBackupCodes(10)).toHaveLength(10);
  });

  it("generates the requested count (5)", () => {
    expect(generateBackupCodes(5)).toHaveLength(5);
  });

  it("each code matches the XXXXX-XXXXX format", () => {
    for (const code of generateBackupCodes(10)) {
      expect(code).toMatch(VALID_CHAR);
    }
  });

  it("all codes are unique", () => {
    const codes = generateBackupCodes(10);
    expect(new Set(codes).size).toBe(10);
  });

  it("uses only the unambiguous alphabet (no 0, O, 1, I)", () => {
    const codes = generateBackupCodes(20).join("");
    expect(codes).not.toMatch(/[0OI1]/);
  });
});

describe("normalizeBackupCode", () => {
  it("strips hyphens", () => {
    expect(normalizeBackupCode("ABCDE-FGHJK")).toBe("ABCDEFGHJK");
  });

  it("uppercases the code", () => {
    expect(normalizeBackupCode("abcde-fghjk")).toBe("ABCDEFGHJK");
  });

  it("handles a code with no hyphen", () => {
    expect(normalizeBackupCode("abcdefghjk")).toBe("ABCDEFGHJK");
  });
});

describe("hashBackupCode", () => {
  it("is deterministic for the same input", () => {
    expect(hashBackupCode("ABCDE-FGHJK")).toBe(hashBackupCode("ABCDE-FGHJK"));
  });

  it("is case-insensitive (normalises before hashing)", () => {
    expect(hashBackupCode("abcde-fghjk")).toBe(hashBackupCode("ABCDE-FGHJK"));
  });

  it("is hyphen-insensitive", () => {
    expect(hashBackupCode("ABCDEFGHJK")).toBe(hashBackupCode("ABCDE-FGHJK"));
  });

  it("produces a 64-character lowercase hex string (SHA-256)", () => {
    expect(hashBackupCode("ABCDE-FGHJK")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different codes produce different hashes", () => {
    expect(hashBackupCode("ABCDE-FGHJK")).not.toBe(hashBackupCode("23456-789AB"));
  });
});

// ─── TOTP URI ─────────────────────────────────────────────────────────────────

describe("generateTotpUri", () => {
  const secret = "JBSWY3DPEHPK3PXP";

  it("returns an otpauth://totp/ URI", () => {
    const uri = generateTotpUri("user@example.com", secret);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
  });

  it("includes the secret", () => {
    const uri = generateTotpUri("user@example.com", secret);
    expect(uri).toContain(secret);
  });

  it("includes the issuer", () => {
    const uri = generateTotpUri("user@example.com", secret);
    expect(uri).toContain("Cheesy");
  });
});

// ─── verifyTotpToken ──────────────────────────────────────────────────────────

describe("verifyTotpToken", () => {
  let secret: string;
  let validToken: string;

  beforeAll(async () => {
    secret = generateSecret();
    validToken = await generate({ secret });
  });

  it("returns true for the current TOTP code", async () => {
    expect(await verifyTotpToken(validToken, secret)).toBe(true);
  });

  it("returns false for an all-zeros code", async () => {
    expect(await verifyTotpToken("000000", secret)).toBe(false);
  });

  it("returns false for a code from a different secret", async () => {
    const otherSecret = generateSecret();
    const otherToken = await generate({ secret: otherSecret });
    // Tokens could collide by chance (1 in 10^6) — using a fresh secret makes it extremely unlikely
    expect(await verifyTotpToken(otherToken, secret)).toBe(false);
  });
});

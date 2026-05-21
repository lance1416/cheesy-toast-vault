import { createHmac, createHash, randomBytes } from "crypto";
import { generateSecret, generateURI, verify as otpVerify } from "otplib";

export { generateSecret };

/** Generate the otpauth:// URI for QR code generation. */
export function generateTotpUri(email: string, secret: string): string {
  return generateURI({
    label: `Cheesy Toast Vault:${email}`,
    issuer: "Cheesy Toast Vault",
    secret,
  });
}

/** Verify a 6-digit TOTP token against a stored secret.
 *  epochTolerance: 30 accepts codes from the previous 30-second period,
 *  guarding against client/server clock drift. */
export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  const result = await otpVerify({ secret, token, epochTolerance: 30 });
  return result.valid;
}

// ─── MFA challenge token ──────────────────────────────────────────────────────
// Short-lived HMAC-signed token passed from the password step to the TOTP step.
// Format: `<userId>:<expiry_ms>:<base64url-hmac>`
// Expiry is kept intentionally short — the user should be sitting at their
// authenticator app already.

const MFA_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hmacPayload(payload: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "dev-secret")
    .update(payload)
    .digest("base64url");
}

export function createMfaToken(userId: string): string {
  const exp = Date.now() + MFA_TOKEN_TTL_MS;
  const payload = `${userId}:${exp}`;
  return `${payload}:${hmacPayload(payload)}`;
}

/** Returns userId if valid and not expired; null otherwise. */
export function verifyMfaToken(token: string): string | null {
  // Split from the right to isolate hmac (which contains no colons)
  const lastColon = token.lastIndexOf(":");
  const secondLastColon = token.lastIndexOf(":", lastColon - 1);
  if (lastColon < 0 || secondLastColon < 0) return null;

  const userId = token.slice(0, secondLastColon);
  const expStr = token.slice(secondLastColon + 1, lastColon);
  const hmac = token.slice(lastColon + 1);

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Date.now() > exp) return null;

  const payload = `${userId}:${exp}`;
  if (hmacPayload(payload) !== hmac) return null;

  return userId;
}

// ─── Backup codes ─────────────────────────────────────────────────────────────
// 10 single-use recovery codes, each 10 chars from an unambiguous alphabet.
// Displayed as XXXXX-XXXXX; stored as SHA-256 hashes.

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // excludes 0/O and 1/I (visually ambiguous)

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10);
    let raw = "";
    for (const b of bytes) raw += ALPHABET[b % ALPHABET.length];
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}

export function normalizeBackupCode(code: string): string {
  return code.toUpperCase().replace(/-/g, "");
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

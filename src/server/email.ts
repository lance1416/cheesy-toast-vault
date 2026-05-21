// Server-only utility — only import in route handlers or server components
import { Resend } from "resend";
import logger from "@/server/logger";

let cachedResend: Resend | null = null;

function getResend(): Resend {
  if (cachedResend) return cachedResend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  cachedResend = new Resend(key);
  return cachedResend;
}

function getFrom(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not configured");
  return from;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { data, error } = await getResend().emails.send({
    from: getFrom(),
    to,
    subject: "Reset your login password",
    text: [
      "You requested a password reset for your Cheesy Toast Vault account.",
      "",
      "Click the link below to set a new login password. This link expires in 1 hour.",
      "",
      resetUrl,
      "",
      "⚠️  This resets your LOGIN password only.",
      "Your vault encryption password is separate and cannot be reset — it is never sent to our servers.",
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>You requested a password reset for your Cheesy Toast Vault account.</p>
      <p>Click the button below to set a new login password. This link expires in <strong>1 hour</strong>.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#92400e;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Reset login password</a></p>
      <p style="color:#92400e;font-weight:600">⚠️ This resets your LOGIN password only.</p>
      <p style="color:#6b7280">Your vault encryption password is separate and cannot be reset — it is never sent to our servers.</p>
      <p style="color:#6b7280;font-size:13px">If you did not request this, you can safely ignore this email.</p>
    `,
  });
  if (error) {
    logger.error({ error, to }, "resend: failed to send password reset email");
    throw error;
  }
  logger.debug({ id: data?.id, to }, "resend: password reset email sent");
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const { data, error } = await getResend().emails.send({
    from: getFrom(),
    to,
    subject: "Verify your email address",
    text: [
      "Welcome to Cheesy Toast Vault! Please verify your email address.",
      "",
      verifyUrl,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),
    html: `
      <p>Welcome to Cheesy Toast Vault! Please verify your email address to activate your account.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#92400e;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Verify email address</a></p>
      <p style="color:#6b7280;font-size:13px">This link expires in 24 hours.</p>
    `,
  });
  if (error) {
    logger.error({ error, to }, "resend: failed to send verification email");
    throw error;
  }
  logger.debug({ id: data?.id, to }, "resend: verification email sent");
}

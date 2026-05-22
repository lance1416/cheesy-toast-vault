import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { authLimiter, totpLimiter, getIpFromRecord } from "@/server/rate-limit";
import { verifyTotpToken, createMfaToken, verifyMfaToken, hashBackupCode } from "@/server/totp";
import logger from "@/server/logger";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // TOTP second-factor fields — only present during the MFA challenge step
        totpToken: { label: "MFA Token", type: "text" },
        totpCode: { label: "Code", type: "text" },
      },
      async authorize(credentials, req) {
        const ip = getIpFromRecord(req.headers as Record<string, string | undefined>);

        // ── TOTP challenge step ───────────────────────────────────────────────
        if (credentials?.totpToken) {
          if (process.env.BYPASS_RATE_LIMIT !== "1") {
            try {
              await totpLimiter.consume(ip);
            } catch {
              logger.warn({ ip }, "TOTP rate limited");
              throw new Error("rate_limited");
            }
          }

          const userId = verifyMfaToken(credentials.totpToken);
          if (!userId) {
            logger.warn({ ip }, "TOTP challenge — invalid or expired token");
            return null;
          }

          const user = await db.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              emailVerified: true,
              totpSecret: true,
              totpBackupCodes: true,
            },
          });
          if (!user?.totpSecret) return null;

          const code = (credentials.totpCode ?? "").trim();
          const isNumericOtp = /^\d{6}$/.test(code);
          const totpMethod = isNumericOtp ? "totp" : "backup_code";
          let valid = false;

          if (isNumericOtp) {
            valid = await verifyTotpToken(code, user.totpSecret);
          } else {
            // Backup code — find, verify, and consume it
            const hash = hashBackupCode(code);
            const idx = user.totpBackupCodes.indexOf(hash);
            if (idx >= 0) {
              valid = true;
              const remaining = user.totpBackupCodes.filter((_, i) => i !== idx);
              await db.user.update({ where: { id: userId }, data: { totpBackupCodes: remaining } });
              logger.info({ userId }, "backup code consumed");
            }
          }

          if (!valid) {
            logger.warn({ userId, ip }, "TOTP verification failed");
            db.loginAudit
              .create({ data: { userId, ip, success: false, method: totpMethod } })
              .catch(() => {});
            return null;
          }

          logger.info({ userId }, "TOTP login successful");
          db.loginAudit
            .create({ data: { userId, ip, success: true, method: totpMethod } })
            .catch(() => {});
          return { id: user.id, email: user.email!, emailVerified: user.emailVerified };
        }

        // ── Password step ─────────────────────────────────────────────────────
        if (!credentials?.email || !credentials?.password) return null;

        if (process.env.BYPASS_RATE_LIMIT !== "1") {
          try {
            await authLimiter.consume(ip);
          } catch {
            logger.warn({ ip }, "login rate limited");
            throw new Error("rate_limited");
          }
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            emailVerified: true,
            totpEnabled: true,
          },
        });

        if (!user) {
          logger.warn({ ip, email: credentials.email }, "login failed — user not found");
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          logger.warn({ ip, email: credentials.email }, "login failed — wrong password");
          db.loginAudit
            .create({ data: { userId: user.id, ip, success: false, method: "password" } })
            .catch(() => {});
          return null;
        }

        // Password correct — check if TOTP is required
        if (user.totpEnabled) {
          const token = createMfaToken(user.id);
          logger.info({ userId: user.id }, "password ok, MFA required");
          throw new Error(`mfa_required:${token}`);
        }

        logger.info({ userId: user.id, email: user.email }, "login successful");
        db.loginAudit
          .create({ data: { userId: user.id, ip, success: true, method: "password" } })
          .catch(() => {});
        return { id: user.id, email: user.email, emailVerified: user.emailVerified };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.emailVerified = !!user.emailVerified;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
};

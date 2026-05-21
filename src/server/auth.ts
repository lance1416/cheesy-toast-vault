import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { authLimiter, getIpFromRecord } from "@/server/rate-limit";
import logger from "@/server/logger";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const ip = getIpFromRecord(req.headers as Record<string, string | undefined>);

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
          select: { id: true, email: true, passwordHash: true, emailVerified: true },
        });

        if (!user) {
          logger.warn({ ip, email: credentials.email }, "login failed — user not found");
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          logger.warn({ ip, email: credentials.email }, "login failed — wrong password");
          return null;
        }

        logger.info({ userId: user.id, email: user.email }, "login successful");
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

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { authLimiter, getIpFromRecord } from "@/server/rate-limit";

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

        if (process.env.BYPASS_RATE_LIMIT !== "1") {
          const ip = getIpFromRecord(req.headers as Record<string, string | undefined>);
          try {
            await authLimiter.consume(ip);
          } catch {
            throw new Error("rate_limited");
          }
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          select: { id: true, email: true, passwordHash: true, emailVerified: true },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

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

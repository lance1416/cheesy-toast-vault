import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      sessionVersion?: number;
      sessionId?: string;
    };
  }

  interface User {
    emailVerified?: boolean;
    totpEnabled?: boolean;
    sessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    emailVerified?: boolean;
    sessionVersion?: number;
    sessionId?: string;
  }
}

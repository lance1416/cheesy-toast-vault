import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // Redirect fully authenticated (verified) users away from auth pages
    const authPages = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ];
    const isVerified = !!req.nextauth.token?.emailVerified;
    if (req.nextauth.token && isVerified && authPages.includes(pathname)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      // Allow unauthenticated access to /login and /register; require auth everywhere else
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const publicPaths = [
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
        ];
        if (publicPaths.includes(pathname)) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)"],
};

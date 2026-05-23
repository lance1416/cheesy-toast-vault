import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // Redirect fully authenticated (verified) users away from auth pages and landing page
    const authPages = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ];
    const isVerified = !!req.nextauth.token?.emailVerified;
    if (req.nextauth.token && isVerified && (authPages.includes(pathname) || pathname === "/")) {
      return NextResponse.redirect(new URL("/vaults", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      // Allow unauthenticated access to the landing page and auth pages
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const publicPaths = [
          "/",
          "/login",
          "/login/totp",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
        ];
        if (publicPaths.includes(pathname)) return true;
        // Share pages and their API endpoint are public
        if (pathname.startsWith("/share/") || pathname.startsWith("/api/share/")) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|icon|apple-icon|opengraph-image|manifest\\.webmanifest).*)",
  ],
};

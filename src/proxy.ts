import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // Redirect authenticated users away from auth pages
    if (req.nextauth.token && (pathname === "/login" || pathname === "/register")) {
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
        if (pathname === "/login" || pathname === "/register") return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)"],
};

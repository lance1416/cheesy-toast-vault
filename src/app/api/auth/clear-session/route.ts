// Called when verifySession() detects a valid JWT for a user that no longer exists in the DB
// (e.g. after a DB reset). We can't delete cookies from a Server Component, and
// next-auth's GET /api/auth/signout returns an HTML confirmation form rather than
// signing out directly — so this thin route handler clears the session cookie and
// redirects to /login. The api/auth/** prefix keeps it outside the middleware matcher.
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete("next-auth.session-token");
  res.cookies.delete("__Secure-next-auth.session-token");
  return res;
}

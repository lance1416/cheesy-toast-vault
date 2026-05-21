import { NextResponse } from "next/server";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import logger from "@/server/logger";

// 5 attempts per 10 minutes per IP — login and reset-password endpoints
export const authLimiter = new RateLimiterMemory({ points: 5, duration: 600 });

// 3 attempts per hour per IP — register and forgot-password endpoints
export const registrationLimiter = new RateLimiterMemory({ points: 3, duration: 3600 });

// Set BYPASS_RATE_LIMIT=1 in E2E test environments to prevent the in-memory
// bucket from accumulating across runs on a reused dev server.
const bypass = process.env.BYPASS_RATE_LIMIT === "1";

// Returns a 429 NextResponse if the limiter rejects the request, otherwise null.
// Use as: `const limited = await enforceRateLimit(limiter, req); if (limited) return limited;`
export async function enforceRateLimit(
  limiter: RateLimiterMemory,
  req: Request,
): Promise<NextResponse | null> {
  if (bypass) return null;
  try {
    await limiter.consume(getIp(req));
    return null;
  } catch {
    const ip = getIp(req);
    logger.warn({ ip, url: req.url }, "rate limit exceeded");
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }
}

// For Next.js route handler Request objects
export function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// For next-auth authorize(credentials, req) — headers are a plain Record
export function getIpFromRecord(
  headers: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!headers) return "unknown";
  const fwd = headers["x-forwarded-for"];
  const real = headers["x-real-ip"];
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd;
  const realStr = Array.isArray(real) ? real[0] : real;
  return fwdStr?.split(",")[0].trim() ?? realStr ?? "unknown";
}

export { RateLimiterRes };

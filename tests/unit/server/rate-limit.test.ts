import { describe, it, expect } from "vitest";
import { getIpFromRecord } from "@/server/rate-limit";

// getIpFromRecord is used inside next-auth's authorize() callback where the
// headers come as a plain Record rather than a Request object.  Bugs here
// silently disable per-IP rate limiting (everything bucketed under "unknown").

describe("getIpFromRecord", () => {
  it("returns 'unknown' when headers are undefined", () => {
    expect(getIpFromRecord(undefined)).toBe("unknown");
  });

  it("returns 'unknown' when neither forwarded-for nor real-ip is present", () => {
    expect(getIpFromRecord({ "user-agent": "test" })).toBe("unknown");
  });

  it("extracts the client IP from a single x-forwarded-for value", () => {
    expect(getIpFromRecord({ "x-forwarded-for": "1.2.3.4" })).toBe("1.2.3.4");
  });

  it("takes the first IP from a comma-separated x-forwarded-for chain", () => {
    // Proxies append their own address; the original client is first.
    expect(getIpFromRecord({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2" })).toBe("1.2.3.4");
  });

  it("trims whitespace from the extracted IP", () => {
    expect(getIpFromRecord({ "x-forwarded-for": "  1.2.3.4  " })).toBe("1.2.3.4");
  });

  it("handles x-forwarded-for as a string array (next-auth passes headers as Record<string, string | string[]>)", () => {
    expect(getIpFromRecord({ "x-forwarded-for": ["1.2.3.4", "10.0.0.1"] })).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(getIpFromRecord({ "x-real-ip": "5.6.7.8" })).toBe("5.6.7.8");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(getIpFromRecord({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" })).toBe(
      "1.2.3.4",
    );
  });
});

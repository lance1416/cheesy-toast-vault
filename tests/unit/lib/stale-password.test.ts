import { describe, it, expect } from "vitest";
import { passwordAgeDays, isStalePassword, STALE_DAYS } from "@/lib/stale-password";

const DAY_MS = 86_400_000;
const NOW = new Date("2026-05-19T12:00:00.000Z").getTime();

describe("passwordAgeDays", () => {
  it("returns null for null input", () => {
    expect(passwordAgeDays(null, NOW)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(passwordAgeDays(undefined, NOW)).toBeNull();
  });

  it("returns 0 for today", () => {
    expect(passwordAgeDays(new Date(NOW).toISOString(), NOW)).toBe(0);
  });

  it("returns 1 for yesterday", () => {
    const yesterday = new Date(NOW - DAY_MS).toISOString();
    expect(passwordAgeDays(yesterday, NOW)).toBe(1);
  });

  it("returns correct days for an old date", () => {
    const old = new Date(NOW - 100 * DAY_MS).toISOString();
    expect(passwordAgeDays(old, NOW)).toBe(100);
  });

  it("uses Math.floor — 23h 59m is still 0 days", () => {
    const almostOneDay = new Date(NOW - DAY_MS + 1000).toISOString();
    expect(passwordAgeDays(almostOneDay, NOW)).toBe(0);
  });
});

describe("isStalePassword", () => {
  it("returns false for null", () => {
    expect(isStalePassword(null, NOW)).toBe(false);
  });

  it(`returns false when password is ${STALE_DAYS - 1} days old`, () => {
    const recent = new Date(NOW - (STALE_DAYS - 1) * DAY_MS).toISOString();
    expect(isStalePassword(recent, NOW)).toBe(false);
  });

  it(`returns true at exactly ${STALE_DAYS} days (>= boundary)`, () => {
    const threshold = new Date(NOW - STALE_DAYS * DAY_MS).toISOString();
    expect(isStalePassword(threshold, NOW)).toBe(true);
  });
});

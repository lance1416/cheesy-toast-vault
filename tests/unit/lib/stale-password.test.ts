import { describe, it, expect } from "vitest";
import {
  passwordAgeDays,
  isStalePassword,
  compareByPasswordAge,
  STALE_DAYS,
} from "@/lib/stale-password";

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

describe("compareByPasswordAge", () => {
  const old = "2024-01-01T00:00:00.000Z";
  const mid = "2025-01-01T00:00:00.000Z";
  const recent = "2026-01-01T00:00:00.000Z";

  it("both null → equal (asc)", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: null }, { passwordChangedAt: null }, "asc"),
    ).toBe(0);
  });

  it("both null → equal (desc)", () => {
    expect(
      compareByPasswordAge(
        { passwordChangedAt: undefined },
        { passwordChangedAt: undefined },
        "desc",
      ),
    ).toBe(0);
  });

  it("null a sorts after non-null b (asc)", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: null }, { passwordChangedAt: recent }, "asc"),
    ).toBeGreaterThan(0);
  });

  it("null a sorts after non-null b (desc)", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: null }, { passwordChangedAt: recent }, "desc"),
    ).toBeGreaterThan(0);
  });

  it("null b sorts before non-null a — i.e. a comes first (asc)", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: old }, { passwordChangedAt: null }, "asc"),
    ).toBeLessThan(0);
  });

  it("null b sorts before non-null a — i.e. a comes first (desc)", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: recent }, { passwordChangedAt: null }, "desc"),
    ).toBeLessThan(0);
  });

  it("asc: older date sorts before newer date", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: old }, { passwordChangedAt: recent }, "asc"),
    ).toBeLessThan(0);
  });

  it("asc: newer date sorts after older date", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: recent }, { passwordChangedAt: old }, "asc"),
    ).toBeGreaterThan(0);
  });

  it("desc: newer date sorts before older date", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: recent }, { passwordChangedAt: old }, "desc"),
    ).toBeLessThan(0);
  });

  it("desc: older date sorts after newer date", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: old }, { passwordChangedAt: recent }, "desc"),
    ).toBeGreaterThan(0);
  });

  it("equal dates → 0 in either direction", () => {
    expect(
      compareByPasswordAge({ passwordChangedAt: mid }, { passwordChangedAt: mid }, "asc"),
    ).toBe(0);
    expect(
      compareByPasswordAge({ passwordChangedAt: mid }, { passwordChangedAt: mid }, "desc"),
    ).toBe(0);
  });

  it("full array sort asc: oldest first, nulls last", () => {
    const entries = [
      { passwordChangedAt: recent },
      { passwordChangedAt: null },
      { passwordChangedAt: old },
      { passwordChangedAt: mid },
    ];
    const sorted = [...entries].sort((a, b) => compareByPasswordAge(a, b, "asc"));
    expect(sorted.map((e) => e.passwordChangedAt)).toEqual([old, mid, recent, null]);
  });

  it("full array sort desc: newest first, nulls last", () => {
    const entries = [
      { passwordChangedAt: old },
      { passwordChangedAt: null },
      { passwordChangedAt: recent },
      { passwordChangedAt: mid },
    ];
    const sorted = [...entries].sort((a, b) => compareByPasswordAge(a, b, "desc"));
    expect(sorted.map((e) => e.passwordChangedAt)).toEqual([recent, mid, old, null]);
  });
});

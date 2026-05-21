export const STALE_DAYS = 90;

/**
 * Comparator for sorting entries by passwordChangedAt.
 * Entries without a date always sort last regardless of direction.
 */
export function compareByPasswordAge(
  a: { passwordChangedAt?: string | null },
  b: { passwordChangedAt?: string | null },
  direction: "asc" | "desc",
): number {
  if (!a.passwordChangedAt && !b.passwordChangedAt) return 0;
  if (!a.passwordChangedAt) return 1;
  if (!b.passwordChangedAt) return -1;
  if (a.passwordChangedAt === b.passwordChangedAt) return 0;
  const before = a.passwordChangedAt < b.passwordChangedAt;
  return direction === "asc" ? (before ? -1 : 1) : before ? 1 : -1;
}

export function passwordAgeDays(
  passwordChangedAt: string | null | undefined,
  nowMs = Date.now(),
): number | null {
  if (!passwordChangedAt) return null;
  return Math.floor((nowMs - new Date(passwordChangedAt).getTime()) / 86_400_000);
}

export function isStalePassword(
  passwordChangedAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  const days = passwordAgeDays(passwordChangedAt, nowMs);
  return days !== null && days >= STALE_DAYS;
}

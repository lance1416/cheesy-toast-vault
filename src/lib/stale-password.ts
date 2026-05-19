export const STALE_DAYS = 90;

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

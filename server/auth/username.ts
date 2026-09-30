import { USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN } from "@/lib/limits";

/** Trims whitespace and keeps the casing; null when the username breaks the rules. */
export const normalizeUsername = (raw: string): string | null => {
  const t = raw.trim();
  if (t.length < USERNAME_MIN || t.length > USERNAME_MAX) return null;
  if (!USERNAME_PATTERN.test(t)) return null;
  return t;
};

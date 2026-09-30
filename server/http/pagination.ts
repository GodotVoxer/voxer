/** Bounds a requested page size to `1..max`, using `fallback` when none was asked for. */
export const clampPageLimit = (
  requested: number | null | undefined,
  { max, fallback }: { max: number; fallback: number },
): number => Math.min(Math.max(Math.trunc(requested ?? fallback), 1), max);

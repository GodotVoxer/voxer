import { DURATION_UNIT_MS, type DurationUnit } from "@/lib/time";

/** `null` means a permanent ban (non-positive `value`). */
export const computeBanEndsAt = (start: Date, unit: DurationUnit, value: number): Date | null => {
  if (value <= 0) return null;
  return new Date(start.getTime() + value * DURATION_UNIT_MS[unit]);
};

export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export type DurationUnit = "MINUTES" | "HOURS" | "DAYS";

export const DURATION_UNIT_MS: Record<DurationUnit, number> = {
  MINUTES: MINUTE_MS,
  HOURS: HOUR_MS,
  DAYS: DAY_MS,
};

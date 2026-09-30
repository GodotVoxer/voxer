import type { DurationUnit } from "@/lib/time";

/** "1 minuto", "2 minutos". */
export const countNoun = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

const DURATION_UNIT_NOUNS: Record<DurationUnit, readonly [string, string]> = {
  MINUTES: ["minuto", "minutos"],
  HOURS: ["hora", "horas"],
  DAYS: ["día", "días"],
};

export const countDuration = (n: number, unit: DurationUnit): string =>
  countNoun(n, ...DURATION_UNIT_NOUNS[unit]);

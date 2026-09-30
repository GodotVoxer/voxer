import { countDuration } from "@/lib/format/plural";
import { DURATION_UNIT_MS, type DurationUnit } from "@/lib/time";

/** Payload key used by bulk-delete actions recorded before it was renamed to `banContentLabel`. */
export const LEGACY_BAN_CONTENT_LABEL_KEY = "purgeLabel";

/** Roughly one year in each unit. */
const BAN_CONTENT_WINDOW_MAX: Record<DurationUnit, number> = {
  MINUTES: 525_600,
  HOURS: 8_760,
  DAYS: 366,
};

export const banContentWindowDurationMs = (amount: number, unit: DurationUnit): number =>
  amount * DURATION_UNIT_MS[unit];

export const banContentWindowMaxAmountForUnit = (unit: DurationUnit): number =>
  BAN_CONTENT_WINDOW_MAX[unit];

export const banContentWindowLabelEs = (
  forever: boolean,
  amount?: number,
  unit?: DurationUnit,
): string => {
  if (forever) return "Todo el historial";
  if (amount == null || unit == null) return "Ventana personalizada";
  return `Últimos ${countDuration(amount, unit)}`;
};

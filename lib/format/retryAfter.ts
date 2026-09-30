import { countNoun } from "@/lib/format/plural";
import { MINUTE_MS, SECOND_MS } from "@/lib/time";

/** "2 minutos" / "15 segundos", to follow "Probá de nuevo en …". */
export const formatRetryAfterDurationEs = (remainingMs: number): string => {
  const totalSec = Math.max(1, Math.ceil(Math.max(1, remainingMs) / SECOND_MS));
  if (totalSec * SECOND_MS >= MINUTE_MS) {
    return countNoun(Math.ceil((totalSec * SECOND_MS) / MINUTE_MS), "minuto", "minutos");
  }
  return countNoun(totalSec, "segundo", "segundos");
};

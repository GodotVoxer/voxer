/** Every date shown in the UI goes through this locale; "es-AR" renders 12-hour times without a marker. */
export const DISPLAY_LOCALE = "es";

/** "27/09/2026, 10:16:30" */
export const formatExactDateTimeEs = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
};

/** "29/9/2026, 18:24:18" */
export const formatDateTimeEs = (value: string | Date): string =>
  new Date(value).toLocaleString(DISPLAY_LOCALE);

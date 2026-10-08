/**
 * Seasonal theme: painted over the user's preference while its window lasts, without replacing it, so
 * the previous theme comes back on its own when it ends. Turning it off is remembered per device.
 */
export const SEASONAL_THEME_ID = "halloween-2026";
/** Value of `data-seasonal-theme` on `<html>`; the CSS tokens and decorations hang from it. */
export const SEASONAL_THEME_NAME = "halloween";
/** Argentina time: available from October 1st until November 1st inclusive. */
export const SEASONAL_THEME_STARTS_AT = Date.parse("2026-10-01T00:00:00-03:00");
export const SEASONAL_THEME_ENDS_AT = Date.parse("2026-11-02T00:00:00-03:00");
export const SEASONAL_THEME_STORAGE_KEY = "voxer.theme.seasonal.v1";
/** `surface` of the seasonal theme: browser bar and Android window. */
export const SEASONAL_THEME_SURFACE = "#0c0812";

export const isSeasonalThemeAvailable = (now: number): boolean =>
  now >= SEASONAL_THEME_STARTS_AT && now < SEASONAL_THEME_ENDS_AT;

/** Only an explicit `false` for this season turns it off; a choice from another season does not count. */
export const isSeasonalThemeOptedOut = (raw: string | null): boolean => {
  if (!raw) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as { id?: unknown }).id === SEASONAL_THEME_ID &&
      (parsed as { enabled?: unknown }).enabled === false
    );
  } catch {
    return false;
  }
};

export const serializeSeasonalThemeChoice = (enabled: boolean): string =>
  JSON.stringify({ id: SEASONAL_THEME_ID, enabled });

export const readSeasonalThemeActive = (now: number): boolean => {
  if (!isSeasonalThemeAvailable(now)) return false;
  try {
    return !isSeasonalThemeOptedOut(window.localStorage.getItem(SEASONAL_THEME_STORAGE_KEY));
  } catch {
    return true;
  }
};

export const writeSeasonalThemeChoice = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(SEASONAL_THEME_STORAGE_KEY, serializeSeasonalThemeChoice(enabled));
  } catch {
    /* storage blocked: the choice lasts as long as the tab */
  }
};

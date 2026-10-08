import { describe, expect, it } from "vitest";
import {
  isSeasonalThemeAvailable,
  isSeasonalThemeOptedOut,
  SEASONAL_THEME_ENDS_AT,
  SEASONAL_THEME_STARTS_AT,
  serializeSeasonalThemeChoice,
} from "./seasonalTheme";

describe("seasonal theme window", () => {
  it("lasts until November 1st inclusive, Argentina time", () => {
    expect(isSeasonalThemeAvailable(Date.parse("2026-11-01T23:59:59-03:00"))).toBe(true);
    expect(isSeasonalThemeAvailable(Date.parse("2026-11-02T00:00:00-03:00"))).toBe(false);
    expect(SEASONAL_THEME_ENDS_AT).toBe(Date.parse("2026-11-02T03:00:00Z"));
  });

  it("is not available before it starts", () => {
    expect(isSeasonalThemeAvailable(SEASONAL_THEME_STARTS_AT - 1)).toBe(false);
    expect(isSeasonalThemeAvailable(SEASONAL_THEME_STARTS_AT)).toBe(true);
  });
});

describe("isSeasonalThemeOptedOut", () => {
  it("only an explicit off for this season counts", () => {
    expect(isSeasonalThemeOptedOut(serializeSeasonalThemeChoice(false))).toBe(true);
    expect(isSeasonalThemeOptedOut(serializeSeasonalThemeChoice(true))).toBe(false);
    expect(isSeasonalThemeOptedOut('{"id":"halloween-2025","enabled":false}')).toBe(false);
    expect(isSeasonalThemeOptedOut(null)).toBe(false);
    expect(isSeasonalThemeOptedOut("{")).toBe(false);
    expect(isSeasonalThemeOptedOut("null")).toBe(false);
  });
});

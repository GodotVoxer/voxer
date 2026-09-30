import { describe, expect, it } from "vitest";
import { formatRelativeTimeShortEs } from "./relativeTime";

describe("formatRelativeTimeShortEs", () => {
  const now = new Date("2026-01-15T12:00:00.000Z").getTime();

  it("returns ahora for under 60s", () => {
    expect(formatRelativeTimeShortEs("2026-01-15T11:59:30.000Z", now)).toBe("ahora");
  });

  it("returns minutes below 1h", () => {
    expect(formatRelativeTimeShortEs("2026-01-15T11:30:00.000Z", now)).toBe("30 min");
  });

  it("returns hours below 24h", () => {
    expect(formatRelativeTimeShortEs("2026-01-15T08:00:00.000Z", now)).toBe("4 h");
  });

  it("returns days from 24h", () => {
    expect(formatRelativeTimeShortEs("2026-01-13T12:00:00.000Z", now)).toBe("2 d");
  });
});

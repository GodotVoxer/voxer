import { describe, expect, it } from "vitest";
import { formatRetryAfterDurationEs } from "./retryAfter";

describe("formatRetryAfterDurationEs", () => {
  it("rounds up to seconds under a minute", () => {
    expect(formatRetryAfterDurationEs(1500)).toBe("2 segundos");
    expect(formatRetryAfterDurationEs(1000)).toBe("1 segundo");
    expect(formatRetryAfterDurationEs(15_000)).toBe("15 segundos");
  });

  it("uses minutes when appropriate", () => {
    expect(formatRetryAfterDurationEs(60_000)).toBe("1 minuto");
    expect(formatRetryAfterDurationEs(120_000)).toBe("2 minutos");
    expect(formatRetryAfterDurationEs(90_000)).toBe("2 minutos");
  });

  it("treats non-positive durations as at least one second", () => {
    expect(formatRetryAfterDurationEs(0)).toBe("1 segundo");
    expect(formatRetryAfterDurationEs(-100)).toBe("1 segundo");
  });
});

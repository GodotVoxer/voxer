import { describe, expect, it } from "vitest";
import { formatExactDateTimeEs } from "./dates";

describe("formatExactDateTimeEs", () => {
  it("formats an ISO date with full digits", () => {
    const iso = "2026-05-15T14:30:25.000Z";
    const res = formatExactDateTimeEs(iso);
    expect(res).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(res).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("returns the input when the date is invalid", () => {
    expect(formatExactDateTimeEs("invalido")).toBe("invalido");
  });
});

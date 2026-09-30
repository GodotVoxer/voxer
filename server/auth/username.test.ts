import { describe, expect, it } from "vitest";
import { normalizeUsername } from "./username";

describe("normalizeUsername", () => {
  it("trims and keeps the casing", () => {
    expect(normalizeUsername("  Ranma  ")).toBe("Ranma");
  });
  it("rejects lengths out of range", () => {
    expect(normalizeUsername("ab")).toBeNull();
  });
  it("rejects disallowed characters", () => {
    expect(normalizeUsername("bad-name")).toBeNull();
  });
});

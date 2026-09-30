import { describe, expect, it } from "vitest";
import { canModerateTarget, canUndoModerationAction } from "./roleGuards";

describe("canModerateTarget", () => {
  it("a MOD can act on USER and MOD", () => {
    expect(canModerateTarget("MOD", "USER")).toBe(true);
    expect(canModerateTarget("MOD", "MOD")).toBe(true);
  });

  it("a MOD cannot act on ADMIN", () => {
    expect(canModerateTarget("MOD", "ADMIN")).toBe(false);
  });

  it("an ADMIN can act on other roles and only on their own ADMIN content", () => {
    expect(canModerateTarget("ADMIN", "USER")).toBe(true);
    expect(canModerateTarget("ADMIN", "MOD")).toBe(true);
    expect(canModerateTarget("ADMIN", "ADMIN")).toBe(false);
    expect(canModerateTarget("ADMIN", "ADMIN", true)).toBe(true);
  });

  it("staff can moderate content without a linked author", () => {
    expect(canModerateTarget("MOD", null)).toBe(true);
  });

  it("a USER never moderates", () => {
    expect(canModerateTarget("USER", "USER")).toBe(false);
    expect(canModerateTarget("USER", null)).toBe(false);
  });
});

describe("canUndoModerationAction", () => {
  it("a MOD cannot undo an ADMIN's action", () => {
    expect(canUndoModerationAction("MOD", "ADMIN")).toBe(false);
  });

  it("a MOD can undo another MOD's action", () => {
    expect(canUndoModerationAction("MOD", "MOD")).toBe(true);
  });

  it("an ADMIN can only undo their own ADMIN actions", () => {
    expect(canUndoModerationAction("ADMIN", "ADMIN")).toBe(false);
    expect(canUndoModerationAction("ADMIN", "ADMIN", true)).toBe(true);
    expect(canUndoModerationAction("ADMIN", "MOD")).toBe(true);
  });
});

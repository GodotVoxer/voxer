import { describe, expect, it } from "vitest";
import { INTERNAL_EMIT_EVENTS, isAllowedInternalEmitRoom, isValidEntityId } from "./rooms";

describe("isValidEntityId", () => {
  it("accepts a cuid and rejects garbage or absurd sizes", () => {
    expect(isValidEntityId("clx1a2b3c4d5e6f7g8h9i0jkl")).toBe(true);
    expect(isValidEntityId("x")).toBe(false);
    expect(isValidEntityId("a".repeat(65))).toBe(false);
    expect(isValidEntityId("../../etc")).toBe(false);
    expect(isValidEntityId(42)).toBe(false);
  });
});

describe("isAllowedInternalEmitRoom", () => {
  it("allows only vox:<id>, user:<id>, feed:home and presence:global", () => {
    expect(isAllowedInternalEmitRoom("feed:home")).toBe(true);
    expect(isAllowedInternalEmitRoom("presence:global")).toBe(true);
    expect(isAllowedInternalEmitRoom("vox:clx1a2b3c4d5e6f7g8h9i0jkl")).toBe(true);
    expect(isAllowedInternalEmitRoom("user:clx1a2b3c4d5e6f7g8h9i0jkl")).toBe(true);
    expect(isAllowedInternalEmitRoom("admin:clx1a2b3c4d5e6f7g8h9i0jkl")).toBe(false);
    expect(isAllowedInternalEmitRoom("vox:")).toBe(false);
    expect(isAllowedInternalEmitRoom(undefined)).toBe(false);
  });

  it("includes every event the server broadcasts", () => {
    for (const ev of [
      "vox:activity",
      "vox:created",
      "vox:bulk-deleted",
      "comment:created",
      "user:theme-updated",
      "presence:update",
    ]) {
      expect(INTERNAL_EMIT_EVENTS.has(ev)).toBe(true);
    }
  });
});

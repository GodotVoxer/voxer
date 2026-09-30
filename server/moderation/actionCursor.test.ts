import { describe, expect, it } from "vitest";
import { decodeModerationActionCursor, encodeModerationActionCursor } from "./actionCursor";

describe("moderation-action-cursor", () => {
  it("roundtrips", () => {
    const c = { createdAtMs: 1_700_000_000_000, id: "abc123" };
    const enc = encodeModerationActionCursor(c);
    expect(decodeModerationActionCursor(enc)).toEqual(c);
  });
  it("returns null on garbage", () => {
    expect(decodeModerationActionCursor("not-base64!!!")).toBeNull();
  });
});

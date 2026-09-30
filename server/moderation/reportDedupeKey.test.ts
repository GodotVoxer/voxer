import { describe, expect, it } from "vitest";
import { buildReportDedupeKey } from "./reportDedupeKey";

describe("buildReportDedupeKey", () => {
  it("uses voxId when there is no comment", () => {
    expect(buildReportDedupeKey({ voxId: "abc123" })).toBe("v:abc123");
    expect(buildReportDedupeKey({ voxId: "abc123", commentId: null })).toBe("v:abc123");
    expect(buildReportDedupeKey({ voxId: "abc123", commentId: undefined })).toBe("v:abc123");
  });

  it("uses commentId when a comment is reported", () => {
    expect(buildReportDedupeKey({ voxId: "abc123", commentId: "cmt1" })).toBe("c:cmt1");
  });
});

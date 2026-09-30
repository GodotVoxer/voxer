import { describe, expect, it } from "vitest";
import type { CommentPublic } from "@/lib/vox/types";
import { shouldShowRefHoverPreview } from "@/features/comments/bodyRefHover";

const sample = { id: "1", publicTag: "ABCD1234" } as CommentPublic;

describe("shouldShowRefHoverPreview", () => {
  it("true only with a resolved comment, no plain text and hover", () => {
    expect(shouldShowRefHoverPreview(sample, false, true)).toBe(true);
  });
  it("false without a comment", () => {
    expect(shouldShowRefHoverPreview(undefined, false, true)).toBe(false);
  });
  it("false in nested preview mode (plain text)", () => {
    expect(shouldShowRefHoverPreview(sample, true, true)).toBe(false);
  });
  it("false without hover, even in landscape", () => {
    expect(shouldShowRefHoverPreview(sample, false, false)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { CommentPublic } from "@/lib/vox/types";
import { estimateCommentRowHeight } from "./threadEstimate";

const base = (over: Partial<CommentPublic>): CommentPublic => ({
  id: "1",
  publicTag: "ABCDEFGH",
  body: "hola",
  displayName: "x",
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  avatarVariant: "GREEN",
  isOp: false,
  isMine: false,
  createdAt: new Date().toISOString(),
  ...over,
});

describe("estimateCommentRowHeight", () => {
  it("raises the estimate with an attachment", () => {
    const plain = estimateCommentRowHeight(base({}));
    const withImg = estimateCommentRowHeight(base({ imageUrl: "https://example.com/x.jpg" }));
    expect(withImg).toBeGreaterThan(plain);
  });

  it("returns a sensible minimum without a comment", () => {
    expect(estimateCommentRowHeight(undefined)).toBeGreaterThanOrEqual(120);
  });
});

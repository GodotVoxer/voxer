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
    expect(estimateCommentRowHeight(undefined)).toBeGreaterThanOrEqual(70);
  });

  it("matches a plain text row: header plus one line of body each", () => {
    expect(estimateCommentRowHeight(base({ body: "hola" }))).toBe(70);
    expect(estimateCommentRowHeight(base({ body: "uno\ndos\ntres" }))).toBe(110);
  });

  it("adds the quotes bar and the replies button only to quoted comments", () => {
    const plain = estimateCommentRowHeight(base({}));
    expect(estimateCommentRowHeight(base({}), true)).toBe(plain + 60);
  });
});

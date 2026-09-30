import { describe, expect, it } from "vitest";
import { decodeCommentCursor, encodeCommentCursor, type CommentCursor } from "./cursorPagination";
describe("comment cursor", () => {
  it("round-trips encode and decode", () => {
    const c: CommentCursor = { createdAtMs: 1700000000000, id: "cm123abc" };
    expect(decodeCommentCursor(encodeCommentCursor(c))).toEqual(c);
  });
  it("returns null for an invalid cursor", () => {
    expect(decodeCommentCursor("not-base64!!!")).toBeNull();
  });
  it("returns null when the id is missing", () => {
    const raw = Buffer.from(JSON.stringify({ createdAtMs: 1 }), "utf8").toString("base64url");
    expect(decodeCommentCursor(raw)).toBeNull();
  });
});

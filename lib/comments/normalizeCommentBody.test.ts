import { describe, expect, it } from "vitest";
import { commentBodyLineCount, normalizeCommentBody } from "@/lib/comments/normalizeCommentBody";

describe("normalizeCommentBody", () => {
  it("collapses a run of blank lines to a single one", () => {
    expect(normalizeCommentBody("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims blank lines at the edges", () => {
    expect(normalizeCommentBody("\n\n\nhola\n\n\n")).toBe("hola");
  });

  it("unifies CRLF and lone CR", () => {
    expect(normalizeCommentBody("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("drops trailing spaces and tabs per line", () => {
    expect(normalizeCommentBody("a   \nb\t\t")).toBe("a\nb");
  });

  it("keeps a single blank line between paragraphs", () => {
    expect(normalizeCommentBody("uno\n\ndos")).toBe("uno\n\ndos");
  });

  it("leaves greentext and reply tags untouched", () => {
    expect(normalizeCommentBody(">implicando\n>>ABCD1234")).toBe(">implicando\n>>ABCD1234");
  });

  it("returns an empty string for blank-only input", () => {
    expect(normalizeCommentBody("\n\n   \n\t\n")).toBe("");
  });

  it("is idempotent", () => {
    const once = normalizeCommentBody("a\n\n\nb\n\n\n\nc");
    expect(normalizeCommentBody(once)).toBe(once);
  });
});

describe("commentBodyLineCount", () => {
  it("counts a single line", () => {
    expect(commentBodyLineCount("hola")).toBe(1);
  });

  it("counts blank lines only once after collapsing", () => {
    expect(commentBodyLineCount("a\n\n\n\nb")).toBe(3);
  });

  it("counts a wall of single-character lines in full", () => {
    const wall = Array.from({ length: 500 }, () => ".").join("\n");
    expect(commentBodyLineCount(wall)).toBe(500);
  });

  it("is zero for empty or blank-only input", () => {
    expect(commentBodyLineCount("")).toBe(0);
    expect(commentBodyLineCount("\n\n\n")).toBe(0);
  });
});

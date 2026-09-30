import { describe, expect, it } from "vitest";
import {
  normalizeCommentPublicTagFragment,
  parseCommentPublicTagFromLocationHash,
} from "./publicTagFromHash";

describe("normalizeCommentPublicTagFragment", () => {
  it("accepts 8 alphanumerics and returns uppercase", () => {
    expect(normalizeCommentPublicTagFragment("abcd1234")).toBe("ABCD1234");
    expect(normalizeCommentPublicTagFragment("ABCD1234")).toBe("ABCD1234");
  });
  it("rejects other lengths or characters", () => {
    expect(normalizeCommentPublicTagFragment("ABCD123")).toBeNull();
    expect(normalizeCommentPublicTagFragment("ABCD12345")).toBeNull();
    expect(normalizeCommentPublicTagFragment("ABCD-234")).toBeNull();
    expect(normalizeCommentPublicTagFragment("")).toBeNull();
  });
});

describe("parseCommentPublicTagFromLocationHash", () => {
  it("reads the fragment with or without a leading #", () => {
    expect(parseCommentPublicTagFromLocationHash("#ABCD1234")).toBe("ABCD1234");
    expect(parseCommentPublicTagFromLocationHash("ABCD1234")).toBe("ABCD1234");
  });
  it("decodes percent escapes", () => {
    expect(parseCommentPublicTagFromLocationHash("#%41%42%43%44%31%32%33%34")).toBe("ABCD1234");
  });
});

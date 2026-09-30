import { describe, expect, it } from "vitest";
import { sanitizePlainText } from "./plainText";
describe("sanitizePlainText", () => {
  it("truncates to maxLen", () => {
    expect(sanitizePlainText("abcdef", 3)).toBe("abc");
  });
  it("keeps < and > (plain text; React escapes on render)", () => {
    expect(sanitizePlainText(">>ABCD1234 3 < 5 y te quiero <3", 200)).toBe(
      ">>ABCD1234 3 < 5 y te quiero <3",
    );
  });
  it("removes null bytes", () => {
    expect(sanitizePlainText("a\0b", 10)).toBe("ab");
  });
  it("normalizes line breaks and trims", () => {
    expect(sanitizePlainText("  a\r\nb  ", 50)).toBe("a\nb");
  });
});

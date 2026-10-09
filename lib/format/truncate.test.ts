import { describe, expect, it } from "vitest";
import { truncateSingleLine, truncateWithEllipsis } from "./truncate";

describe("truncateWithEllipsis", () => {
  it("keeps short text and line breaks untouched", () => {
    expect(truncateWithEllipsis("hola\nmundo", 20)).toBe("hola\nmundo");
  });

  it("respects the maximum, ellipsis included", () => {
    expect(truncateWithEllipsis("abcdefghijklmnop", 10)).toBe("abcdefghi…");
  });

  it("never splits an emoji", () => {
    expect(truncateWithEllipsis("ab😀cdef", 4)).toBe("ab…");
    expect(truncateWithEllipsis("ab😀cdef", 5)).toBe("ab😀…");
  });
});

describe("truncateSingleLine", () => {
  it("collapses whitespace and respects the maximum with an ellipsis", () => {
    expect(truncateSingleLine("  hola   mundo  ", 20)).toBe("hola mundo");
    expect(truncateSingleLine("hola\n\nmundo", 20)).toBe("hola mundo");
    expect(truncateSingleLine("abcdefghijklmnop", 10)).toBe("abcdefghi…");
  });
});

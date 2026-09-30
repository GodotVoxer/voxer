import { describe, expect, it } from "vitest";
import { truncateOgDescription } from "./truncate";

describe("truncateOgDescription", () => {
  it("collapses whitespace and respects the maximum with an ellipsis", () => {
    expect(truncateOgDescription("  hola   mundo  ", 20)).toBe("hola mundo");
    expect(truncateOgDescription("abcdefghijklmnop", 10)).toBe("abcdefghi…");
  });
});

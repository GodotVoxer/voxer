import { describe, expect, it } from "vitest";
import { isSensitiveVoxCategory } from "@/lib/vox/sensitiveCategories";

describe("isSensitiveVoxCategory", () => {
  it("flags the categories of the nsfw group", () => {
    expect(isSensitiveVoxCategory("Hentai")).toBe(true);
    expect(isSensitiveVoxCategory("Porno")).toBe(true);
  });

  it("does not flag the rest", () => {
    expect(isSensitiveVoxCategory("General")).toBe(false);
    expect(isSensitiveVoxCategory("Humor")).toBe(false);
  });

  it("accepts the short code as well as the name", () => {
    expect(isSensitiveVoxCategory("POR")).toBe(true);
    expect(isSensitiveVoxCategory("HEN")).toBe(true);
    expect(isSensitiveVoxCategory("")).toBe(false);
  });
});

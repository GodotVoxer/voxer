import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOX_CATEGORY,
  VOX_CATEGORIES_ALL,
  VOX_CATEGORIES_ALPHABETICAL,
} from "./categories";
describe("DEFAULT_VOX_CATEGORY", () => {
  it("is a valid category", () => {
    expect(VOX_CATEGORIES_ALL).toContain(DEFAULT_VOX_CATEGORY);
    expect(DEFAULT_VOX_CATEGORY).toBe("General");
  });
});
describe("VOX_CATEGORIES_ALL", () => {
  it("has 44 unique, non-empty categories", () => {
    expect(VOX_CATEGORIES_ALL.length).toBe(44);
    expect(new Set(VOX_CATEGORIES_ALL).size).toBe(VOX_CATEGORIES_ALL.length);
    for (const c of VOX_CATEGORIES_ALL) {
      expect(c.length).toBeGreaterThan(0);
    }
    expect(VOX_CATEGORIES_ALL).toContain("Videos");
    expect(VOX_CATEGORIES_ALL).toContain("Avatarfags");
    expect(VOX_CATEGORIES_ALL).toContain("Animales");
  });
});
describe("VOX_CATEGORIES_ALPHABETICAL", () => {
  it("is sorted alphabetically (es)", () => {
    for (let i = 1; i < VOX_CATEGORIES_ALPHABETICAL.length; i++) {
      const prev = VOX_CATEGORIES_ALPHABETICAL[i - 1]!;
      const cur = VOX_CATEGORIES_ALPHABETICAL[i]!;
      expect(cur.localeCompare(prev, "es", { sensitivity: "base" })).toBeGreaterThanOrEqual(0);
    }
  });
  it("has the same entries as ALL", () => {
    expect(new Set(VOX_CATEGORIES_ALPHABETICAL)).toEqual(new Set(VOX_CATEGORIES_ALL));
  });
});

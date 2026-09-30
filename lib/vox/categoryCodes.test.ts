import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORY_CODES,
  CATEGORY_CODE_BY_NAME,
  CATEGORY_GROUPS,
  getCategoryCode,
  getCategoryDisplayName,
  getCategoryFromCode,
} from "./categoryCodes";
import { VOX_CATEGORIES_ALL } from "./categories";
describe("CATEGORY_CODE_BY_NAME", () => {
  it("has a code for every category", () => {
    for (const c of VOX_CATEGORIES_ALL) {
      expect(getCategoryCode(c)).toBeTruthy();
    }
  });
  it("has unique codes", () => {
    const codes = Object.values(CATEGORY_CODE_BY_NAME);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it("round-trips code and name", () => {
    for (const name of VOX_CATEGORIES_ALL) {
      const code = CATEGORY_CODE_BY_NAME[name];
      expect(getCategoryFromCode(code)).toBe(name);
    }
  });
  it("Omniverso3p is O3P", () => {
    expect(CATEGORY_CODE_BY_NAME["Omniverso3p"]).toBe("O3P");
  });
  it("assigns the right codes to the newer categories", () => {
    expect(CATEGORY_CODE_BY_NAME["Videos"]).toBe("VID");
    expect(CATEGORY_CODE_BY_NAME["Avatarfags"]).toBe("AVF");
    expect(CATEGORY_CODE_BY_NAME["Animales"]).toBe("ANI");
  });
});
describe("getCategoryFromCode", () => {
  it("accepts lowercase", () => {
    expect(getCategoryFromCode("gen")).toBe("General");
    expect(getCategoryFromCode("vid")).toBe("Videos");
    expect(getCategoryFromCode("avf")).toBe("Avatarfags");
    expect(getCategoryFromCode("ani")).toBe("Animales");
  });
  it("returns null when missing", () => {
    expect(getCategoryFromCode("ZZZ")).toBeNull();
  });
});
describe("getCategoryDisplayName", () => {
  it("resolves a short code to the name", () => {
    expect(getCategoryDisplayName("anm")).toBe("Anime/Manga");
    expect(getCategoryDisplayName("vid")).toBe("Videos");
    expect(getCategoryDisplayName("avf")).toBe("Avatarfags");
    expect(getCategoryDisplayName("ani")).toBe("Animales");
  });
  it("returns the name when it is already canonical", () => {
    expect(getCategoryDisplayName("Anime/Manga")).toBe("Anime/Manga");
  });
  it("trims whitespace", () => {
    expect(getCategoryDisplayName("  GEN  ")).toBe("General");
  });
});
describe("CATEGORY_GROUPS", () => {
  it("covers every category exactly once", () => {
    const seen = new Set<string>();
    let n = 0;
    for (const g of CATEGORY_GROUPS) {
      for (const c of g.categories) {
        expect(seen.has(c)).toBe(false);
        seen.add(c);
        n++;
      }
    }
    expect(n).toBe(VOX_CATEGORIES_ALL.length);
  });

  it("puts NSFW at the very bottom", () => {
    expect(CATEGORY_GROUPS[CATEGORY_GROUPS.length - 1]?.id).toBe("nsfw");
  });

  it("puts Mujeres, Videos and Animales in Entretenimiento", () => {
    const ent = CATEGORY_GROUPS.find((g) => g.id === "entretenimiento");
    expect(ent?.categories).toContain("Mujeres");
    expect(ent?.categories).toContain("Videos");
    expect(ent?.categories).toContain("Animales");
  });

  it("puts Avatarfags in General y comunidad", () => {
    const gen = CATEGORY_GROUPS.find((g) => g.id === "general");
    expect(gen?.categories).toContain("Avatarfags");
  });
});
describe("ALL_CATEGORY_CODES", () => {
  it("has as many codes as categories", () => {
    expect(ALL_CATEGORY_CODES.length).toBe(VOX_CATEGORIES_ALL.length);
  });
});

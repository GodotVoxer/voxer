import { afterEach, describe, expect, it, vi } from "vitest";
import { isSafeThemeImageUrl } from "./themeAssetUrls";

const KEY = "theme-bg/3f2a1c4e-9b7d-4e21-8a6f-0c1d2e3f4a5b.webp";
const KEY_SM = "theme-bg/3f2a1c4e-9b7d-4e21-8a6f-0c1d2e3f4a5b-sm.webp";

describe("isSafeThemeImageUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts server keys on R2 (with or without a base path) and locally", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://media.voxer.pro/");
    expect(isSafeThemeImageUrl(`https://media.voxer.pro/${KEY}`)).toBe(true);
    expect(isSafeThemeImageUrl(`https://media.voxer.pro/${KEY_SM}`)).toBe(true);
    expect(isSafeThemeImageUrl(`/uploads/${KEY}`)).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://cdn.example.com/bucket");
    expect(isSafeThemeImageUrl(`https://cdn.example.com/bucket/${KEY}`)).toBe(true);
  });

  it.each([
    `https://evil.example/${KEY}`,
    `http://media.voxer.pro/${KEY}`,
    `https://media.voxer.pro/${KEY}?x=1`,
    `https://media.voxer.pro/${KEY}#a`,
    `https://media.voxer.pro/uploads/2026/09/x.webp`,
    `https://media.voxer.pro/theme-bg/not-a-uuid.webp`,
    `https://media.voxer.pro/theme-bg/3f2a1c4e-9b7d-4e21-8a6f-0c1d2e3f4a5b.png`,
    `https://media.voxer.pro/theme-bg/3f2a1c4e-9b7d-4e21-8a6f-0c1d2e3f4a5b.webp") , url("x`,
    `https://media.voxer.pro.evil.example/${KEY}`,
    `/uploads/../${KEY}`,
    `/uploads/theme-bg/../../etc/passwd`,
    `javascript:alert(1)`,
    `data:image/webp;base64,AAAA`,
    "",
    42,
    null,
  ])("rechaza %j", (url) => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://media.voxer.pro");
    expect(isSafeThemeImageUrl(url)).toBe(false);
  });

  it("accepts only local keys without an R2 base", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "");
    expect(isSafeThemeImageUrl(`https://media.voxer.pro/${KEY}`)).toBe(false);
    expect(isSafeThemeImageUrl(`/uploads/${KEY}`)).toBe(true);
  });
});

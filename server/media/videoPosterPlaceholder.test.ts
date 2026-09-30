import { describe, expect, it } from "vitest";
import { VIDEO_POSTER_PLACEHOLDER_URL, isUsableVideoPosterUrl } from "./videoPosterPlaceholder";

describe("isUsableVideoPosterUrl", () => {
  it("accepts a managed upload", () => {
    expect(isUsableVideoPosterUrl("/uploads/2026/09/a.poster.webp")).toBe(true);
  });

  it("accepts the site placeholder the server returns without a frame", () => {
    expect(isUsableVideoPosterUrl(VIDEO_POSTER_PLACEHOLDER_URL)).toBe(true);
  });

  it("rejects external and empty links", () => {
    expect(isUsableVideoPosterUrl("https://evil.example/x.png")).toBe(false);
    expect(isUsableVideoPosterUrl("")).toBe(false);
    expect(isUsableVideoPosterUrl(null)).toBe(false);
  });
});

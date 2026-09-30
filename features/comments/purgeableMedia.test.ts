import { describe, expect, it } from "vitest";
import { commentHasPurgeableMedia } from "@/features/comments/purgeableMedia";

describe("commentHasPurgeableMedia", () => {
  it("without attachment", () => {
    expect(commentHasPurgeableMedia({ imageUrl: null, videoUrl: null })).toBe(false);
  });
  it("image", () => {
    expect(commentHasPurgeableMedia({ imageUrl: "/uploads/2026/09/a.webp", videoUrl: null })).toBe(
      true,
    );
  });
  it("uploaded video", () => {
    expect(commentHasPurgeableMedia({ imageUrl: null, videoUrl: "/uploads/2026/09/a.mp4" })).toBe(
      true,
    );
  });
  it("a YouTube embed does not count", () => {
    expect(
      commentHasPurgeableMedia({
        imageUrl: null,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      }),
    ).toBe(false);
  });
});

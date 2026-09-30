import { describe, expect, it } from "vitest";
import { createVoxSchema } from "./schemas";

const baseVox = {
  title: "T",
  description: "D",
  category: "General" as const,
};

describe("createVoxSchema", () => {
  it("accepts IMAGE with mediaUrl and thumbnailUrl", () => {
    const r = createVoxSchema.safeParse({
      ...baseVox,
      mediaType: "IMAGE",
      mediaUrl: "/uploads/x.jpg",
      thumbnailUrl: "/uploads/x.thumb.webp",
    });
    expect(r.success).toBe(true);
  });
  it("accepts YOUTUBE without mediaUrl (youtubeUrl only)", () => {
    const r = createVoxSchema.safeParse({
      ...baseVox,
      mediaType: "YOUTUBE",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
    expect(r.success).toBe(true);
  });
  it("accepts a vox with title, description and media", () => {
    const r = createVoxSchema.safeParse({
      ...baseVox,
      mediaType: "IMAGE",
      mediaUrl: "/a",
      thumbnailUrl: "/b",
    });
    expect(r.success).toBe(true);
  });
  it("rejects IMAGE without thumbnails", () => {
    const r = createVoxSchema.safeParse({
      ...baseVox,
      mediaType: "IMAGE",
      mediaUrl: "/x",
    });
    expect(r.success).toBe(false);
  });
  it("rejects an invalid category", () => {
    const r = createVoxSchema.safeParse({
      ...baseVox,
      category: "ZZZ",
      mediaType: "IMAGE",
      mediaUrl: "/a",
      thumbnailUrl: "/b",
    });
    expect(r.success).toBe(false);
  });
});

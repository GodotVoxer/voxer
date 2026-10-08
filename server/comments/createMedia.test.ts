import { afterEach, describe, expect, it, vi } from "vitest";
import { commentMediaIsUpload, resolveCommentMediaForCreate } from "./createMedia";

describe("resolveCommentMediaForCreate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes YouTube from youtubeUrl", () => {
    const r = resolveCommentMediaForCreate({
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
    expect(r).toEqual({
      ok: true,
      imageUrl: null,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });

  it("rejects an invalid YouTube link", () => {
    const r = resolveCommentMediaForCreate({ youtubeUrl: "https://example.com" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/inválido/i);
  });

  it("accepts a relative path to an uploaded image", () => {
    const r = resolveCommentMediaForCreate({ imageUrl: "/uploads/2026/05/x.webp" });
    expect(r).toEqual({ ok: true, imageUrl: "/uploads/2026/05/x.webp", videoUrl: null });
  });

  it("rejects an external https image URL", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "");
    const r = resolveCommentMediaForCreate({
      imageUrl: "https://cdn.example.com/p.png",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/subida válida/i);
  });

  it("rejects a data: image", () => {
    const r = resolveCommentMediaForCreate({ imageUrl: "data:image/png;base64,xxx" });
    expect(r.ok).toBe(false);
  });

  it("normalizes a YouTube link pasted as videoUrl", () => {
    const r = resolveCommentMediaForCreate({
      videoUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    });
    expect(r).toEqual({
      ok: true,
      imageUrl: null,
      videoUrl: "https://www.youtube.com/embed/jNQXAC9IVRw",
    });
  });

  it("rejects more than one kind of attachment", () => {
    const r = resolveCommentMediaForCreate({
      imageUrl: "/uploads/2026/05/x.jpg",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
    expect(r.ok).toBe(false);
  });

  it("returns nulls without fields", () => {
    expect(resolveCommentMediaForCreate({})).toEqual({
      ok: true,
      imageUrl: null,
      videoUrl: null,
    });
  });
});

describe("commentMediaIsUpload", () => {
  it("counts stored images and videos but not YouTube embeds or text", () => {
    expect(
      commentMediaIsUpload({ imageUrl: "https://cdn.example/uploads/a.webp", videoUrl: null }),
    ).toBe(true);
    expect(
      commentMediaIsUpload({ imageUrl: null, videoUrl: "https://cdn.example/uploads/a.mp4" }),
    ).toBe(true);
    expect(
      commentMediaIsUpload({
        imageUrl: null,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      }),
    ).toBe(false);
    expect(commentMediaIsUpload({ imageUrl: null, videoUrl: null })).toBe(false);
  });
});

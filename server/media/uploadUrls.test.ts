import { afterEach, describe, expect, it, vi } from "vitest";
import {
  absolutePathForLocalPublicUpload,
  collectManagedUploadUrlsFromCommentSnapshot,
  collectManagedUploadUrlsFromVoxSnapshot,
  isLocalPublicUploadPath,
  isManagedPublicUploadUrl,
  isR2PublicUploadUrl,
} from "./uploadUrls";

describe("isR2PublicUploadUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts uploads/... under the configured public base", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://files.example.com");
    expect(isR2PublicUploadUrl("https://files.example.com/uploads/2026/05/abc-def.webp")).toBe(
      true,
    );
  });

  it("rejects another origin", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://files.example.com");
    expect(isR2PublicUploadUrl("https://evil.com/uploads/2026/05/x.jpg")).toBe(false);
  });
});

describe("isManagedPublicUploadUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("excludes YouTube and the static placeholder", () => {
    expect(isManagedPublicUploadUrl("https://www.youtube.com/embed/abc")).toBe(false);
    expect(isManagedPublicUploadUrl("/video-thumb.svg")).toBe(false);
    expect(isManagedPublicUploadUrl(null)).toBe(false);
  });
  it("accepts local /uploads/... and bucket URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://r2assets.test");
    expect(isManagedPublicUploadUrl("/uploads/2026/05/x.jpg")).toBe(true);
    expect(isManagedPublicUploadUrl("https://r2assets.test/uploads/2026/05/x.jpg")).toBe(true);
  });
});

describe("isLocalPublicUploadPath", () => {
  it("rejects traversal and odd paths", () => {
    expect(isLocalPublicUploadPath("/uploads/../../../etc/passwd")).toBe(false);
    expect(isLocalPublicUploadPath("/uploads/2026/05")).toBe(false);
  });
});

describe("collectManagedUploadUrlsFromVoxSnapshot", () => {
  it("skips the media of a YouTube vox", () => {
    const urls = collectManagedUploadUrlsFromVoxSnapshot({
      mediaType: "YOUTUBE",
      mediaUrl: "https://www.youtube.com/embed/x",
      thumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg",
      comments: [{ imageUrl: null, videoUrl: null, videoPosterUrl: null }],
    });
    expect(urls).toEqual([]);
  });
  it("includes image vox media and comment attachments", () => {
    const urls = collectManagedUploadUrlsFromVoxSnapshot({
      mediaType: "IMAGE",
      mediaUrl: "/uploads/2026/05/a.jpg",
      thumbnailUrl: "/uploads/2026/05/a.thumb.webp",
      comments: [
        {
          imageUrl: "/uploads/2026/05/z.png",
          videoUrl: null,
          videoPosterUrl: null,
        },
      ],
    });
    expect(urls).toContain("/uploads/2026/05/a.jpg");
    expect(urls.some((u) => u.includes("z.png"))).toBe(true);
  });

  it("includes comment poster thumbnails in a vox snapshot", () => {
    const urls = collectManagedUploadUrlsFromVoxSnapshot({
      mediaType: "IMAGE",
      mediaUrl: "/uploads/2026/05/a.jpg",
      thumbnailUrl: "/uploads/2026/05/a.thumb.webp",
      comments: [
        {
          imageUrl: null,
          videoUrl: "/uploads/2026/05/v.mp4",
          videoPosterUrl: "/uploads/2026/05/v.thumb.webp",
        },
      ],
    });
    expect(urls).toContain("/uploads/2026/05/v.thumb.webp");
  });
});

describe("collectManagedUploadUrlsFromCommentSnapshot", () => {
  it("includes managed image, video and poster", () => {
    const urls = collectManagedUploadUrlsFromCommentSnapshot({
      imageUrl: "/uploads/2026/05/i.png",
      videoUrl: "/uploads/2026/05/v.mp4",
      videoPosterUrl: "/uploads/2026/05/v.thumb.webp",
    });
    expect(urls).toEqual([
      "/uploads/2026/05/i.png",
      "/uploads/2026/05/v.mp4",
      "/uploads/2026/05/v.thumb.webp",
    ]);
  });
});

describe("absolutePathForLocalPublicUpload", () => {
  it("resolves under public/uploads", () => {
    const p = absolutePathForLocalPublicUpload("/uploads/2026/05/x.webp");
    expect(p).not.toBeNull();
    expect(p!.replace(/\\/g, "/")).toMatch(/public\/uploads\/2026\/05\/x\.webp$/);
  });
  it("rejects escaping the root", () => {
    expect(absolutePathForLocalPublicUpload("/uploads/2026/05/../x.webp")).toBe(null);
  });
});

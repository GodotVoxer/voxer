import { describe, expect, it } from "vitest";
import type { CommentPublic } from "@/lib/vox/types";
import { collectCommentGalleryItems } from "@/features/comments/galleryItems";

const base = (): Omit<CommentPublic, "id" | "publicTag" | "body" | "createdAt"> => ({
  displayName: "a",
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  avatarVariant: "BLUE",
  isOp: false,
  isMine: false,
});

describe("collectCommentGalleryItems", () => {
  it("includes image, uploaded video and youtube with thumbnail", () => {
    const list: CommentPublic[] = [
      {
        ...base(),
        id: "1",
        publicTag: "A",
        body: "",
        imageUrl: "https://cdn/img.png",
        videoUrl: null,
        createdAt: new Date().toISOString(),
      },
      {
        ...base(),
        id: "2",
        publicTag: "B",
        body: "",
        imageUrl: null,
        videoUrl: "https://blob/video.mp4",
        createdAt: new Date().toISOString(),
      },
      {
        ...base(),
        id: "3",
        publicTag: "C",
        body: "",
        imageUrl: null,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        createdAt: new Date().toISOString(),
      },
    ];
    const items = collectCommentGalleryItems(list);
    expect(items).toEqual([
      { kind: "image", url: "https://cdn/img.png" },
      {
        kind: "video_upload",
        url: "https://blob/video.mp4",
        posterUrl: null,
        animatedImage: false,
      },
      {
        kind: "video_youtube",
        openUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      },
    ]);
  });

  it("passes posterUrl for uploaded videos", () => {
    const list: CommentPublic[] = [
      {
        ...base(),
        id: "1",
        publicTag: "A",
        body: "",
        imageUrl: null,
        videoUrl: "https://x/v.mp4",
        videoPosterUrl: "https://x/p.webp",
        createdAt: new Date().toISOString(),
      },
    ];
    expect(collectCommentGalleryItems(list)).toEqual([
      {
        kind: "video_upload",
        url: "https://x/v.mp4",
        posterUrl: "https://x/p.webp",
        animatedImage: false,
      },
    ]);
  });

  it("dedupes repeated video URL", () => {
    const list: CommentPublic[] = [
      {
        ...base(),
        id: "1",
        publicTag: "A",
        body: "",
        imageUrl: null,
        videoUrl: "https://x/v.mp4",
        createdAt: new Date().toISOString(),
      },
      {
        ...base(),
        id: "2",
        publicTag: "B",
        body: "",
        imageUrl: null,
        videoUrl: "https://x/v.mp4",
        createdAt: new Date().toISOString(),
      },
    ];
    expect(collectCommentGalleryItems(list)).toEqual([
      { kind: "video_upload", url: "https://x/v.mp4", posterUrl: null, animatedImage: false },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { moderationAuthorPublicationCommentThumbSrc } from "./authorPublicationCommentMedia";

describe("moderationAuthorPublicationCommentThumbSrc", () => {
  it("prefers the comment image", () => {
    expect(
      moderationAuthorPublicationCommentThumbSrc({
        imageUrl: "https://cdn.example/a.jpg",
        videoUrl: "https://cdn.example/v.mp4",
        videoPosterUrl: "https://cdn.example/p.jpg",
      }),
    ).toBe("https://cdn.example/a.jpg");
  });

  it("uses the video poster without an image", () => {
    expect(
      moderationAuthorPublicationCommentThumbSrc({
        imageUrl: null,
        videoUrl: "https://cdn.example/v.mp4",
        videoPosterUrl: "https://cdn.example/p.jpg",
      }),
    ).toBe("https://cdn.example/p.jpg");
  });

  it("uses the local placeholder only for a video without poster", () => {
    expect(
      moderationAuthorPublicationCommentThumbSrc({
        imageUrl: null,
        videoUrl: "https://cdn.example/v.mp4",
        videoPosterUrl: null,
      }),
    ).toBe("/video-thumb.svg");
  });

  it("returns null without media", () => {
    expect(
      moderationAuthorPublicationCommentThumbSrc({
        imageUrl: null,
        videoUrl: null,
        videoPosterUrl: null,
      }),
    ).toBeNull();
  });
});

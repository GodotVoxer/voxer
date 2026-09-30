import { describe, expect, it } from "vitest";
import { parseMediaLink } from "./mediaLink";
describe("parseMediaLink", () => {
  it("detects YouTube in several formats", () => {
    expect(parseMediaLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "YOUTUBE",
      videoId: "dQw4w9WgXcQ",
    });
    expect(parseMediaLink("https://youtu.be/jNQXAC9IVRw")).toEqual({
      kind: "YOUTUBE",
      videoId: "jNQXAC9IVRw",
    });
    expect(parseMediaLink("https://youtube.com/shorts/LPnv8NQat0U")).toEqual({
      kind: "YOUTUBE",
      videoId: "LPnv8NQat0U",
    });
  });
  it("detects an image URL by extension", () => {
    expect(parseMediaLink("https://example.com/pic.png")).toEqual({
      kind: "IMAGE",
      url: "https://example.com/pic.png",
    });
  });
  it("treats https without an extension as an image unless it is YouTube", () => {
    expect(parseMediaLink("https://images.example.com/abc")).toEqual({
      kind: "IMAGE",
      url: "https://images.example.com/abc",
    });
  });
  it("returns null for empty or non-http input", () => {
    expect(parseMediaLink("")).toBeNull();
    expect(parseMediaLink("ftp://x/foo.jpg")).toBeNull();
  });
});

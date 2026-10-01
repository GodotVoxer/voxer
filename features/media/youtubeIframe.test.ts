import { describe, expect, it } from "vitest";
import { youtubeNocookieEmbedSrc } from "./youtubeIframe";

describe("youtubeIframe", () => {
  it("builds an autoplaying nocookie embed from an id", () => {
    expect(youtubeNocookieEmbedSrc("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    );
  });
});

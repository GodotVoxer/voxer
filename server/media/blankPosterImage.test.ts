import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { posterImageBufferIsBlank } from "@/server/media/blankPosterImage";

const solid = (rgba: { r: number; g: number; b: number; alpha: number }) =>
  sharp({ create: { width: 8, height: 8, channels: 4, background: rgba } })
    .webp()
    .toBuffer();

describe("posterImageBufferIsBlank", () => {
  it("detects a fully transparent poster", async () => {
    expect(await posterImageBufferIsBlank(await solid({ r: 0, g: 0, b: 0, alpha: 0 }))).toBe(true);
  });
  it("leaves an opaque black frame alone", async () => {
    expect(await posterImageBufferIsBlank(await solid({ r: 0, g: 0, b: 0, alpha: 1 }))).toBe(false);
  });
  it("leaves an image without alpha alone", async () => {
    const jpeg = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .jpeg()
      .toBuffer();
    expect(await posterImageBufferIsBlank(jpeg)).toBe(false);
  });
  it("does not call unreadable bytes blank", async () => {
    expect(await posterImageBufferIsBlank(Buffer.from("no soy una imagen"))).toBe(false);
  });
});

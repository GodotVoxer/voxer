import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { crc32 } from "zlib";
import { ImageDimensionLimitError, prepareImageBuffers } from "@/server/media/imageProcess";
import {
  UPLOAD_ANIMATION_MAX_FRAMES,
  UPLOAD_ANIMATION_MAX_INPUT_PIXELS,
  UPLOAD_IMAGE_MAX_INPUT_PIXELS,
  UPLOAD_IMAGE_REJECT_IF_SIDE_GT_PX,
} from "@/lib/media/uploadLimits";

const twoFrameGifBuffer = async (): Promise<Buffer> => {
  const f1 = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  const f2 = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#0000ff" },
  })
    .png()
    .toBuffer();
  return sharp([f1, f2], { join: { animated: true } })
    .gif({ delay: [80, 120] })
    .toBuffer();
};

/** Small PNG whose header claims other dimensions, which is how a decompression bomb arrives. */
const pngDeclaringSize = async (width: number, height: number): Promise<Buffer> => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "black" } })
    .png()
    .toBuffer();
  // Signature (8) + length (4) + "IHDR" (4): width and height are the next 8 bytes.
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);
  return png;
};

describe("prepareImageBuffers", () => {
  it("rejects an oversized image from its header before decoding", async () => {
    const bomb = await pngDeclaringSize(16_000, 16_000);
    expect((await sharp(bomb).metadata()).width).toBe(16_000);
    await expect(prepareImageBuffers(bomb, "png")).rejects.toBeInstanceOf(ImageDimensionLimitError);
  });

  it("creates a thumbnail from a small image", async () => {
    const buf = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#445566" },
    })
      .jpeg()
      .toBuffer();
    const p = await prepareImageBuffers(buf, "jpg");
    expect(p.fullBuffer.length).toBeGreaterThan(0);
    expect(p.thumbBuffer.length).toBeGreaterThan(0);
    expect(p.fileExt).toBe("jpg");
  });

  it("strips EXIF (GPS, author) from a small JPEG", async () => {
    const withExif = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#445566" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "dato-identificable" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const p = await prepareImageBuffers(withExif, "jpg");

    expect((await sharp(p.fullBuffer).metadata()).exif).toBeUndefined();
  });

  it("rejects absurd dimensions from simulated metadata", async () => {
    const w = UPLOAD_IMAGE_REJECT_IF_SIDE_GT_PX + 1;
    const buf = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "black" },
    })
      .jpeg()
      .toBuffer();
    type SharpMetadata = Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
    const SharpCtor = sharp as unknown as {
      prototype: { metadata: () => Promise<SharpMetadata> };
    };
    const spy = vi.spyOn(SharpCtor.prototype, "metadata").mockResolvedValue({
      width: w,
      height: 2,
    } as SharpMetadata);
    await expect(prepareImageBuffers(buf, "jpg")).rejects.toBeInstanceOf(ImageDimensionLimitError);
    spy.mockRestore();
  });

  const withFakeMetadata = async (meta: Record<string, unknown>, run: () => Promise<void>) => {
    type SharpMetadata = Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
    const SharpCtor = sharp as unknown as {
      prototype: { metadata: () => Promise<SharpMetadata> };
    };
    const spy = vi
      .spyOn(SharpCtor.prototype, "metadata")
      .mockResolvedValue(meta as unknown as SharpMetadata);
    try {
      await run();
    } finally {
      spy.mockRestore();
    }
  };

  const tinyJpeg = () =>
    sharp({ create: { width: 2, height: 2, channels: 3, background: "black" } })
      .jpeg()
      .toBuffer();

  it("accepts a small-canvas GIF with many frames", async () => {
    const buf = await tinyJpeg();
    await withFakeMetadata({ width: 296, height: 360, pages: 633, format: "gif" }, async () => {
      const meta = await sharp(buf).metadata();
      expect((meta.width ?? 0) * (meta.height ?? 0) * (meta.pages ?? 1)).toBeGreaterThan(
        UPLOAD_IMAGE_MAX_INPUT_PIXELS,
      );
      expect((meta.width ?? 0) * (meta.height ?? 0) * (meta.pages ?? 1)).toBeLessThanOrEqual(
        UPLOAD_ANIMATION_MAX_INPUT_PIXELS,
      );
    });
  });

  it("rejects an animation with too many frames and says so", async () => {
    const buf = await tinyJpeg();
    await withFakeMetadata(
      { width: 64, height: 64, pages: UPLOAD_ANIMATION_MAX_FRAMES + 1, format: "gif" },
      async () => {
        await expect(prepareImageBuffers(buf, "gif")).rejects.toMatchObject({
          name: "ImageDimensionLimitError",
          reason: "animation",
        });
      },
    );
  });

  it("rejects a huge canvas even when animated and reports dimensions", async () => {
    const buf = await tinyJpeg();
    await withFakeMetadata({ width: 4000, height: 4000, pages: 4, format: "gif" }, async () => {
      await expect(prepareImageBuffers(buf, "gif")).rejects.toMatchObject({
        name: "ImageDimensionLimitError",
        reason: "dimensions",
      });
    });
  });

  it("converts an animated GIF to MP4 even with a jpg extension", async () => {
    const gifBuf = await twoFrameGifBuffer();
    expect((await sharp(gifBuf).metadata()).pages).toBe(2);
    const p = await prepareImageBuffers(gifBuf, "jpg");
    expect(p.fileExt).toBe("mp4");
    expect(p.fullContentType).toBe("video/mp4");
    expect(p.animatedImage).toBe(true);
    // An `ftyp` box first: a real MP4, not a renamed GIF.
    expect(p.fullBuffer.subarray(4, 8).toString("latin1")).toBe("ftyp");
    // The thumbnail is still a still image, which is what the grid shows.
    expect((await sharp(p.thumbBuffer).metadata()).format).toBe("webp");
  }, 60_000);

  it("keeps a single-frame GIF as a GIF", async () => {
    const still = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#123456" },
    })
      .gif()
      .toBuffer();
    expect((await sharp(still).metadata()).pages ?? 1).toBe(1);
    const p = await prepareImageBuffers(still, "gif");
    expect(p.fileExt).toBe("gif");
    expect(p.fullContentType).toBe("image/gif");
    expect(p.animatedImage).toBe(false);
    const outMeta = await sharp(p.fullBuffer).metadata();
    expect(outMeta.format).toBe("gif");
    expect(outMeta.exif).toBeUndefined();
    expect(outMeta.xmp).toBeUndefined();
  });
});

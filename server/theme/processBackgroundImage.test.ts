import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processBackgroundImage, ThemeBackgroundImageError } from "./processBackgroundImage";

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 40, g: 10, b: 90 } } });

const expectCode = async (input: Buffer, code: string) => {
  await expect(processBackgroundImage(input)).rejects.toSatisfy(
    (error: unknown) => error instanceof ThemeBackgroundImageError && error.code === code,
  );
};

describe("processBackgroundImage", () => {
  it("re-encodes to WebP in two sizes without upscaling", async () => {
    const input = await solid(3000, 1500).jpeg().toBuffer();
    const result = await processBackgroundImage(input);
    const fullMeta = await sharp(result.full).metadata();
    const smallMeta = await sharp(result.small).metadata();
    expect(fullMeta.format).toBe("webp");
    expect([fullMeta.width, fullMeta.height]).toEqual([2560, 1280]);
    expect([smallMeta.width, smallMeta.height]).toEqual([1280, 640]);
    expect(result.sha256Hex).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sourceSha256Hex).toBe(createHash("sha256").update(input).digest("hex"));
    expect(result.sourceSha256Hex).not.toBe(result.sha256Hex);

    const tiny = await processBackgroundImage(await solid(40, 30).png().toBuffer());
    expect([tiny.width, tiny.height]).toEqual([40, 30]);
  });

  it("strips EXIF such as location from the original", async () => {
    const withExif = await solid(200, 200)
      .jpeg()
      .withExif({ IFD0: { Copyright: "secreto-gps-41.40338,2.17403", Artist: "persona real" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const result = await processBackgroundImage(withExif);
    const meta = await sharp(result.full).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(result.full.includes(Buffer.from("secreto-gps"))).toBe(false);
  });

  it("drops extra bytes appended to the file (polyglots)", async () => {
    const payload = Buffer.from("<script>alert(document.cookie)</script>");
    const polyglot = Buffer.concat([await solid(120, 80).png().toBuffer(), payload]);
    const result = await processBackgroundImage(polyglot);
    expect(result.full.includes(payload)).toBe(false);
    expect(result.small.includes(payload)).toBe(false);
  });

  it("rejects unsupported formats posing as images", async () => {
    await expectCode(await solid(50, 50).gif().toBuffer(), "UNSUPPORTED_FORMAT");
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
    );
    await expect(processBackgroundImage(svg)).rejects.toBeInstanceOf(ThemeBackgroundImageError);
    await expectCode(Buffer.from("<!doctype html><html><body>hola</body></html>"), "UNREADABLE");
    await expectCode(Buffer.alloc(0), "UNREADABLE");
  });

  it("rejects truncated files", async () => {
    const jpeg = await solid(600, 600).jpeg().toBuffer();
    await expect(processBackgroundImage(jpeg.subarray(0, 200))).rejects.toBeInstanceOf(
      ThemeBackgroundImageError,
    );
  });

  it("rejects excessive dimensions before decoding", async () => {
    await expectCode(await solid(8100, 10).png().toBuffer(), "DIMENSIONS");
  });

  it("rejects images over the pixel cap (decompression bomb)", async () => {
    const bomb = await solid(7000, 7000).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(2 * 1024 * 1024);
    await expectCode(bomb, "DIMENSIONS");
  }, 30_000);
});

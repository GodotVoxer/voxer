import { describe, expect, it } from "vitest";
import { buildGifToMp4FfmpegArgs, looksLikeGif } from "./animatedGifToVideo";

describe("looksLikeGif", () => {
  it("accepts both format signatures", () => {
    expect(looksLikeGif(Buffer.from("GIF87a....", "latin1"))).toBe(true);
    expect(looksLikeGif(Buffer.from("GIF89a....", "latin1"))).toBe(true);
  });

  it("rejects anything without the signature", () => {
    // The type is client-declared: without this check a text file reaches ffmpeg's demuxer.
    expect(looksLikeGif(Buffer.from("#EXTM3U\n#EXT-X-VERSION:3", "latin1"))).toBe(false);
    expect(looksLikeGif(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(looksLikeGif(Buffer.alloc(0))).toBe(false);
  });
});

describe("buildGifToMp4FfmpegArgs", () => {
  const args = buildGifToMp4FfmpegArgs("/tmp/in.gif", "/tmp/out.mp4");
  const pairOf = (flag: string) => args[args.indexOf(flag) + 1];

  it("pins the demuxer and allows no protocol but the local file", () => {
    expect(pairOf("-protocol_whitelist")).toBe("file");
    expect(pairOf("-f")).toBe("gif");
  });

  it("copies no metadata at any level", () => {
    expect(pairOf("-map_metadata")).toBe("-1");
    expect(pairOf("-map_metadata:s")).toBe("-1");
    expect(pairOf("-map_chapters")).toBe("-1");
  });

  it("outputs no audio track, even dimensions and a streamable file", () => {
    expect(args).toContain("-an");
    expect(pairOf("-pix_fmt")).toBe("yuv420p");
    expect(pairOf("-vf")).toBe("scale=trunc(iw/2)*2:trunc(ih/2)*2");
    expect(pairOf("-movflags")).toBe("+faststart");
    expect(args.at(-1)).toBe("/tmp/out.mp4");
  });
});

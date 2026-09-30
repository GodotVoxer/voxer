import { describe, expect, it } from "vitest";
import {
  StripVideoMetadataError,
  buildStripVideoFfmpegArgs,
  ffmpegBinaryPath,
  looksLikeVideoContainer,
  stripVideoMetadataBuffer,
} from "@/server/media/stripVideoMetadata";

describe("buildStripVideoFfmpegArgs", () => {
  it("removes global, stream and chapter metadata", () => {
    const args = buildStripVideoFfmpegArgs("/tmp/in.mp4", "/tmp/out.mp4", false);
    expect(args.join(" ")).toContain("-map_metadata -1");
    expect(args.join(" ")).toContain("-map_metadata:s -1");
    expect(args.join(" ")).toContain("-map_chapters -1");
    expect(args).toContain("-codec");
    expect(args).toContain("copy");
  });
  it("pins the demuxer and only reads local files", () => {
    const mp4 = buildStripVideoFfmpegArgs("/a/in.mp4", "/a/out.mp4", false).join(" ");
    expect(mp4).toContain("-protocol_whitelist file -f mov -i /a/in.mp4");
    const webm = buildStripVideoFfmpegArgs("/b/in.webm", "/b/out.webm", true).join(" ");
    expect(webm).toContain("-protocol_whitelist file -f matroska -i /b/in.webm");
  });
  it("adds faststart only for mp4", () => {
    const mp4 = buildStripVideoFfmpegArgs("/a/in.mp4", "/a/out.mp4", false);
    expect(mp4.join(" ")).toContain("+faststart");
    const webm = buildStripVideoFfmpegArgs("/b/in.webm", "/b/out.webm", true);
    expect(webm.join(" ")).not.toContain("faststart");
  });
});

describe("stripVideoMetadataBuffer", () => {
  it("fails closed when ffmpeg cannot remux and never returns the original bytes", async () => {
    if (!ffmpegBinaryPath()) return;
    const junk = Buffer.from("no-es-un-video");
    await expect(stripVideoMetadataBuffer(junk, "mp4")).rejects.toMatchObject({
      name: "StripVideoMetadataError",
      code: "FFMPEG_FAILED",
    } satisfies Partial<StripVideoMetadataError>);
  });
});

describe("looksLikeVideoContainer", () => {
  const box = (type: string) => Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from(type)]);
  it("accepts MP4/MOV by their first box and WebM by the EBML header", () => {
    expect(looksLikeVideoContainer(box("ftyp"), "mp4")).toBe(true);
    expect(looksLikeVideoContainer(box("moov"), "mp4")).toBe(true);
    expect(looksLikeVideoContainer(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01]), "webm")).toBe(true);
  });
  it("rejects disguised text such as an HLS playlist and mismatched containers", () => {
    const hls = Buffer.from("#EXTM3U\n#EXTINF:1,\nfile:///etc/secret.ts\n");
    expect(looksLikeVideoContainer(hls, "mp4")).toBe(false);
    expect(looksLikeVideoContainer(hls, "webm")).toBe(false);
    expect(looksLikeVideoContainer(box("ftyp"), "webm")).toBe(false);
    expect(looksLikeVideoContainer(Buffer.from("abc"), "mp4")).toBe(false);
  });
});

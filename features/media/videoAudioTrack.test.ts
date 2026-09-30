import { describe, expect, it } from "vitest";
import { videoBytesHaveAudioTrack } from "@/features/media/videoAudioTrack";

const bytes = (...parts: Array<string | number[]>): Uint8Array =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string" ? Array.from(new TextEncoder().encode(part)) : part,
    ),
  );

describe("videoBytesHaveAudioTrack", () => {
  it("detects the MP4 audio handler", () => {
    expect(videoBytesHaveAudioTrack(bytes("vide", "soun"), "mp4")).toBe(true);
  });

  it("treats an MP4 without an audio handler as silent", () => {
    expect(videoBytesHaveAudioTrack(bytes("ftyp", "moov", "vide", "mdat"), "mp4")).toBe(false);
  });

  it("detects WebM audio codecs and TrackType", () => {
    expect(videoBytesHaveAudioTrack(bytes("V_VP9", "A_OPUS"), "webm")).toBe(true);
    expect(videoBytesHaveAudioTrack(bytes([0x83, 0x81, 0x02]), "webm")).toBe(true);
  });

  it("treats a WebM with a single video track as silent", () => {
    expect(videoBytesHaveAudioTrack(bytes("webm", "V_VP9", [0x83, 0x81, 0x01]), "webm")).toBe(
      false,
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blobPathnameFromFinalizeUrl, directUploadKey } from "./blobFinalizeUrl";

const BASE = "https://pub-test.r2.dev";
const UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("blobPathnameFromFinalizeUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", BASE);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["image", "webp"],
    ["image", "gif"],
    ["video", "mp4"],
    ["video", "webm"],
  ] as const)("accepts a %s upload with .%s on the public bucket", (kind, ext) => {
    const url = `${BASE}/incoming/2026/05/${UUID}.${ext}`;
    expect(blobPathnameFromFinalizeUrl(url, kind)).toBe(`incoming/2026/05/${UUID}.${ext}`);
  });

  it("rejects an extension of the other kind", () => {
    expect(blobPathnameFromFinalizeUrl(`${BASE}/incoming/2026/05/${UUID}.mp4`, "image")).toBeNull();
    expect(blobPathnameFromFinalizeUrl(`${BASE}/incoming/2026/05/${UUID}.mov`, "video")).toBeNull();
  });

  it("rejects other hosts and malformed keys", () => {
    expect(
      blobPathnameFromFinalizeUrl(`https://evil.com/incoming/2026/05/${UUID}.gif`, "image"),
    ).toBeNull();
    expect(
      blobPathnameFromFinalizeUrl(`${BASE}/incoming/2026/05/not-a-uuid.gif`, "image"),
    ).toBeNull();
    expect(blobPathnameFromFinalizeUrl("not a url", "image")).toBeNull();
  });

  it("rejects published keys, which are not pending uploads", () => {
    expect(blobPathnameFromFinalizeUrl(`${BASE}/uploads/2026/05/${UUID}.webp`, "image")).toBeNull();
  });

  it("round-trips the keys it generates", () => {
    const key = directUploadKey(UUID, "png", new Date("2026-03-09T12:00:00Z"));
    expect(key).toBe(`incoming/2026/03/${UUID}.png`);
    expect(blobPathnameFromFinalizeUrl(`${BASE}/${key}`, "image")).toBe(key);
  });
});

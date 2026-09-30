import { describe, expect, it } from "vitest";
import {
  COMMENT_CREATE_INTERVAL_MS,
  COMMENT_MEDIA_UPLOADS_PER_WINDOW,
  VOX_CREATE_INTERVAL_MS,
  VOX_MEDIA_UPLOADS_PER_WINDOW,
} from "@/lib/limits";
import { decideMediaUploadSlot } from "@/server/upload/userWindow";

describe("decideMediaUploadSlot", () => {
  const t0 = 1_000_000_000_000;
  it("vox window: two uploads, then blocked for 5 minutes", () => {
    const start = t0 - 1000;
    expect(
      decideMediaUploadSlot(t0, start, 0, VOX_CREATE_INTERVAL_MS, VOX_MEDIA_UPLOADS_PER_WINDOW),
    ).toMatchObject({ allowed: true, nextCount: 1 });
    expect(
      decideMediaUploadSlot(t0, start, 1, VOX_CREATE_INTERVAL_MS, VOX_MEDIA_UPLOADS_PER_WINDOW),
    ).toMatchObject({ allowed: true, nextCount: 2 });
    expect(
      decideMediaUploadSlot(t0, start, 2, VOX_CREATE_INTERVAL_MS, VOX_MEDIA_UPLOADS_PER_WINDOW),
    ).toEqual({ allowed: false, retryAfterMs: VOX_CREATE_INTERVAL_MS - 1000 });
  });
  it("comment window: same logic with a short interval", () => {
    const start = t0 - 1000;
    expect(
      decideMediaUploadSlot(
        t0,
        start,
        0,
        COMMENT_CREATE_INTERVAL_MS,
        COMMENT_MEDIA_UPLOADS_PER_WINDOW,
      ),
    ).toMatchObject({ allowed: true, nextCount: 1 });
    expect(
      decideMediaUploadSlot(
        t0,
        start,
        2,
        COMMENT_CREATE_INTERVAL_MS,
        COMMENT_MEDIA_UPLOADS_PER_WINDOW,
      ),
    ).toEqual({ allowed: false, retryAfterMs: COMMENT_CREATE_INTERVAL_MS - 1000 });
  });
});

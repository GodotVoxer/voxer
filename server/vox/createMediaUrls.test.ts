import { describe, expect, it, vi } from "vitest";
import { validateNonYoutubeVoxMediaUrls } from "./createMediaUrls";

describe("validateNonYoutubeVoxMediaUrls", () => {
  it("accepts local upload paths", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "");
    expect(
      validateNonYoutubeVoxMediaUrls("/uploads/2026/05/a.jpg", "/uploads/2026/05/a-thumb.jpg"),
    ).toEqual({ ok: true });
  });

  it("rejects arbitrary https URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "");
    const r = validateNonYoutubeVoxMediaUrls(
      "https://evil.example/tracker.gif",
      "https://evil.example/thumb.gif",
    );
    expect(r.ok).toBe(false);
  });
});

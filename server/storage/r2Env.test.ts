import { afterEach, describe, expect, it, vi } from "vitest";
import { effectiveR2S3Endpoint } from "./r2Env";
import { r2PublicOrigin, r2PublicUrlForKey } from "@/lib/media/publicStorage";

describe("r2Env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("r2PublicUrlForKey joins the base without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://pub.r2.dev/");
    expect(r2PublicUrlForKey("uploads/2026/05/x.jpg")).toBe(
      "https://pub.r2.dev/uploads/2026/05/x.jpg",
    );
  });

  it("r2PublicOrigin returns the origin", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://media.site.com/v1");
    expect(r2PublicOrigin()).toBe("https://media.site.com");
  });

  it("effectiveR2S3Endpoint prefers R2_S3_ENDPOINT", () => {
    vi.stubEnv("R2_S3_ENDPOINT", "https://abc.r2.cloudflarestorage.com/");
    vi.stubEnv("R2_ACCOUNT_ID", "a".repeat(32));
    expect(effectiveR2S3Endpoint()).toBe("https://abc.r2.cloudflarestorage.com");
  });

  it("effectiveR2S3Endpoint derives from R2_ACCOUNT_ID when missing", () => {
    vi.unstubAllEnvs();
    const id = "a".repeat(32);
    vi.stubEnv("R2_ACCOUNT_ID", id);
    expect(effectiveR2S3Endpoint()).toBe(`https://${id}.r2.cloudflarestorage.com`);
  });

  it("effectiveR2S3Endpoint returns null when ACCOUNT_ID is not 32 hex", () => {
    vi.stubEnv("R2_ACCOUNT_ID", "not-a-valid-account-id");
    expect(effectiveR2S3Endpoint()).toBeNull();
  });
});

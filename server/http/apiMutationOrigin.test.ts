import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedApiMutationOrigin } from "./apiMutationOrigin";

describe("isAllowedApiMutationOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts the Origin of NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.voxer.pro");
    expect(
      isAllowedApiMutationOrigin({
        origin: "https://www.voxer.pro",
        referer: null,
      }),
    ).toBe(true);
  });

  it("rejects a foreign Origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.voxer.pro");
    expect(
      isAllowedApiMutationOrigin({
        origin: "https://evil.example",
        referer: null,
      }),
    ).toBe(false);
  });

  it("accepts a same-site Referer when Origin is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.voxer.pro");
    expect(
      isAllowedApiMutationOrigin({
        origin: null,
        referer: "https://www.voxer.pro/vox/abc",
      }),
    ).toBe(true);
  });

  it("allows mutations without Origin in development (curl)", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      isAllowedApiMutationOrigin({
        origin: null,
        referer: null,
      }),
    ).toBe(true);
  });

  it("rejects Sec-Fetch-Site: cross-site even when Origin and Referer look local", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.voxer.pro");
    expect(
      isAllowedApiMutationOrigin({
        origin: "https://www.voxer.pro",
        referer: "https://www.voxer.pro/",
        secFetchSite: "cross-site",
      }),
    ).toBe(false);
  });

  it("rejects cross-site in development too", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      isAllowedApiMutationOrigin({ origin: null, referer: null, secFetchSite: "cross-site" }),
    ).toBe(false);
  });

  it("still validates Origin for same-origin requests", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.voxer.pro");
    expect(
      isAllowedApiMutationOrigin({
        origin: "https://www.voxer.pro",
        referer: null,
        secFetchSite: "same-origin",
      }),
    ).toBe(true);
  });
});

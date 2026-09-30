import { afterEach, describe, expect, it, vi } from "vitest";
import { getSitePublicOriginUrl, originFromForwardedHeaders } from "./sitePublicOrigin";

describe("getSitePublicOriginUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a valid NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://voxer.example/");
    expect(getSitePublicOriginUrl()?.href).toBe("https://voxer.example/");
  });

  it("returns undefined when the origin is missing or invalid", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getSitePublicOriginUrl()).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not a url");
    expect(getSitePublicOriginUrl()).toBeUndefined();
  });
});

describe("originFromForwardedHeaders", () => {
  it("builds the URL from host and proto", () => {
    expect(originFromForwardedHeaders("www.example.com", "https")?.href).toBe(
      "https://www.example.com/",
    );
  });

  it("takes the first value of a comma-separated list", () => {
    expect(originFromForwardedHeaders("www.example.com, evil.test", "https")?.href).toBe(
      "https://www.example.com/",
    );
  });

  it("defaults to https when proto is missing", () => {
    expect(originFromForwardedHeaders("voxer.pro", null)?.href).toBe("https://voxer.pro/");
  });

  it("returns undefined without a host", () => {
    expect(originFromForwardedHeaders(null, "https")).toBeUndefined();
  });
});

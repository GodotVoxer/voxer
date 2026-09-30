import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import { API_NO_STORE_SOURCE } from "./cacheHeaders";

describe("API cache headers", () => {
  it("sends no-store on every /api/* route", async () => {
    const rules = await nextConfig.headers!();
    const apiRule = rules.find((r) => r.source === API_NO_STORE_SOURCE);
    expect(apiRule).toBeDefined();
    const cacheControl = apiRule!.headers.find((h) => h.key === "Cache-Control")?.value;
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("private");
  });

  it("leaves assetlinks.json alone, which is cached on purpose", () => {
    // `/.well-known/assetlinks.json` is outside `/api/:path*`; this fails if someone moves the route.
    expect(API_NO_STORE_SOURCE.startsWith("/api/")).toBe(true);
  });
});

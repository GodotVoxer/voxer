import { afterEach, describe, expect, it, vi } from "vitest";
import { countryCodeFromRequestHeaders } from "./requestCountryCode";

const req = (headers: Record<string, string>) => new Request("http://localhost", { headers });

describe("countryCodeFromRequestHeaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads cf-ipcountry behind Cloudflare", () => {
    vi.stubEnv("TRUSTED_PROXY", "cloudflare");
    expect(countryCodeFromRequestHeaders(req({ "cf-ipcountry": "ar" }))).toBe("AR");
  });

  it("ignores unknown and malformed values", () => {
    vi.stubEnv("TRUSTED_PROXY", "cloudflare");
    expect(countryCodeFromRequestHeaders(req({ "cf-ipcountry": "XX" }))).toBeNull();
    expect(countryCodeFromRequestHeaders(req({ "cf-ipcountry": "ARG" }))).toBeNull();
  });

  it("does not trust the header when Cloudflare is not the proxy, since clients can forge it", () => {
    vi.stubEnv("TRUSTED_PROXY", "xff");
    expect(countryCodeFromRequestHeaders(req({ "cf-ipcountry": "AR" }))).toBeNull();
  });
});

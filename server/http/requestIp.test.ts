import { describe, expect, it } from "vitest";
import { requestClientIp, resolveTrustedProxy } from "./requestIp";

const reqWith = (headers: Record<string, string>) => new Request("http://localhost", { headers });

describe("requestClientIp", () => {
  it("cloudflare: uses cf-connecting-ip and ignores x-forwarded-for", () => {
    const req = reqWith({ "cf-connecting-ip": "198.51.100.2", "x-forwarded-for": "spoofed" });
    expect(requestClientIp(req, "cloudflare")).toBe("198.51.100.2");
  });

  it("xff: uses the last hop, the one added by the trusted proxy", () => {
    const req = reqWith({ "x-forwarded-for": " 203.0.113.1 , 10.0.0.1 " });
    expect(requestClientIp(req, "xff")).toBe("10.0.0.1");
  });

  it("none: ignores every header", () => {
    const req = reqWith({ "cf-connecting-ip": "198.51.100.2", "x-forwarded-for": "1.2.3.4" });
    expect(requestClientIp(req, "none")).toBe("local");
  });
});

describe("resolveTrustedProxy", () => {
  it("honours an explicit TRUSTED_PROXY", () => {
    expect(resolveTrustedProxy({ TRUSTED_PROXY: "Cloudflare" })).toBe("cloudflare");
  });

  it("falls back to none for unknown or missing values", () => {
    expect(resolveTrustedProxy({ TRUSTED_PROXY: "vercel" })).toBe("none");
    expect(resolveTrustedProxy({})).toBe("none");
  });
});

import { describe, expect, it } from "vitest";
import {
  hashNormalizedClientIp,
  hmacSha256Hex,
  normalizeRawClientIp,
} from "@/server/http/clientIpHash";

describe("normalizeRawClientIp", () => {
  it("trims and lowercases", () => {
    expect(normalizeRawClientIp("  2001:DB8::1  ")).toBe("2001:db8::1");
    expect(normalizeRawClientIp("192.0.2.1")).toBe("192.0.2.1");
  });
});

describe("hashNormalizedClientIp", () => {
  it("is deterministic for the same pepper", () => {
    const k = "test-pepper-32-chars-minimum!!";
    const a = hashNormalizedClientIp("192.0.2.10", k);
    const b = hashNormalizedClientIp("192.0.2.10", k);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when the normalized IP changes", () => {
    const k = "test-pepper-32-chars-minimum!!";
    expect(hashNormalizedClientIp("192.0.2.1", k)).not.toEqual(
      hashNormalizedClientIp("192.0.2.2", k),
    );
  });
});

describe("hmacSha256Hex", () => {
  it("produces 64 hex characters", () => {
    const h = hmacSha256Hex("k", "msg");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});

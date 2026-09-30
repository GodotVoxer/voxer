import { describe, expect, it } from "vitest";
import { isAllowedUnifiedPushEndpoint, isPublicIpAddress } from "./unifiedPushEndpoint";

describe("isAllowedUnifiedPushEndpoint", () => {
  it("accepts https endpoints on public hosts, including self-hosted distributors", () => {
    expect(isAllowedUnifiedPushEndpoint("https://ntfy.sh/upAbC123?up=1")).toBe(true);
    expect(
      isAllowedUnifiedPushEndpoint("https://push.example.org:443/index.php/apps/uppush/x"),
    ).toBe(true);
    expect(isAllowedUnifiedPushEndpoint("https://93.184.216.34/up")).toBe(true);
  });

  it("rejects plain http, credentials and non-standard ports", () => {
    expect(isAllowedUnifiedPushEndpoint("http://ntfy.sh/up")).toBe(false);
    expect(isAllowedUnifiedPushEndpoint("https://user:pw@ntfy.sh/up")).toBe(false);
    expect(isAllowedUnifiedPushEndpoint("https://ntfy.sh:8443/up")).toBe(false);
  });

  it("rejects local names and private or reserved addresses", () => {
    for (const url of [
      "https://localhost/up",
      "https://intranet/up",
      "https://printer.local/up",
      "https://db.internal/up",
      "https://127.0.0.1/up",
      "https://10.1.2.3/up",
      "https://192.168.0.10/up",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/up",
      "https://[fd00::1]/up",
      "https://[::ffff:10.0.0.1]/up",
    ]) {
      expect(isAllowedUnifiedPushEndpoint(url)).toBe(false);
    }
  });

  it("rejects malformed and oversized endpoints", () => {
    expect(isAllowedUnifiedPushEndpoint("not a url")).toBe(false);
    expect(isAllowedUnifiedPushEndpoint(`https://ntfy.sh/${"a".repeat(600)}`)).toBe(false);
  });
});

describe("isPublicIpAddress", () => {
  it("tells public from private, loopback and link-local addresses", () => {
    expect(isPublicIpAddress("8.8.8.8")).toBe(true);
    expect(isPublicIpAddress("2606:4700:4700::1111")).toBe(true);
    expect(isPublicIpAddress("172.20.0.5")).toBe(false);
    expect(isPublicIpAddress("100.64.0.1")).toBe(false);
    expect(isPublicIpAddress("fe80::1")).toBe(false);
    expect(isPublicIpAddress("::ffff:a00:1")).toBe(false);
    expect(isPublicIpAddress("::ffff:8.8.8.8")).toBe(true);
    expect(isPublicIpAddress("not-an-ip")).toBe(false);
  });
});

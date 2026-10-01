import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  contentSecurityPolicyHeaderName,
} from "./contentSecurityPolicy";

const directive = (csp: string, name: string): string[] => {
  const found = csp.split("; ").find((d) => d === name || d.startsWith(`${name} `));
  return found ? found.split(" ").slice(1) : [];
};

describe("buildContentSecurityPolicy", () => {
  const prodEnv = {
    NODE_ENV: "production",
    NEXT_PUBLIC_R2_PUBLIC_BASE_URL: "https://media.voxer.pro/",
    NEXT_PUBLIC_SOCKET_URL: "https://socket.voxer.pro",
  };

  it("production: no unsafe-eval, with frame-ancestors, object-src none and upgrade", () => {
    const csp = buildContentSecurityPolicy(prodEnv);
    expect(directive(csp, "script-src")).not.toContain("'unsafe-eval'");
    expect(directive(csp, "frame-ancestors")).toEqual(["'self'"]);
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(csp.split("; ")).toContain("upgrade-insecure-requests");
  });

  it("production: allows bucket media, signed S3 uploads and the socket over https/wss", () => {
    const csp = buildContentSecurityPolicy(prodEnv);
    expect(directive(csp, "img-src")).toContain("https://media.voxer.pro");
    expect(directive(csp, "media-src")).toContain("https://media.voxer.pro");
    expect(directive(csp, "connect-src")).toEqual(
      expect.arrayContaining([
        "https://*.r2.cloudflarestorage.com",
        "https://socket.voxer.pro",
        "wss://socket.voxer.pro",
      ]),
    );
    expect(directive(csp, "frame-src")).toContain("https://www.youtube-nocookie.com");
  });

  it("allows the Cloudflare Turnstile script and iframe", () => {
    const csp = buildContentSecurityPolicy(prodEnv);
    expect(directive(csp, "script-src")).toContain("https://challenges.cloudflare.com");
    expect(directive(csp, "frame-src")).toContain("https://challenges.cloudflare.com");
  });

  it("adds no generic wildcard origins (https: / *)", () => {
    const csp = buildContentSecurityPolicy(prodEnv);
    for (const name of ["img-src", "media-src", "connect-src", "script-src"]) {
      expect(directive(csp, name)).not.toContain("https:");
      expect(directive(csp, name)).not.toContain("*");
    }
  });

  it("development: unsafe-eval, local socket by default and no upgrade-insecure-requests", () => {
    const csp = buildContentSecurityPolicy({ NODE_ENV: "development" });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toEqual(
      expect.arrayContaining(["http://127.0.0.1:3001", "ws://127.0.0.1:3001", "ws:"]),
    );
    expect(csp.split("; ")).not.toContain("upgrade-insecure-requests");
  });

  it("lets the MSW demo worker fetch YouTube thumbnails, only with mocks", () => {
    const demo = buildContentSecurityPolicy({
      NODE_ENV: "development",
      NEXT_PUBLIC_USE_MOCKS: "true",
    });
    expect(directive(demo, "connect-src")).toContain("https://img.youtube.com");
    expect(directive(buildContentSecurityPolicy(prodEnv), "connect-src")).not.toContain(
      "https://img.youtube.com",
    );
  });

  it("ignores invalid environment URLs", () => {
    const csp = buildContentSecurityPolicy({
      NODE_ENV: "production",
      NEXT_PUBLIC_R2_PUBLIC_BASE_URL: "no es una url",
    });
    expect(directive(csp, "img-src")).not.toContain("no");
  });
});

describe("contentSecurityPolicyHeaderName", () => {
  it("enforces by default and switches to report-only only with CSP_REPORT_ONLY=1", () => {
    expect(contentSecurityPolicyHeaderName({})).toBe("Content-Security-Policy");
    expect(contentSecurityPolicyHeaderName({ CSP_REPORT_ONLY: "1" })).toBe(
      "Content-Security-Policy-Report-Only",
    );
  });
});

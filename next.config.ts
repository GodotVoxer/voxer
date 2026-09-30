import type { NextConfig } from "next";
import { NEXT_IMAGE_LOCAL_PATHNAMES } from "./lib/media/nextImageLocalPaths";
import { assertNoProdMocksInBuild } from "./mocks/assertNoProdMocks";
import {
  buildContentSecurityPolicy,
  contentSecurityPolicyHeaderName,
} from "./lib/http/contentSecurityPolicy";
import { API_NO_STORE_SOURCE, apiNoStoreHeaders } from "./lib/http/cacheHeaders";

assertNoProdMocksInBuild();

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: contentSecurityPolicyHeaderName(),
    value: buildContentSecurityPolicy(),
  },
];
const nextConfig: NextConfig = {
  // Only the Docker image needs the standalone output.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // Never reuse CSS of another revision from a restored build cache.
    turbopackFileSystemCacheForBuild: false,
    // Keep App Router segments in the client cache while navigating (fewer blank screens).
    staleTimes: {
      dynamic: 180,
      static: 180,
    },
  },
  serverExternalPackages: ["ffmpeg-static", "web-push"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: API_NO_STORE_SOURCE,
        headers: apiNoStoreHeaders(),
      },
    ];
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    localPatterns: [...NEXT_IMAGE_LOCAL_PATHNAMES].map((pathname) => ({ pathname })),
    remotePatterns: (() => {
      const patterns: Array<{
        protocol: "https";
        hostname: string;
        pathname: string;
      }> = [
        {
          protocol: "https",
          hostname: "img.youtube.com",
          pathname: "/vi/**",
        },
      ];
      const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
      if (r2Base) {
        try {
          const u = new URL(r2Base);
          patterns.push({
            protocol: "https",
            hostname: u.hostname,
            pathname: "/**",
          });
        } catch {
          /* invalid URL: no remote pattern */
        }
      }
      return patterns;
    })(),
  },
};
export default nextConfig;

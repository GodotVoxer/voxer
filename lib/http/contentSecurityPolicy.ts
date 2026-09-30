type CspEnv = Readonly<Record<string, string | undefined>>;

const originOf = (raw: string | undefined): string | null => {
  const t = raw?.trim();
  if (!t) return null;
  try {
    return new URL(t).origin;
  } catch {
    return null;
  }
};

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

const webSocketOriginOf = (httpOrigin: string): string => httpOrigin.replace(/^http/, "ws");

/**
 * Enforced without nonces on purpose: nonces force dynamic rendering on every page (no CDN cache).
 * `'unsafe-inline'` scripts cover Next's inline bootstrap; `'unsafe-eval'` is development only.
 */
export const buildContentSecurityPolicy = (env: CspEnv = process.env): string => {
  const isDev = env.NODE_ENV === "development";
  const r2PublicOrigin = originOf(env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL);
  const socketOrigin =
    originOf(env.NEXT_PUBLIC_SOCKET_URL) ?? (isDev ? "http://127.0.0.1:3001" : null);

  const uploadedMediaOrigins = r2PublicOrigin ? [r2PublicOrigin] : [];

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      ["'self'", "'unsafe-inline'", TURNSTILE_ORIGIN, ...(isDev ? ["'unsafe-eval'"] : [])],
    ],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https://img.youtube.com", ...uploadedMediaOrigins]],
    ["media-src", ["'self'", "blob:", ...uploadedMediaOrigins]],
    [
      "connect-src",
      [
        "'self'",
        // Direct PUT to a signed URL (R2's S3 endpoint, with or without the bucket as subdomain).
        "https://*.r2.cloudflarestorage.com",
        ...(r2PublicOrigin ? [r2PublicOrigin] : []),
        ...(socketOrigin ? [socketOrigin, webSocketOriginOf(socketOrigin)] : []),
        ...(isDev ? ["ws:"] : []),
      ],
    ],
    [
      "frame-src",
      ["https://www.youtube.com", "https://www.youtube-nocookie.com", TURNSTILE_ORIGIN],
    ],
    ["font-src", ["'self'", "data:"]],
    ["worker-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];

  const policy = directives.map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
};

/** `CSP_REPORT_ONLY=1` switches back to report-only after a production breakage without a code change. */
export const contentSecurityPolicyHeaderName = (env: CspEnv = process.env): string =>
  env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

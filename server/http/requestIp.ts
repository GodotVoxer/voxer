export type TrustedProxy = "cloudflare" | "xff" | "none";

const TRUSTED_PROXIES: readonly TrustedProxy[] = ["cloudflare", "xff", "none"];

const lastForwardedIp = (headerValue: string | null): string | null => {
  const parts = headerValue
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts?.length) return null;
  return parts[parts.length - 1] ?? null;
};

type TrustedProxyEnv = Readonly<Record<string, string | undefined>>;

export const resolveTrustedProxy = (env: TrustedProxyEnv = process.env): TrustedProxy => {
  const raw = env.TRUSTED_PROXY?.trim().toLowerCase();
  if (raw && (TRUSTED_PROXIES as readonly string[]).includes(raw)) return raw as TrustedProxy;
  return "none";
};

let warnedUntrustedProduction = false;

/**
 * Only the header set by the proxy actually in front of the app is trusted; any other header is
 * client-controlled and would let clients dodge rate limits and network bans.
 */
export const requestClientIp = (
  req: Request,
  proxy: TrustedProxy = resolveTrustedProxy(),
): string => {
  switch (proxy) {
    case "cloudflare":
      return req.headers.get("cf-connecting-ip")?.trim() || "local";
    case "xff":
      return lastForwardedIp(req.headers.get("x-forwarded-for")) ?? "local";
    case "none":
      if (process.env.NODE_ENV === "production" && !warnedUntrustedProduction) {
        warnedUntrustedProduction = true;
        console.error(
          "[requestIp] TRUSTED_PROXY is not set in production: every request shares the 'local' key.",
        );
      }
      return "local";
  }
};

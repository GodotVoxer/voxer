import { getSitePublicOriginUrl, originFromForwardedHeaders } from "@/lib/http/sitePublicOrigin";

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const collectAllowedSiteOrigins = (): Set<string> => {
  const allowed = new Set<string>();
  const site = getSitePublicOriginUrl();
  if (site) allowed.add(site.origin);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }
  return allowed;
};

const originFromReferer = (referer: string | null): string | null => {
  if (!referer?.trim()) return null;
  return normalizeOrigin(referer);
};

export const isAllowedApiMutationOrigin = (input: {
  origin: string | null;
  referer: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  secFetchSite?: string | null;
}): boolean => {
  // Browsers reliably flag requests started by another site; those are never legitimate here.
  if (input.secFetchSite?.trim().toLowerCase() === "cross-site") return false;

  const allowed = collectAllowedSiteOrigins();
  const forwarded = originFromForwardedHeaders(input.forwardedHost, input.forwardedProto);
  if (forwarded) allowed.add(forwarded.origin);

  const origin = input.origin ? normalizeOrigin(input.origin) : null;
  if (origin && allowed.has(origin)) return true;

  const fromReferer = originFromReferer(input.referer);
  if (fromReferer && allowed.has(fromReferer)) return true;

  if (process.env.NODE_ENV !== "production" && !origin && !fromReferer) {
    return true;
  }

  return false;
};

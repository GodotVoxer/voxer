import { resolveTrustedProxy } from "@/server/http/requestIp";

/** ISO 3166-1 alpha-2 country from the edge; only trusted when Cloudflare is the proxy in front. */
export const countryCodeFromRequestHeaders = (req: Request): string | null => {
  if (resolveTrustedProxy() !== "cloudflare") return null;
  const cf = req.headers.get("cf-ipcountry")?.trim().toUpperCase();
  if (cf && /^[A-Z]{2}$/.test(cf) && cf !== "XX") return cf;
  return null;
};

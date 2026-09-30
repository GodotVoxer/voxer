import { headers } from "next/headers";
import { getSitePublicOriginUrl, originFromForwardedHeaders } from "@/lib/http/sitePublicOrigin";

export const resolveSiteOriginUrl = async (): Promise<URL | undefined> => {
  const h = await headers();
  const fromRequest = originFromForwardedHeaders(
    h.get("x-forwarded-host"),
    h.get("x-forwarded-proto"),
  );
  return fromRequest ?? getSitePublicOriginUrl();
};

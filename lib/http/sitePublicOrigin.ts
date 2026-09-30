export const getSitePublicOriginUrl = (): URL | undefined => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!explicit) return undefined;
  try {
    return new URL(explicit);
  } catch {
    return undefined;
  }
};

export const originFromForwardedHeaders = (
  forwardedHost: string | null | undefined,
  forwardedProto: string | null | undefined,
): URL | undefined => {
  const host = forwardedHost?.split(",")[0]?.trim();
  if (!host) return undefined;
  const proto = forwardedProto?.split(",")[0]?.trim() || "https";
  try {
    return new URL(`${proto}://${host}`);
  } catch {
    return undefined;
  }
};

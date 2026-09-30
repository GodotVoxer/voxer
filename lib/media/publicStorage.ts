/** Public bucket URLs: safe on both client and server, since the base URL is public. */
/** Public HTTPS origin of the bucket (`NEXT_PUBLIC_R2_PUBLIC_BASE_URL`), or null when unset. */
export const r2PublicOrigin = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

export const r2PublicUrlForKey = (key: string): string => {
  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_R2_PUBLIC_BASE_URL is not set");
  }
  const base = raw.replace(/\/+$/, "");
  const k = key.replace(/^\/+/, "");
  return `${base}/${k}`;
};

/** Inverse of `r2PublicUrlForKey`: null when the URL is not under the public base. */
export const r2KeyForPublicUrl = (url: string): string | null => {
  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  if (!raw) return null;
  const prefix = `${raw.replace(/\/+$/, "")}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return key && !key.includes("?") && !key.includes("#") ? key : null;
};

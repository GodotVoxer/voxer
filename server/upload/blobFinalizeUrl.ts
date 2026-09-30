import { isHttpsTrustedPublicUploadAssetUrl } from "@/server/upload/trustedUploadAssetUrl";

export type BlobFinalizeKind = "image" | "video";

/**
 * Direct uploads land here, still carrying their original metadata, until finalize publishes a
 * stripped copy under `uploads/`. The public domain must not serve this prefix.
 */
const DIRECT_UPLOAD_PREFIX = "incoming/";

export const directUploadKey = (id: string, ext: string, now = new Date()): string => {
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${DIRECT_UPLOAD_PREFIX}${y}/${m}/${id}.${ext}`;
};

const PATH_RE: Record<BlobFinalizeKind, RegExp> = {
  image: /^incoming\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(gif|jpe?g|png|webp)$/i,
  video: /^incoming\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(mp4|webm)$/i,
};

/** Object key of a direct upload awaiting finalize, or null when the URL is not one. */
export const blobPathnameFromFinalizeUrl = (
  rawUrl: string,
  kind: BlobFinalizeKind,
): string | null => {
  try {
    const u = new URL(rawUrl);
    if (!isHttpsTrustedPublicUploadAssetUrl(u)) return null;
    const path = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    return PATH_RE[kind].test(path) ? path : null;
  } catch {
    return null;
  }
};

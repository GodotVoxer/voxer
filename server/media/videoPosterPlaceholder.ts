import { isManagedPublicUploadUrl } from "@/server/media/uploadUrls";

/** Generic thumbnail served by the site when a video has no frame of its own. */
export const VIDEO_POSTER_PLACEHOLDER_URL = "/video-thumb.svg";

/**
 * Poster accepted when publishing: a managed upload or the site placeholder. The placeholder is
 * excluded from `isManagedPublicUploadUrl` on purpose (it is shared, so the sweep cannot count it
 * as a reference), yet the server itself returns it when ffmpeg yields no frame.
 */
export const isUsableVideoPosterUrl = (raw: string | null | undefined): boolean => {
  const t = raw?.trim() ?? "";
  if (!t) return false;
  return t === VIDEO_POSTER_PLACEHOLDER_URL || isManagedPublicUploadUrl(t);
};

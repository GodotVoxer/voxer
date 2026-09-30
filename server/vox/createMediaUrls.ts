import { isManagedPublicUploadUrl } from "@/server/media/uploadUrls";
import { isUsableVideoPosterUrl } from "@/server/media/videoPosterPlaceholder";

export const validateNonYoutubeVoxMediaUrls = (
  mediaUrl: string | null,
  thumbnailUrl: string | null,
): { ok: true } | { ok: false; message: string } => {
  if (!mediaUrl?.trim() || !thumbnailUrl?.trim()) {
    return { ok: false, message: "Faltan URLs de multimedia." };
  }
  // The thumbnail may also be the site placeholder the server returns when ffmpeg finds no frame.
  if (!isManagedPublicUploadUrl(mediaUrl) || !isUsableVideoPosterUrl(thumbnailUrl)) {
    return {
      ok: false,
      message:
        "Las URLs de multimedia tienen que provenir de una subida válida en el sitio (no enlaces externos arbitrarios).",
    };
  }
  return { ok: true };
};

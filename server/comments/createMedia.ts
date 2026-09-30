import { extractYoutubeVideoId } from "@/lib/media/youtube";
import { isManagedPublicUploadUrl } from "@/server/media/uploadUrls";

export type ResolveCommentMediaInput = {
  imageUrl?: string | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
};

export type ResolveCommentMediaResult =
  | { ok: true; imageUrl: string | null; videoUrl: string | null }
  | { ok: false; message: string };

const requireManagedUploadUrl = (
  raw: string,
  label: string,
): { ok: true; url: string } | { ok: false; message: string } => {
  const t = raw.trim();
  if (!isManagedPublicUploadUrl(t)) {
    return {
      ok: false,
      message: `${label} tiene que provenir de una subida válida en el sitio.`,
    };
  }
  return { ok: true, url: t };
};

export const resolveCommentMediaForCreate = (
  input: ResolveCommentMediaInput,
): ResolveCommentMediaResult => {
  const yt = input.youtubeUrl?.trim() || "";
  const img = input.imageUrl?.trim() || "";
  const vid = input.videoUrl?.trim() || "";
  const mediaCount = (yt ? 1 : 0) + (img ? 1 : 0) + (vid ? 1 : 0);
  if (mediaCount > 1) {
    return { ok: false, message: "Solo se admite un adjunto" };
  }
  if (yt) {
    const id = extractYoutubeVideoId(yt);
    if (!id) {
      return { ok: false, message: "URL o ID de YouTube inválido" };
    }
    return { ok: true, imageUrl: null, videoUrl: `https://www.youtube.com/embed/${id}` };
  }
  if (img) {
    const checked = requireManagedUploadUrl(img, "La imagen");
    if (!checked.ok) return checked;
    return { ok: true, imageUrl: checked.url, videoUrl: null };
  }
  if (vid) {
    const ytFromVid = extractYoutubeVideoId(vid);
    if (ytFromVid) {
      return {
        ok: true,
        imageUrl: null,
        videoUrl: `https://www.youtube.com/embed/${ytFromVid}`,
      };
    }
    const checked = requireManagedUploadUrl(vid, "El video");
    if (!checked.ok) return checked;
    return { ok: true, imageUrl: null, videoUrl: checked.url };
  }
  return { ok: true, imageUrl: null, videoUrl: null };
};

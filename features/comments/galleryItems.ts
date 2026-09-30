import type { CommentPublic } from "@/lib/vox/types";
import { extractYoutubeVideoId, isYoutubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/media/youtube";

export type CommentGalleryItem =
  | { kind: "image"; url: string }
  | { kind: "video_upload"; url: string; posterUrl: string | null; animatedImage: boolean }
  | { kind: "video_youtube"; openUrl: string; thumbnailUrl: string };

export const collectCommentGalleryItems = (comments: CommentPublic[]): CommentGalleryItem[] => {
  const seenImage = new Set<string>();
  const seenVideo = new Set<string>();
  const out: CommentGalleryItem[] = [];

  for (const c of comments) {
    const img = c.imageUrl?.trim();
    if (img && !seenImage.has(img)) {
      seenImage.add(img);
      out.push({ kind: "image", url: img });
    }

    const vid = c.videoUrl?.trim();
    if (!vid || seenVideo.has(vid)) continue;
    seenVideo.add(vid);

    if (isYoutubeEmbedUrl(vid)) {
      const ytId = extractYoutubeVideoId(vid);
      if (ytId) {
        out.push({
          kind: "video_youtube",
          openUrl: `https://www.youtube.com/watch?v=${ytId}`,
          thumbnailUrl: youtubeThumbnailUrl(ytId, "hq"),
        });
      }
    } else {
      out.push({
        kind: "video_upload",
        url: vid,
        posterUrl: c.videoPosterUrl?.trim() || null,
        animatedImage: Boolean(c.animatedImage),
      });
    }
  }

  return out;
};

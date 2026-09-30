import { extractYoutubeVideoId } from "@/lib/media/youtube";
export type ParsedMediaLink =
  | {
      kind: "YOUTUBE";
      videoId: string;
    }
  | {
      kind: "IMAGE";
      url: string;
    };
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i;
export const parseMediaLink = (raw: string): ParsedMediaLink | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const yt = extractYoutubeVideoId(trimmed);
  if (yt) return { kind: "YOUTUBE", videoId: yt };
  if (!/^https?:\/\//i.test(trimmed)) return null;
  const lower = trimmed.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return null;
  }
  if (IMAGE_EXT.test(trimmed)) {
    return { kind: "IMAGE", url: trimmed };
  }
  return { kind: "IMAGE", url: trimmed };
};

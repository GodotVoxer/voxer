import { extractYoutubeVideoId } from "@/lib/media/youtube";

export const YOUTUBE_EMBED_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-presentation allow-popups";

export const youtubeNocookieEmbedSrc = (videoId: string): string =>
  `https://www.youtube-nocookie.com/embed/${videoId}`;

export const youtubeEmbedSrcFromUrl = (url: string): string | null => {
  const id = extractYoutubeVideoId(url);
  return id ? youtubeNocookieEmbedSrc(id) : null;
};

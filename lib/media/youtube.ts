const YOUTUBE_ID = "[a-zA-Z0-9_-]{11}";
const YOUTUBE_PATTERNS = [
  new RegExp(
    `(?:youtube\\.com|youtube-nocookie\\.com)/(?:watch\\?(?:[^#]*&)?v=|embed/|shorts/|live/|v/)(${YOUTUBE_ID})`,
    "i",
  ),
  new RegExp(`youtu\\.be/(${YOUTUBE_ID})`, "i"),
  new RegExp(`^(${YOUTUBE_ID})$`),
];
export const extractYoutubeVideoId = (input: string): string | null => {
  const trimmed = input.trim();
  for (const re of YOUTUBE_PATTERNS) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
};
export const youtubeThumbnailUrl = (videoId: string, quality: "hq" | "max" = "hq"): string => {
  return quality === "max"
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

export const isYoutubeEmbedUrl = (url: string): boolean => {
  const t = url.trim();
  return /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[a-zA-Z0-9_-]{11}(\?|#|$)/i.test(
    t,
  );
};

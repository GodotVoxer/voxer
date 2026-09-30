/**
 * Animated cover for the grid, or `null`. Two cases: an old GIF stored as an `IMAGE`, and a GIF
 * converted to MP4 (`animatedImage`) stored as `UPLOADED_VIDEO`.
 */
export const coverGifUrlFromVoxMedia = (
  mediaType: string,
  mediaUrl: string | null,
  animatedImage = false,
): string | null => {
  const url = mediaUrl?.trim();
  if (!url) return null;
  if (animatedImage) return url;
  if (mediaType !== "IMAGE") return null;
  const path = url.split(/[?#]/)[0]?.toLowerCase() ?? "";
  if (!path.endsWith(".gif")) return null;
  return url;
};

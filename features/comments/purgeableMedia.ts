import { isYoutubeEmbedUrl } from "@/lib/media/youtube";

/** Has a file to purge; a YouTube embed is not hosted here. */
export const commentHasPurgeableMedia = (comment: {
  imageUrl: string | null;
  videoUrl: string | null;
}): boolean => {
  if (comment.imageUrl?.trim()) return true;
  const video = comment.videoUrl?.trim();
  return Boolean(video && !isYoutubeEmbedUrl(video));
};

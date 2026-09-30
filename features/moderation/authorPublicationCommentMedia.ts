export const moderationAuthorPublicationCommentThumbSrc = (input: {
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
}): string | null => {
  const image = input.imageUrl?.trim();
  if (image) return image;
  const poster = input.videoPosterUrl?.trim();
  if (poster) return poster;
  if (input.videoUrl?.trim()) return "/video-thumb.svg";
  return null;
};

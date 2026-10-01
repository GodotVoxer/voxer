export const YOUTUBE_EMBED_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-presentation allow-popups";

// The iframe only mounts after a tap on the preview, so the player should start right away.
export const youtubeNocookieEmbedSrc = (videoId: string): string =>
  `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;

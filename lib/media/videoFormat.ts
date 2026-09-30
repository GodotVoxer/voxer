export type VideoContainer = "mp4" | "webm";
export type VideoMimeType = "video/mp4" | "video/webm";

export const VIDEO_MIME_TYPES: readonly VideoMimeType[] = ["video/mp4", "video/webm"];

/** Accepts a MIME type, a file name or an extension; anything that is not WebM is treated as MP4. */
export const videoContainerOf = (...hints: (string | null | undefined)[]): VideoContainer =>
  hints.some((h) => /(^|[/.])webm$/i.test(h?.trim().split(";")[0] ?? "")) ? "webm" : "mp4";

export const videoMimeOf = (container: VideoContainer): VideoMimeType =>
  container === "webm" ? "video/webm" : "video/mp4";

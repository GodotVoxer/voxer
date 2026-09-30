export const UPLOAD_MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const UPLOAD_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Longest side after processing (no "long cat" images). */
export const UPLOAD_IMAGE_MAX_SIDE_PX = 8192;
/** Resized in the browser before upload: fewer bytes and less server work. */
export const CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX = 2048;
/** Smaller files that already fit the max side are uploaded untouched. */
export const CLIENT_IMAGE_SKIP_PROCESS_MAX_BYTES = 1_600_000;
/** Rejected without trying to resize (DoS protection). */
export const UPLOAD_IMAGE_REJECT_IF_SIDE_GT_PX = 32000;
/**
 * Decoded pixels allowed for a still image (width x height): a one-color 16000x16000 PNG weighs a
 * few KB and takes about 1 GB once decoded. Roomy for 50 MP photos; clients already resize.
 */
export const UPLOAD_IMAGE_MAX_INPUT_PIXELS = 60_000_000;

/**
 * Animated images (GIF/WebP) decode every frame at once, but their profile is the opposite of a
 * photo: a tiny canvas with hundreds of frames. Each axis is capped separately:
 *
 * - `FRAME_PIXELS`: one frame's canvas, the actual decompression bomb.
 * - `FRAMES`: how many frames, which tells a meme from a video disguised as a GIF.
 * - `INPUT_PIXELS`: the total, which sets peak memory (about 4 bytes per pixel).
 */
export const UPLOAD_ANIMATION_MAX_FRAME_PIXELS = 4_000_000;
export const UPLOAD_ANIMATION_MAX_FRAMES = 1_500;
export const UPLOAD_ANIMATION_MAX_INPUT_PIXELS = 100_000_000;

/** Which cap was exceeded: a huge canvas and a long animation ask different things of the user. */
export type ImageLimitReason = "dimensions" | "animation";

const UPLOAD_IMAGE_DIMENSIONS_ERROR_ES = "La imagen tiene dimensiones demasiado grandes.";
const UPLOAD_ANIMATION_LIMIT_ERROR_ES =
  "La animación tiene demasiados fotogramas. Probá con una versión más corta o con menos cuadros por segundo.";

export const uploadImageLimitMessageEs = (reason: ImageLimitReason): string =>
  reason === "animation" ? UPLOAD_ANIMATION_LIMIT_ERROR_ES : UPLOAD_IMAGE_DIMENSIONS_ERROR_ES;

/** Below common reverse-proxy body limits, so a multipart `/api/upload` fits with margin. */
export const HOSTING_MULTIPART_BODY_SAFE_MAX_BYTES = 4 * 1024 * 1024;

export const uploadMaxVideoMb = (): number => Math.round(UPLOAD_MAX_VIDEO_BYTES / (1024 * 1024));
export const uploadMaxImageMb = (): number => Math.round(UPLOAD_MAX_IMAGE_BYTES / (1024 * 1024));

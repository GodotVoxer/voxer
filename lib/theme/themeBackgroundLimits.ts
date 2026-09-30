import { DAY_MS } from "@/lib/time";

/** File size `POST /api/theme/background-images` accepts; clients shrink images before uploading. */
export const THEME_BG_UPLOAD_MAX_BYTES = 3.5 * 1024 * 1024;
/** Multipart body cap, below common reverse-proxy limits. */
export const THEME_BG_REQUEST_MAX_BYTES = 4 * 1024 * 1024;
export const THEME_BG_ASSETS_PER_USER_MAX = 5;
export const THEME_BG_TOTAL_BYTES_MAX = 12 * 1024 * 1024;
export const THEME_BG_UPLOADS_PER_HOUR = 10;

export const THEME_BG_INPUT_MAX_SIDE_PX = 8000;
/** Against decompression bombs: rejected before decoding. */
export const THEME_BG_INPUT_PIXELS_MAX = 40_000_000;
export const THEME_BG_FULL_SIDE_PX = 2560;
export const THEME_BG_SMALL_SIDE_PX = 1280;
export const THEME_BG_OUTPUT_MAX_BYTES = 1.5 * 1024 * 1024;

/** An uploaded image no theme uses yet may be in an open editor. */
export const THEME_BG_ORPHAN_GRACE_MS = DAY_MS;
export const THEME_BG_ORPHAN_PURGE_BATCH_MAX = 20;

import { THEME_BG_UPLOADS_PER_HOUR } from "@/lib/theme/themeBackgroundLimits";
import { HOUR_MS, MINUTE_MS } from "@/lib/time";
import { rateLimit } from "@/server/http/rateLimit";

/** `[max requests, window]` per name; the counter key is `<name>:<subject>`. */
const LIMITS = {
  "auth:login:ip": [15, MINUTE_MS],
  "auth:login:user": [10, MINUTE_MS],
  "auth:register:ip": [5, MINUTE_MS],
  report: [30, MINUTE_MS],
  comment: [60, MINUTE_MS],
  "vox:search": [40, MINUTE_MS],
  "vox:create": [20, MINUTE_MS],
  upload: [40, MINUTE_MS],
  "upload-blob-token": [40, MINUTE_MS],
  "upload-blob-finalize": [40, MINUTE_MS],
  "upload-blob-video-finalize": [40, MINUTE_MS],
  "theme:bg:user": [THEME_BG_UPLOADS_PER_HOUR, HOUR_MS],
  "theme:write:user": [60, 10 * MINUTE_MS],
} as const satisfies Record<string, readonly [number, number]>;

export type RateLimitName = keyof typeof LIMITS;

/** `subject` is whatever the limit is per: a client IP, a username or a user id. */
export const withinRateLimit = (name: RateLimitName, subject: string): Promise<boolean> => {
  const [max, windowMs] = LIMITS[name];
  return rateLimit(`${name}:${subject}`, max, windowMs);
};

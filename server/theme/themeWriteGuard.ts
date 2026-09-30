import { withinRateLimit } from "@/server/http/rateLimits";

/** One quota shared by every theme write of a user: preference and custom themes alike. */
export const allowThemeWrite = (userId: string): Promise<boolean> =>
  withinRateLimit("theme:write:user", userId);

export const THEME_PREFERENCE_BODY_MAX_BYTES = 1024;
export const CUSTOM_THEME_BODY_MAX_BYTES = 8 * 1024;

/**
 * Without `Content-Length` (chunked body) there is no way to bound what `json()` or `formData()`
 * reads, so it is rejected; browsers always send it for JSON and FormData.
 */
export const isBodyTooLarge = (req: Request, maxBytes: number): boolean => {
  const raw = req.headers.get("content-length");
  if (raw === null || !/^\d+$/.test(raw.trim())) return true;
  return Number(raw) > maxBytes;
};

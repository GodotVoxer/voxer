import { r2KeyForPublicUrl, r2PublicOrigin } from "@/lib/media/publicStorage";

export const THEME_BG_KEY_PREFIX = "theme-bg/";
/** Server-generated keys: a random UUID (no user id) and an optional `-sm` variant. */
export const THEME_BG_OBJECT_KEY_RE =
  /^theme-bg\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(-sm)?\.webp$/;

const LOCAL_UPLOADS_PREFIX = "/uploads/";
const URL_MAX_LENGTH = 500;

/**
 * The only background image URL that reaches `url("...")`: the public bucket base (or `/uploads/`
 * locally) plus a server key. No quotes, parentheses, spaces, query or fragment by construction.
 */
export const isSafeThemeImageUrl = (raw: unknown): raw is string => {
  if (typeof raw !== "string" || raw.length > URL_MAX_LENGTH) return false;
  if (raw.startsWith(LOCAL_UPLOADS_PREFIX)) {
    return THEME_BG_OBJECT_KEY_RE.test(raw.slice(LOCAL_UPLOADS_PREFIX.length));
  }
  if (!r2PublicOrigin()?.startsWith("https://")) return false;
  const key = r2KeyForPublicUrl(raw);
  return key !== null && THEME_BG_OBJECT_KEY_RE.test(key);
};

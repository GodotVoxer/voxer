const COMMENT_PUBLIC_TAG_RE = /^[0-9A-Z]{8}$/;

export const normalizeCommentPublicTagFragment = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }
  const upper = decoded.toUpperCase();
  return COMMENT_PUBLIC_TAG_RE.test(upper) ? upper : null;
};

export const parseCommentPublicTagFromLocationHash = (hash: string): string | null => {
  if (!hash || hash === "#") return null;
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  return normalizeCommentPublicTagFragment(fragment);
};

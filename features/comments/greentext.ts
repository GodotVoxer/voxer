import { COMMENT_LINK_FULL_TOKEN_RE, normalizeCommentLinkHref } from "@/lib/comments/bodyLinks";

const REPLY_TAG_AT_LINE_START = /^>>[A-Z0-9]{8}/;

/** A line starting with `>` that is neither just a `>example.com` link token nor a `>>TAG` reply. */
export const isGreentextLine = (line: string): boolean => {
  const t = line.trimStart();
  if (t.length === 0 || !t.startsWith(">")) return false;
  if (COMMENT_LINK_FULL_TOKEN_RE.test(t) && normalizeCommentLinkHref(t)) {
    return false;
  }
  if (REPLY_TAG_AT_LINE_START.test(t)) return false;
  return true;
};

/** One capture group for `split`; the host needs a dot, `localhost` or IPv6. */
const COMMENT_LINK_HEAD_SOURCE = String.raw`(?<![>])(?:>(?:https?:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?)`;

export const COMMENT_LINK_TOKEN_RE = new RegExp(`(${COMMENT_LINK_HEAD_SOURCE})`, "g");

export const COMMENT_LINK_FULL_TOKEN_RE = new RegExp(`^${COMMENT_LINK_HEAD_SOURCE}$`);

const hostnameLooksLikePublicUrl = (hostname: string): boolean => {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return false;
  if (h.includes(".")) return true;
  if (h.includes(":")) return true;
  return false;
};

export const normalizeCommentLinkHref = (tokenWithGt: string): string | null => {
  if (!tokenWithGt.startsWith(">")) return null;
  const rest = tokenWithGt.slice(1).trim();
  if (!rest) return null;
  const lower = rest.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return null;
  const href =
    lower.startsWith("http://") || lower.startsWith("https://") ? rest : `https://${rest}`;
  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!hostnameLooksLikePublicUrl(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
};

const withoutWww = (host: string): string => (host.startsWith("www.") ? host.slice(4) : host);

/**
 * Relative path when a comment link points to this site, else `null`. Such links navigate in-app:
 * a new tab loses the store and caches, and in the Android WebView `target="_blank"` goes nowhere.
 * The host is compared on click, not on render, so server and client HTML match.
 */
export const internalSitePathFromHref = (href: string, currentHost: string): string | null => {
  if (!currentHost) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (withoutWww(url.host.toLowerCase()) !== withoutWww(currentHost.toLowerCase())) return null;
  const path = `${url.pathname}${url.search}${url.hash}`;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
};

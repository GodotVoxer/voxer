const UNREAD_PREFIX_RE = /^\(\d+\+?\) /;

const DOCUMENT_TITLE_UNREAD_MAX = 99;

export const stripUnreadCountFromTitle = (title: string): string =>
  title.replace(UNREAD_PREFIX_RE, "");

/** `(5) Voxer | ...`; without notifications the plain title. Idempotent on its own output. */
export const titleWithUnreadCount = (title: string, unread: number): string => {
  const base = stripUnreadCountFromTitle(title);
  if (!Number.isFinite(unread) || unread <= 0) return base;
  const label =
    unread > DOCUMENT_TITLE_UNREAD_MAX
      ? `${DOCUMENT_TITLE_UNREAD_MAX}+`
      : String(Math.floor(unread));
  return `(${label}) ${base}`;
};

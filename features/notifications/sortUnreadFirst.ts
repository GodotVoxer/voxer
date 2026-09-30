export type ReadAtRow = { readAt: string | null };

/** Stable sort: unread (`readAt == null`) first; each group keeps the server's date order. */
export const sortUnreadFirst = <T extends ReadAtRow>(items: T[]): T[] => {
  const unread: T[] = [];
  const read: T[] = [];
  for (const item of items) {
    if (item.readAt == null) unread.push(item);
    else read.push(item);
  }
  return [...unread, ...read];
};

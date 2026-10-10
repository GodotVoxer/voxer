/** What the last mark-read request of the open vox was sent with, and what the server left unread. */
export type VoxReadAttempt = {
  voxId: string;
  unreadNotifications: number;
  seenThrough: string | null;
  /** Unread notifications of the vox the server did not mark: their comment is not on screen yet. */
  remaining: number;
};

/**
 * `createdAt` of the newest comment on screen, the limit of what the reader has seen. Comments waiting
 * behind the "+N" badge are not in the list, so their notifications stay unread until revealed.
 */
export const newestSeenCommentAt = (comments: readonly { createdAt: string }[]): string | null => {
  let newest: string | null = null;
  // All are `toISOString()` output, which sorts as text.
  for (const c of comments) if (newest === null || c.createdAt > newest) newest = c.createdAt;
  return newest;
};

/**
 * Whether to ask the server to mark as read the notifications of the vox being viewed. The unread
 * count is global, so a change in it may or may not concern this vox: the request goes out and the
 * server answers how many it left. There is deliberately no once-per-vox guard: live notifications
 * keep arriving while the vox is open.
 */
export const shouldMarkVoxNotificationsRead = (input: {
  hasSession: boolean;
  unreadNotifications: number;
  voxId: string;
  /** The thread is loaded and the document is visible: what is in the list can be seen. */
  threadOnScreen: boolean;
  seenThrough: string | null;
  /** A request is in flight; without this a count change would fire another in parallel. */
  requestInFlight: boolean;
  lastAttempt: VoxReadAttempt | null;
}): boolean => {
  if (!input.hasSession) return false;
  if (input.unreadNotifications <= 0) return false;
  if (input.voxId.length === 0) return false;
  if (!input.threadOnScreen) return false;
  if (input.requestInFlight) return false;
  const last = input.lastAttempt;
  if (!last || last.voxId !== input.voxId) return true;
  if (last.unreadNotifications !== input.unreadNotifications) return true;
  // Same count: only what the server left unread can change, and only by showing more comments.
  return last.remaining > 0 && last.seenThrough !== input.seenThrough;
};

/** Nothing of this vox is left to see: its system notifications can go too. */
export const voxNotificationsCaughtUp = (input: {
  unreadNotifications: number;
  voxId: string;
  lastAttempt: VoxReadAttempt | null;
}): boolean => {
  if (input.unreadNotifications <= 0) return true;
  const last = input.lastAttempt;
  return (
    last !== null &&
    last.voxId === input.voxId &&
    last.unreadNotifications === input.unreadNotifications &&
    last.remaining === 0
  );
};

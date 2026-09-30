/**
 * Whether to mark the notifications of the vox being viewed as read. The unread count is global:
 * at 0 nothing can be marked, above 0 the request goes out and the server may answer `marked: 0`.
 * There is deliberately no once-per-vox guard: live notifications keep arriving while the vox is open.
 */
export const shouldMarkVoxNotificationsRead = (input: {
  hasSession: boolean;
  unreadNotifications: number;
  voxId: string;
  /** A request is in flight; without this a count change would fire another in parallel. */
  requestInFlight: boolean;
}): boolean => {
  if (!input.hasSession) return false;
  if (input.unreadNotifications <= 0) return false;
  if (input.voxId.length === 0) return false;
  return !input.requestInFlight;
};

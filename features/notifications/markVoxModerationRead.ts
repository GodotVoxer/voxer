export const shouldMarkVoxModerationNotificationsRead = (input: {
  cameFromReportPush: boolean;
  isStaff: boolean;
  unreadModerationNotifications: number;
  voxId: string;
  alreadyAttempted: boolean;
}): boolean => {
  if (!input.cameFromReportPush) return false;
  if (!input.isStaff) return false;
  if (input.unreadModerationNotifications <= 0) return false;
  if (input.voxId.length === 0) return false;
  return !input.alreadyAttempted;
};

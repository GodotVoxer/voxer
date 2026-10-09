import type { StaffNotificationRow } from "@/features/moderation/api";
import type { UserNotificationPanelRow } from "@/features/notifications/panelCacheStore";

export type NotificationPanelVirtualRow = {
  id: string;
  readAt: string | null;
  voxId: string;
  message: string;
  thumbnailUrl: string | null;
  anchorUpper: string | null;
  /** Excerpt of the comment the row is about. */
  commentPreview: string | null;
  reportDetails?: string | null;
};

export const mapUserNotificationsToVirtualRows = (
  items: UserNotificationPanelRow[],
): NotificationPanelVirtualRow[] =>
  items.map((it) => ({
    id: it.id,
    readAt: it.readAt,
    voxId: it.voxId,
    message: it.message,
    thumbnailUrl: it.thumbnailUrl,
    anchorUpper: it.commentPublicTag ? it.commentPublicTag.toUpperCase() : null,
    commentPreview: it.commentPreview ?? null,
  }));

export const mapStaffNotificationsToVirtualRows = (
  items: StaffNotificationRow[],
): NotificationPanelVirtualRow[] =>
  items.map((it) => ({
    id: it.id,
    readAt: it.readAt,
    voxId: it.voxId,
    message: it.message,
    thumbnailUrl: it.thumbnailUrl,
    anchorUpper: it.commentHash ? it.commentHash.toUpperCase() : null,
    commentPreview: it.commentPreview ?? null,
    reportDetails: it.reportDetails ?? null,
  }));

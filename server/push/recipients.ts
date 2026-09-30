import type { NotificationType } from "@prisma/client";

export type PushRecipientRow = {
  userId: string;
  type: NotificationType;
};

export type CommentPushGroup = {
  type: NotificationType;
  userIds: string[];
};

/** Most targeted first: when capping, keep what users most expect to receive. */
const TYPE_PRIORITY: Record<NotificationType, number> = {
  REPLY_TO_COMMENT: 0,
  COMMENT_ON_YOUR_VOX: 1,
  COMMENT_ON_FOLLOWED_VOX: 2,
};

/** One comment notifies different people for different reasons, each with its own title. */
export const groupCommentPushRecipients = (
  rows: readonly PushRecipientRow[],
  opts: { max: number },
): CommentPushGroup[] => {
  const seen = new Set<string>();
  const kept: PushRecipientRow[] = [];
  const ordered = [...rows].sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);
  for (const row of ordered) {
    if (kept.length >= opts.max) break;
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    kept.push(row);
  }

  const byType = new Map<NotificationType, string[]>();
  for (const row of kept) {
    const list = byType.get(row.type);
    if (list) list.push(row.userId);
    else byType.set(row.type, [row.userId]);
  }
  return [...byType.entries()]
    .map(([type, userIds]) => ({ type, userIds }))
    .sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);
};

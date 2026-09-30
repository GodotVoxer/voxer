import { NotificationType } from "@prisma/client";
export type ParentCommentRef = {
  id: string;
  publicTag: string;
  authorId: string | null;
  replyNotificationsMuted: boolean;
};
export type NotificationInsertRow = {
  userId: string;
  type: NotificationType;
  message: string;
  relatedCommentId: string | null;
  actorUserId: string;
};
export const buildCommentNotificationRows = (input: {
  voxTitle: string;
  voxThumbnailUrl: string | null;
  voxOwnerId: string | null;
  newCommentAuthorId: string;
  newCommentId: string;
  replyTagsDistinct: string[];
  parentByTagUpper: ReadonlyMap<string, ParentCommentRef>;
  /** Owners follow their vox on creation; unfollowing silences `COMMENT_ON_YOUR_VOX`. */
  followerUserIds: readonly string[];
}): NotificationInsertRow[] => {
  const titleShort =
    input.voxTitle.length > 80 ? `${input.voxTitle.slice(0, 77)}…` : input.voxTitle;
  const byUser = new Map<string, NotificationInsertRow>();
  for (const tag of input.replyTagsDistinct) {
    const parent = input.parentByTagUpper.get(tag.toUpperCase());
    if (!parent?.authorId || parent.authorId === input.newCommentAuthorId) continue;
    if (parent.replyNotificationsMuted) continue;
    if (byUser.has(parent.authorId)) continue;
    byUser.set(parent.authorId, {
      userId: parent.authorId,
      type: NotificationType.REPLY_TO_COMMENT,
      message: `Alguien respondió a tu comentario en el vox «${titleShort}».`,
      relatedCommentId: input.newCommentId,
      actorUserId: input.newCommentAuthorId,
    });
  }
  if (
    input.voxOwnerId &&
    input.voxOwnerId !== input.newCommentAuthorId &&
    input.followerUserIds.includes(input.voxOwnerId)
  ) {
    if (!byUser.has(input.voxOwnerId)) {
      byUser.set(input.voxOwnerId, {
        userId: input.voxOwnerId,
        type: NotificationType.COMMENT_ON_YOUR_VOX,
        message: `Alguien comentó en tu vox «${titleShort}».`,
        relatedCommentId: input.newCommentId,
        actorUserId: input.newCommentAuthorId,
      });
    }
  }
  for (const uid of input.followerUserIds) {
    if (uid === input.newCommentAuthorId) continue;
    if (input.voxOwnerId && uid === input.voxOwnerId) continue;
    if (byUser.has(uid)) continue;
    byUser.set(uid, {
      userId: uid,
      type: NotificationType.COMMENT_ON_FOLLOWED_VOX,
      message: `Alguien comentó en un vox que seguís «${titleShort}».`,
      relatedCommentId: input.newCommentId,
      actorUserId: input.newCommentAuthorId,
    });
  }
  return [...byUser.values()];
};

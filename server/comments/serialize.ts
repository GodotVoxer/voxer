import type { AvatarVariant, Comment, CommentStaffBadge } from "@prisma/client";
import type { CommentThreadTagPublic } from "@/lib/vox/types";
import { pollBarHueForSortOrder } from "@/lib/vox/pollBarHue";

export type CommentPublicApi = {
  id: string;
  publicTag: string;
  body: string;
  displayName: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
  animatedImage: boolean;
  avatarVariant: AvatarVariant;
  staffBadge: CommentStaffBadge | null;
  isOp: boolean;
  createdAt: string;
  threadTag: CommentThreadTagPublic | null;
  countryCode: string | null;
  pollVoteLabel: string | null;
  pollVoteHue: number | null;
  isMine: boolean;
  /** Meaningful only when `isMine`; false for every other reader. */
  repliesMuted: boolean;
  /** Set when the vox owner pinned it; the pinned section sorts newest first. */
  pinnedAt: string | null;
};

type CommentWithPollOption = Comment & {
  pollDisclosureOption?: { label: string; sortOrder: number } | null;
};

export const toPublicComment = (
  c: CommentWithPollOption,
  isOp: boolean,
  opts?: { threadIdsEnabled?: boolean; viewerUserId?: string | null },
): CommentPublicApi => {
  const pollOpt = c.pollDisclosureOption;
  const threadTag =
    opts?.threadIdsEnabled === true && c.threadTag != null && c.threadBadgeHue != null
      ? { text: c.threadTag, badgeHue: c.threadBadgeHue }
      : null;
  const viewerId = opts?.viewerUserId ?? null;
  const isMine = viewerId !== null && c.authorId !== null && c.authorId === viewerId;
  return {
    id: c.id,
    publicTag: c.publicTag,
    body: c.body,
    displayName: c.displayName,
    imageUrl: c.imageUrl,
    videoUrl: c.videoUrl,
    videoPosterUrl: c.videoPosterUrl ?? null,
    animatedImage: c.animatedImage,
    avatarVariant: c.avatarVariant,
    staffBadge: c.staffBadge ?? null,
    isOp: isOp && !c.hideOpBadge,
    createdAt: c.createdAt.toISOString(),
    threadTag,
    countryCode: c.countryCode ?? null,
    pollVoteLabel: pollOpt?.label ?? null,
    pollVoteHue: pollOpt != null ? pollBarHueForSortOrder(pollOpt.sortOrder) : null,
    isMine,
    repliesMuted: isMine && c.replyNotificationsMuted,
    pinnedAt: c.pinnedAt?.toISOString() ?? null,
  };
};

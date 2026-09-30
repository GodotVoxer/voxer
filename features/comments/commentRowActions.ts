import type { CommentPublic } from "@/lib/vox/types";

/** Optional actions of a comment row in one object, so the thread, pins and dialogs show the same buttons. */
export type CommentRowActions = {
  onReportComment?: (comment: CommentPublic) => void;
  showReportOnComments?: boolean;
  onCommentRepliesMutedChange?: (commentId: string, muted: boolean) => void;
  onCommentPinnedChange?: (commentId: string, pinnedAt: string | null) => void;
  onModeratorDeleteComment?: (comment: CommentPublic) => void;
  onModeratorOpenPublicationModComment?: (comment: CommentPublic) => void;
  moderatorCommentAuthorHistoryHref?: (comment: CommentPublic) => string | undefined;
  showModeratorCommentTools?: boolean;
  /** ADMIN only, offered on the admin's own comments (`isMine`). */
  onAdminEditComment?: (comment: CommentPublic) => void;
};

/** What `CommentRow` expects for that comment. */
export type CommentRowActionProps = {
  onReport?: () => void;
  onRepliesMutedChange?: (commentId: string, muted: boolean) => void;
  onPinnedChange?: (commentId: string, pinnedAt: string | null) => void;
  onModeratorDelete?: () => void;
  onModeratorPublicationMod?: () => void;
  moderatorAuthorHistoryHref?: string;
  onAdminEdit?: () => void;
};

export const commentRowActionProps = (
  actions: CommentRowActions,
  comment: CommentPublic,
): CommentRowActionProps => {
  const {
    onReportComment,
    showReportOnComments,
    onCommentRepliesMutedChange,
    onCommentPinnedChange,
    onModeratorDeleteComment,
    onModeratorOpenPublicationModComment,
    moderatorCommentAuthorHistoryHref,
    showModeratorCommentTools,
    onAdminEditComment,
  } = actions;
  return {
    onReport: showReportOnComments && onReportComment ? () => onReportComment(comment) : undefined,
    onRepliesMutedChange: onCommentRepliesMutedChange,
    onPinnedChange: onCommentPinnedChange,
    onModeratorDelete:
      showModeratorCommentTools && onModeratorDeleteComment
        ? () => onModeratorDeleteComment(comment)
        : undefined,
    onModeratorPublicationMod:
      showModeratorCommentTools && onModeratorOpenPublicationModComment
        ? () => onModeratorOpenPublicationModComment(comment)
        : undefined,
    moderatorAuthorHistoryHref:
      showModeratorCommentTools && moderatorCommentAuthorHistoryHref
        ? moderatorCommentAuthorHistoryHref(comment)
        : undefined,
    onAdminEdit:
      onAdminEditComment && comment.isMine ? () => onAdminEditComment(comment) : undefined,
  };
};

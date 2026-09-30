"use client";
import { useState } from "react";
import { Eye, EyeOff, Flag } from "lucide-react";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import { cn } from "@/lib/utils";
import { isYoutubeEmbedUrl } from "@/lib/media/youtube";
import { CommentAuthorAvatar, CommentAuthorName } from "./CommentAuthorIdentity";
import { CommentAttachmentBlock, commentThreadMediaClassName } from "./CommentAttachmentBlock";
import { CommentBody } from "./CommentBody";
import { CommentPollVoteBadge } from "./CommentPollVoteBadge";
import { CommentTaggedByBar } from "./CommentTaggedByBar";
import { TimestampWithTooltip } from "@/components/Time/TimestampWithTooltip";
import { CountryFlagIcon } from "./CountryFlagIcon";
import { CommentReplyNotificationsToggle } from "./CommentReplyNotificationsToggle";
import { CommentPinToggle } from "./CommentPinToggle";
import { CommentShareLinkButton } from "./CommentShareLinkButton";
import { CommentTagButton } from "./CommentTagButton";
import { CommentStaffMenu } from "./CommentStaffMenu";

type Props = {
  readOnly?: boolean;
  comment: CommentPublic;
  /** For the comment's share link: `CommentPublic` does not carry its vox. */
  voxId: string;
  highlighted?: boolean;
  onReplyTag: (tag: string) => void;
  onTagClick: (tag: string) => void;
  taggedBy: CommentTagBackref[];
  resolveComment: (publicTagUpper: string) => CommentPublic | undefined;
  repliesCount: number;
  onOpenReplies: (publicTag: string) => void;
  previewSide?: "left" | "right" | "top" | "bottom";
  onReport?: () => void;
  onRepliesMutedChange?: (commentId: string, muted: boolean) => void;
  /** Vox owner only: pin or unpin this comment. */
  onPinnedChange?: (commentId: string, pinnedAt: string | null) => void;
  /** Copy in the pinned block: golden border and no duplicate anchor of the original. */
  pinnedCopy?: boolean;
  /** Not the thread row (dialogs): no duplicate `#TAG` anchor and the attachment is not pinned. */
  copy?: boolean;
  /** Dialog rows are narrow: without the age, the header fits on one line. */
  hideTimestamp?: boolean;
  onModeratorDelete?: () => void;
  onModeratorPublicationMod?: () => void;
  moderatorAuthorHistoryHref?: string;
  /** ADMIN only, on their own comment: text and visible identity. */
  onAdminEdit?: () => void;
};
export const CommentRow = ({
  readOnly = false,
  comment,
  voxId,
  highlighted = false,
  onReplyTag,
  onTagClick,
  taggedBy,
  resolveComment,
  repliesCount,
  onOpenReplies,
  previewSide = "right",
  onReport,
  onRepliesMutedChange,
  onPinnedChange,
  pinnedCopy = false,
  copy = false,
  hideTimestamp = false,
  onModeratorDelete,
  onModeratorPublicationMod,
  moderatorAuthorHistoryHref,
  onAdminEdit,
}: Props) => {
  const [contentHidden, setContentHidden] = useState(false);
  const staff = comment.staffBadge ?? null;
  const hasMedia = Boolean(comment.imageUrl || comment.videoUrl);
  const isYoutubeAttachment = Boolean(comment.videoUrl && isYoutubeEmbedUrl(comment.videoUrl));
  const bodyTrimmed = comment.body.trim();
  const isCopy = copy || pinnedCopy;
  return (
    <div
      // The anchor (`#TAG`, `>>TAG`, deep links) is always the original thread row: copies must not
      // duplicate the id in the document.
      id={isCopy ? undefined : comment.publicTag.toUpperCase()}
      data-tag={isCopy ? undefined : comment.publicTag}
      data-pinned-copy={pinnedCopy ? "" : undefined}
      className={cn(
        "rounded-md py-3 px-1 transition-colors duration-300",
        pinnedCopy
          ? "border border-comment-pin/60 bg-comment-pin-soft/[0.06] shadow-[0_0_10px_color-mix(in_srgb,var(--comment-pin-soft)_10%,transparent)]"
          : "border-b border-fg/5",
        highlighted && "bg-fg/[0.08]",
        !highlighted && !pinnedCopy && comment.isMine && "bg-fg/[0.04]",
      )}
    >
      <div className="flex items-start gap-2">
        <CommentAuthorAvatar staff={staff} variant={comment.avatarVariant} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-fg-muted">
            {comment.isOp ? (
              <span
                className="shrink-0 rounded-full border border-brand-500/45 bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-tight text-on-solid shadow-sm"
                title="Autor del vox"
              >
                OP
              </span>
            ) : null}
            <CommentAuthorName staff={staff} displayName={comment.displayName} />
            {comment.countryCode ? <CountryFlagIcon countryCode={comment.countryCode} /> : null}
            {readOnly ? (
              <span className="font-mono text-brand-300">{comment.publicTag}</span>
            ) : (
              <CommentTagButton publicTag={comment.publicTag} onReplyTag={onReplyTag} />
            )}
            {comment.threadTag ? (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-on-solid shadow-sm"
                style={{ backgroundColor: `hsl(${comment.threadTag.badgeHue} 70% 42%)` }}
                title="ID en este hilo"
              >
                {comment.threadTag.text}
              </span>
            ) : null}
            <div
              className={cn(
                "ml-auto flex flex-wrap items-center justify-end gap-x-2 gap-y-1",
                readOnly ? "flex-none" : "min-w-0 flex-1",
              )}
            >
              {hideTimestamp ? null : (
                <TimestampWithTooltip iso={comment.createdAt} className="whitespace-nowrap" />
              )}
              {!readOnly ? (
                <>
                  <CommentShareLinkButton voxId={voxId} publicTag={comment.publicTag} />
                  {comment.isMine && onRepliesMutedChange ? (
                    <CommentReplyNotificationsToggle
                      commentId={comment.id}
                      muted={comment.repliesMuted === true}
                      onMutedChange={onRepliesMutedChange}
                    />
                  ) : null}
                  {onPinnedChange ? (
                    <CommentPinToggle
                      commentId={comment.id}
                      pinned={Boolean(comment.pinnedAt)}
                      onPinnedChange={onPinnedChange}
                    />
                  ) : null}
                  {onReport ? (
                    <button
                      type="button"
                      className="cursor-pointer p-0.5 text-danger-400/80 hover:text-danger-400"
                      aria-label="Denunciar comentario"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReport();
                      }}
                    >
                      <Flag className="size-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="cursor-pointer p-0.5 text-fg-muted hover:text-fg-soft"
                    aria-label={
                      contentHidden
                        ? "Mostrar contenido del comentario"
                        : "Ocultar contenido del comentario"
                    }
                    aria-pressed={contentHidden}
                    onClick={(e) => {
                      e.stopPropagation();
                      setContentHidden((h) => !h);
                    }}
                  >
                    {contentHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                  <CommentStaffMenu
                    onDelete={onModeratorDelete}
                    onPublicationMod={onModeratorPublicationMod}
                    authorHistoryHref={moderatorAuthorHistoryHref}
                    onEditOwn={onAdminEdit}
                  />
                </>
              ) : null}
            </div>
          </div>
          {contentHidden ? (
            <p className="mt-2 text-xs text-fg-subtle italic">Contenido oculto</p>
          ) : (
            <div className="mt-1 space-y-2">
              <CommentPollVoteBadge label={comment.pollVoteLabel} hue={comment.pollVoteHue} />
              <CommentTaggedByBar
                taggedBy={taggedBy}
                resolveComment={resolveComment}
                onTagClick={onTagClick}
                previewSide={previewSide}
              />
              {hasMedia ? (
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-3">
                  <div
                    className={cn(
                      "w-full min-w-0 shrink-0",
                      // The YouTube embed is `aspect-video w-full`: with `w-fit` the percentage width collapses to 0.
                      isYoutubeAttachment
                        ? "sm:w-[min(100%,560px)]"
                        : "sm:w-fit sm:max-w-[min(100%,560px)]",
                    )}
                  >
                    <CommentAttachmentBlock
                      // No `commentId` on copies: the virtualized thread must not keep the original row mounted
                      // because a player is open in a copy.
                      commentId={isCopy ? undefined : comment.id}
                      imageUrl={comment.imageUrl}
                      videoUrl={comment.videoUrl}
                      videoPosterUrl={comment.videoPosterUrl}
                      animatedImage={comment.animatedImage}
                      mediaClassName={commentThreadMediaClassName}
                    />
                  </div>
                  {bodyTrimmed ? (
                    <div
                      className={cn("min-w-0 w-full sm:flex-1", !readOnly && "sm:min-w-[18rem]")}
                    >
                      <CommentBody
                        tagsAsPlainText={readOnly}
                        text={comment.body}
                        onRefClick={onTagClick}
                        resolveComment={resolveComment}
                        refHoverPreviewSide={previewSide}
                      />
                    </div>
                  ) : null}
                </div>
              ) : bodyTrimmed ? (
                <CommentBody
                  tagsAsPlainText={readOnly}
                  text={comment.body}
                  onRefClick={onTagClick}
                  resolveComment={resolveComment}
                  refHoverPreviewSide={previewSide}
                />
              ) : null}
              {!readOnly && repliesCount > 0 ? (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    className="cursor-pointer rounded border border-brand-600/35 bg-surface-sunken/70 px-2 py-0.5 text-[11px] font-medium text-brand-300 hover:bg-surface-raised hover:text-brand-200"
                    onClick={() => onOpenReplies(comment.publicTag)}
                  >
                    Respuestas: {repliesCount}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

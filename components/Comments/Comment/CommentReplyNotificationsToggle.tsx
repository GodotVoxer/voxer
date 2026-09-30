"use client";
import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { muteCommentReplies, unmuteCommentReplies } from "@/features/vox/api";
import { cn } from "@/lib/utils";

type Props = {
  commentId: string;
  muted: boolean;
  onMutedChange: (commentId: string, muted: boolean) => void;
};

export const CommentReplyNotificationsToggle = ({ commentId, muted, onMutedChange }: Props) => {
  const [busy, setBusy] = useState(false);
  const label = muted
    ? "Activar notificaciones de respuestas"
    : "Silenciar notificaciones de respuestas";
  return (
    <button
      type="button"
      disabled={busy}
      className={cn(
        "cursor-pointer p-0.5 disabled:cursor-wait disabled:opacity-60",
        muted ? "text-brand-300 hover:text-brand-200" : "text-fg-muted hover:text-fg-soft",
      )}
      aria-label={label}
      title={label}
      aria-pressed={muted}
      onClick={(e) => {
        e.stopPropagation();
        const next = !muted;
        void (async () => {
          setBusy(true);
          try {
            await (next ? muteCommentReplies(commentId) : unmuteCommentReplies(commentId));
            onMutedChange(commentId, next);
          } catch {
            /* ignore */
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {muted ? (
        <BellOff className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Bell className="size-3.5 shrink-0" aria-hidden />
      )}
    </button>
  );
};

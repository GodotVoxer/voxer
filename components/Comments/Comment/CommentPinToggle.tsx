"use client";
import { useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { pinComment, unpinComment } from "@/features/vox/api";
import { cn } from "@/lib/utils";

type Props = {
  commentId: string;
  pinned: boolean;
  /** New `pinnedAt` (ISO), or null when unpinning. */
  onPinnedChange: (commentId: string, pinnedAt: string | null) => void;
};

/** Vox owner only: pins the comment above the thread (no limit). */
export const CommentPinToggle = ({ commentId, pinned, onPinnedChange }: Props) => {
  const [busy, setBusy] = useState(false);
  const label = pinned ? "Desfijar comentario" : "Fijar comentario arriba";
  return (
    <button
      type="button"
      disabled={busy}
      className={cn(
        "cursor-pointer p-0.5 text-comment-pin disabled:cursor-wait disabled:opacity-60",
        pinned ? "hover:text-comment-pin-soft" : "opacity-70 hover:opacity-100",
      )}
      aria-label={label}
      title={label}
      aria-pressed={pinned}
      onClick={(e) => {
        e.stopPropagation();
        void (async () => {
          setBusy(true);
          try {
            if (pinned) {
              await unpinComment(commentId);
              onPinnedChange(commentId, null);
            } else {
              const pinnedAt = await pinComment(commentId);
              onPinnedChange(commentId, pinnedAt ?? new Date().toISOString());
            }
          } catch {
            /* ignore: the state stays the server's */
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {pinned ? (
        <PinOff className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Pin className="size-3.5 shrink-0" aria-hidden />
      )}
    </button>
  );
};

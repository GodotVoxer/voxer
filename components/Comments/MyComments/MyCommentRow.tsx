import Link from "next/link";
import { Pin } from "lucide-react";
import type { MyCommentItem } from "@/lib/comments/myCommentsTypes";
import { moderationAuthorPublicationCommentThumbSrc } from "@/features/moderation/authorPublicationCommentMedia";
import { TimestampWithTooltip } from "@/components/Time/TimestampWithTooltip";
import { cn } from "@/lib/utils";
import { voxCommentPath } from "@/lib/vox/paths";

export const MyCommentRow = ({ item }: { item: MyCommentItem }) => {
  const thumb = moderationAuthorPublicationCommentThumbSrc(item);
  const body = item.body.trim();

  return (
    <Link
      href={voxCommentPath(item.voxId, item.publicTag)}
      className="flex min-h-22 gap-3 rounded-lg border border-fg/10 bg-surface-raised p-3 transition-colors hover:border-brand-500/40 hover:bg-surface-elevated"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs remotas arbitrarias (R2, Blob).
        <img
          src={thumb}
          alt=""
          decoding="async"
          className="size-16 shrink-0 rounded-md border border-fg/10 bg-media-placeholder object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
          <span className="rounded-full border border-fg/12 bg-surface-sunken/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-fg-soft">
            {item.publicTag}
          </span>
          <span className="rounded border border-fg/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {item.voxCategory}
          </span>
          {item.pinned ? (
            <Pin
              className="size-3.5 shrink-0 fill-comment-pin text-comment-pin"
              aria-label="Fijado por el autor del vox"
            />
          ) : null}
          <TimestampWithTooltip iso={item.createdAt} className="ml-auto" />
        </div>
        <p className="mt-1 truncate text-sm font-medium text-fg">{item.voxTitle}</p>
        <p
          className={cn(
            "mt-0.5 line-clamp-2 text-sm text-fg-muted",
            !body && "italic text-fg-subtle",
          )}
        >
          {body || "Sin texto"}
        </p>
      </div>
    </Link>
  );
};

"use client";
import type { AvatarVariant, CommentStaffBadge } from "@/lib/vox/types";
import { cn } from "@/lib/utils";
import { CommentAnonAvatar } from "./CommentAnonAvatar";
import { CommentStaffAvatar } from "./CommentStaffAvatar";

type Size = "sm" | "md";

type AvatarProps = {
  staff: CommentStaffBadge | null;
  variant: AvatarVariant;
  size?: Size;
};

export const CommentAuthorAvatar = ({ staff, variant, size = "md" }: AvatarProps) =>
  staff ? (
    <CommentStaffAvatar staff={staff} size={size} />
  ) : (
    <CommentAnonAvatar variant={variant} size={size} />
  );

type NameProps = {
  staff: CommentStaffBadge | null;
  displayName: string;
  /** The anonymous label is dimmed differently per context (thread row, quote, preview). */
  anonClassName?: string;
};

export const CommentAuthorName = ({ staff, displayName, anonClassName }: NameProps) =>
  staff ? (
    <span className={cn("font-semibold", staff === "MOD" ? "text-warning-300" : "text-danger-400")}>
      {displayName}
    </span>
  ) : (
    <span className={cn("font-medium text-fg-muted", anonClassName)}>Anónimo</span>
  );

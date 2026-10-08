"use client";
import type { AvatarVariant } from "@/lib/vox/types";
import { cn } from "@/lib/utils";
import {
  avatarClass,
  stripeColorsForVariant,
  usesStripeAnimatedAvatar,
} from "@/features/comments/avatar";

type Size = "sm" | "md";

const sizeBox: Record<Size, string> = {
  sm: "h-9 w-9 rounded-md",
  md: "h-11 w-11 rounded-md",
};

const sizeLabel: Record<Size, string> = {
  sm: "text-[9px]",
  md: "text-[10px]",
};

type Props = {
  variant: AvatarVariant;
  size?: Size;
  className?: string;
};

export const CommentAnonAvatar = ({ variant, size = "md", className }: Props) => {
  if (usesStripeAnimatedAvatar(variant)) {
    const stripes = stripeColorsForVariant(variant);
    const doubled = [...stripes, ...stripes];
    return (
      <div
        className={cn(
          "comment-anon-avatar relative shrink-0 overflow-hidden",
          sizeBox[size],
          className,
        )}
      >
        <div className="comment-anon-avatar-stripes-track absolute left-0 top-0 flex h-[200%] w-full flex-col">
          {doubled.map((bg, i) => (
            <div
              key={`${bg}-${i}`}
              className="min-h-0 flex-[1_1_0%]"
              style={{ backgroundColor: bg }}
            />
          ))}
        </div>
        <div
          className={cn(
            "relative z-10 flex h-full items-center justify-center font-bold uppercase tracking-tight text-on-media drop-shadow-[0_1px_1px_color-mix(in_oklab,var(--shade)_55%,transparent)]",
            sizeLabel[size],
          )}
        >
          ANON
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "comment-anon-avatar flex shrink-0 items-center justify-center font-bold uppercase tracking-tight",
        sizeBox[size],
        sizeLabel[size],
        avatarClass(variant),
        className,
      )}
    >
      ANON
    </div>
  );
};

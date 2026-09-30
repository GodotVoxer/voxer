"use client";
import { cn } from "@/lib/utils";

type Props = {
  label: string | null | undefined;
  hue: number | null | undefined;
  size?: "sm" | "md";
};

/** Poll vote the author chose to show; it may be the whole content of the comment. */
export const CommentPollVoteBadge = ({ label, hue, size = "md" }: Props) => {
  if (label == null || hue == null) return null;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full font-medium text-on-solid shadow-sm",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      )}
      style={{ backgroundColor: `hsl(${hue} 65% 36%)` }}
    >
      <span className="min-w-0 truncate">Voto: {label}</span>
    </span>
  );
};

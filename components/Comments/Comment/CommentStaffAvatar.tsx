"use client";
import { Crown } from "lucide-react";
import type { CommentStaffBadge } from "@/lib/vox/types";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const sizeBox: Record<Size, string> = {
  sm: "h-9 w-9 text-[7px]",
  md: "h-11 w-11 text-[8px]",
};

const sizeCrown: Record<Size, string> = {
  sm: "-top-3 h-5 w-5",
  md: "-top-3.5 h-6 w-6",
};

type Props = {
  staff: CommentStaffBadge;
  size?: Size;
};

export const CommentStaffAvatar = ({ staff, size = "md" }: Props) => {
  return (
    <div className="relative shrink-0" title={staff === "MOD" ? "Moderador" : "Administrador"}>
      {staff === "ADMIN" ? (
        <Crown
          className={cn(
            "pointer-events-none absolute left-1/2 z-[2] -translate-x-1/2 fill-staff-crown text-[color-mix(in_oklab,var(--staff-crown)_50%,var(--on-media))] drop-shadow-[0_1px_2px_color-mix(in_oklab,var(--shade)_85%,transparent)]",
            sizeCrown[size],
          )}
          strokeWidth={1.4}
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "comment-staff-police-bg flex items-center justify-center rounded-md font-extrabold uppercase leading-tight tracking-tight text-on-media drop-shadow-[0_1px_1px_color-mix(in_oklab,var(--shade)_80%,transparent)]",
          sizeBox[size],
        )}
      >
        {staff}
      </div>
    </div>
  );
};

"use client";
import { useId, type CSSProperties } from "react";
import { staffBlinkDelaySeconds } from "@/features/comments/avatar";
import type { CommentStaffBadge } from "@/lib/vox/types";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const sizeBox: Record<Size, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
};

const EYE_COLOR: Record<CommentStaffBadge, string> = {
  MOD: "var(--warning-400)",
  ADMIN: "var(--danger-500)",
};

type Props = {
  staff: CommentStaffBadge;
  size?: Size;
};

/** Staff avatar while the Halloween seasonal theme is showing: a hooded reaper with glowing eyes. */
export const CommentStaffReaperAvatar = ({ staff, size = "md" }: Props) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const eye = EYE_COLOR[staff];
  const blink: CSSProperties = { animationDelay: `${staffBlinkDelaySeconds(id)}s` };

  return (
    <div
      className={cn(
        "staff-reaper relative shrink-0",
        staff === "ADMIN" && "staff-reaper-admin",
        sizeBox[size],
      )}
      title={staff === "MOD" ? "Moderador" : "Administrador"}
    >
      <svg viewBox="0 0 44 44" className="size-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`${id}-hood`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--special-800)" }} />
            <stop offset="1" style={{ stopColor: "var(--shade)" }} />
          </linearGradient>
          <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={staff === "ADMIN" ? 2 : 1.5} result="blur" />
            <feFlood style={{ floodColor: eye }} result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {staff === "ADMIN" ? (
          <g>
            <path
              d="M36 44L33.5 6"
              className="stroke-surface-strong"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M33.3 5.5Q42 1 48 9Q42 5.5 34 9Z" className="fill-fg-soft" />
          </g>
        ) : null}
        <path
          d="M22 1C12.5 3 6 11.5 5 23C4.5 31 3.5 38 1 44H43C40.5 38 39.5 31 39 23C38 11.5 31.5 3 22 1Z"
          fill={`url(#${id}-hood)`}
          className="stroke-special-700"
          strokeWidth="0.8"
        />
        <path
          d="M22 9C15.5 9 12.5 15 12.5 21C12.5 27.5 16 31.5 22 31.5S31.5 27.5 31.5 21C31.5 15 28.5 9 22 9Z"
          className="fill-shade"
        />
        <g className="staff-reaper-eyes" filter={`url(#${id}-glow)`} style={blink}>
          <path d="M14.5 20Q17.6 16.6 20.8 19.4Q17.6 22 14.5 20Z" style={{ fill: eye }} />
          <path d="M29.5 20Q26.4 16.6 23.2 19.4Q26.4 22 29.5 20Z" style={{ fill: eye }} />
        </g>
        <text
          x="22"
          y="40"
          textAnchor="middle"
          fontSize={staff === "ADMIN" ? 7 : 7.5}
          fontWeight="800"
          letterSpacing="0.6"
          style={{ fill: `color-mix(in oklab, ${eye} 80%, var(--fg))` }}
        >
          {staff}
        </text>
      </svg>
      <span className="sr-only">{staff}</span>
    </div>
  );
};

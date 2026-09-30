import { Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
type Props = {
  /** Short title (e.g. "Ups"). */
  title?: string;
  message: string;
  className?: string;
  /** `compact` for forms; `default` for a full screen or the grid. */
  size?: "default" | "compact";
};
export const FriendlyError = ({ title = "Ups", message, className, size = "default" }: Props) => {
  const isCompact = size === "compact";
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-danger-500/25 bg-gradient-to-br from-danger-950/45 via-surface-raised/60 to-surface-sunken/90 text-left shadow-inner",
        isCompact ? "p-3" : "p-5",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          isCompact
            ? "flex-row items-center"
            : "flex-col items-center text-center sm:flex-row sm:items-start sm:text-left",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-danger-500/15 ring-1 ring-danger-400/20",
            isCompact ? "size-10" : "size-14 sm:size-16",
          )}
        >
          <Ghost
            className={cn("text-danger-200/95", isCompact ? "size-5" : "size-8 sm:size-9")}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold text-fg", isCompact ? "text-sm" : "text-base")}>
            {title}
          </p>
          <p
            className={cn(
              "text-danger-100/90",
              isCompact ? "text-xs mt-0.5" : "text-sm mt-1 leading-relaxed",
            )}
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

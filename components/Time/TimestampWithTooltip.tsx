"use client";

import { useCanHover } from "@/hooks/device/useCanHover";
import { formatExactDateTimeEs } from "@/lib/format/dates";
import { formatRelativeTimeShortEs } from "@/lib/format/relativeTime";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  iso: string;
  className?: string;
  nowMs?: number;
};

export const TimestampWithTooltip = ({ iso, className, nowMs }: Props) => {
  const canHover = useCanHover();
  const relative = formatRelativeTimeShortEs(iso, nowMs);
  const exact = formatExactDateTimeEs(iso);

  if (!canHover) {
    return (
      <span className={className} title={exact}>
        {relative}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className={className}>{relative}</span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="font-mono text-[11px] tabular-nums">
        {exact}
      </TooltipContent>
    </Tooltip>
  );
};

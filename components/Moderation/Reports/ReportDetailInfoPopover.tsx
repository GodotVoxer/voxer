"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useCanHover } from "@/hooks/device/useCanHover";

type Props = {
  details: string;
};

export const ReportDetailInfoPopover = ({ details }: Props) => {
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Any scroll anywhere (window or inner container) closes the detail
    const handleDismiss = () => {
      setOpen(false);
    };

    const handlePointerDown = (e: Event) => {
      const target = (e as PointerEvent | TouchEvent).target as Node | null;
      if (!target) return;

      const isInsideContent =
        Boolean(contentRef.current?.contains(target)) ||
        Boolean(contentRef.current?.closest('[data-slot="hover-card-content"]')?.contains(target));

      const isInsideTrigger = Boolean(triggerRef.current?.contains(target));

      if (isInsideContent || isInsideTrigger) {
        return;
      }

      setOpen(false);
    };

    window.addEventListener("scroll", handleDismiss, { capture: true, passive: true });
    window.addEventListener("touchmove", handleDismiss, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    document.addEventListener("touchstart", handlePointerDown, { capture: true, passive: true });

    return () => {
      window.removeEventListener("scroll", handleDismiss, { capture: true });
      window.removeEventListener("touchmove", handleDismiss);
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      document.removeEventListener("touchstart", handlePointerDown, { capture: true });
    };
  }, [open]);

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Ver aclaración de la denuncia"
          title="Ver aclaración"
          onFocus={(e) => {
            // Keep Radix's HoverCard from opening by itself on focus
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Desktop shows it on hover only; touch toggles it on tap
            if (!canHover) {
              setOpen((v) => !v);
            }
          }}
          className="cursor-pointer shrink-0 rounded-md p-1.5 text-warning-400/90 transition-colors hover:bg-surface-raised hover:text-warning-300 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Info className="size-4" aria-hidden />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-72 sm:w-80 max-w-[calc(100vw-2rem)] p-3 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={contentRef} className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-fg-muted">
            <Info className="size-3.5 text-warning-400 shrink-0" aria-hidden />
            <span>Aclaración del denunciante</span>
          </div>
          <p className="break-words whitespace-pre-wrap leading-relaxed text-fg">{details}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { voxCardTitleHalfScrimGradient } from "@/features/vox/grid/cardFrameLayout";
import { voxCardTitleLineClampFromHeights } from "@/features/vox/grid/cardTitleLineClamp";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** `top-*` of the title stack: leaves room for the header pills; does not affect the cover veil. */
  titleStackTopClassName?: string;
};

const defaultTitleStackTopClassName = "top-9 sm:top-10";

export const VoxCardBottomTitle = ({
  title,
  titleStackTopClassName = defaultTitleStackTopClassName,
}: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const [lineClamp, setLineClamp] = useState(12);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const update = () => {
      const overlayStyles = getComputedStyle(overlay);
      const padTop = parseFloat(overlayStyles.paddingTop) || 0;
      const padBottom = parseFloat(overlayStyles.paddingBottom) || 0;
      const usable = Math.max(0, overlay.clientHeight - padTop - padBottom);

      const titleEl = titleRef.current;
      let lineHeightPx = 22;
      if (titleEl) {
        const ts = getComputedStyle(titleEl);
        const lh = ts.lineHeight;
        if (lh === "normal") {
          const fontSize = parseFloat(ts.fontSize) || 17;
          lineHeightPx = fontSize * 1.375;
        } else {
          lineHeightPx = parseFloat(lh) || 22;
        }
      }

      setLineClamp(voxCardTitleLineClampFromHeights(usable, lineHeightPx));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(overlay);
    return () => ro.disconnect();
  }, [title, titleStackTopClassName]);

  return (
    <>
      <div
        aria-hidden
        style={{ backgroundImage: voxCardTitleHalfScrimGradient }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[50%] w-full"
      />
      <div
        ref={overlayRef}
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex min-h-0 flex-col justify-end overflow-hidden p-2 text-on-media",
          titleStackTopClassName,
        )}
      >
        <p
          ref={titleRef}
          className="vox-card-title-text m-0 min-h-0 w-full max-h-full shrink break-words text-[1.0625rem] font-bold leading-snug sm:text-[1.1875rem]"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            WebkitLineClamp: lineClamp,
          }}
        >
          {title}
        </p>
      </div>
    </>
  );
};

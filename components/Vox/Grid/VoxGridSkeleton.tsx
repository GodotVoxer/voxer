"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { VoxCardSkeleton } from "./VoxCard/VoxCardSkeleton";
import {
  getVoxGridTrackLayout,
  readGridTrackWidthPx,
  VOX_GRID_GAP_PX,
} from "@/features/vox/grid/gridLayout";

type Props = {
  count?: number;
};

export const VoxGridSkeleton = ({ count = 12 }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [trackWidthPx, setTrackWidthPx] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setTrackWidthPx(readGridTrackWidthPx(el));
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const { columns, columnWidth } = getVoxGridTrackLayout(trackWidthPx);
  const rowCount = Math.ceil(count / columns);

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <div className="flex flex-col" style={{ gap: VOX_GRID_GAP_PX }}>
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex min-w-0 justify-start"
            style={{ gap: VOX_GRID_GAP_PX }}
          >
            {Array.from({ length: columns }, (_, colIndex) => {
              const i = rowIndex * columns + colIndex;
              if (i >= count) return null;
              return (
                <div
                  key={i}
                  className="min-w-0 shrink-0 overflow-visible"
                  style={{
                    width: `${columnWidth}px`,
                    flex: `0 0 ${columnWidth}px`,
                  }}
                >
                  <VoxCardSkeleton />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

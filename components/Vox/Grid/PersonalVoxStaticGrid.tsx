"use client";
import { useEffect, useRef } from "react";
import { VoxGridLoadMoreIndicator } from "@/components/Vox/Grid/VoxGridLoadMoreIndicator";
import { VOX_GRID_GAP_PX } from "@/features/vox/grid/gridLayout";
import { VoxCard } from "./VoxCard/VoxCard";
import type { PersonalVoxStaticGridProps } from "./gridTypes";

export const PersonalVoxStaticGrid = ({
  filtered,
  columns,
  columnWidth,
  listView,
  fetchNextPage,
  feed,
}: PersonalVoxStaticGridProps) => {
  const rowCount = Math.ceil(filtered.length / columns);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const showLoadMoreIndicator = feed.hasMore && feed.loadingMore;

  useEffect(() => {
    if (!feed.hasMore || feed.loadingMore || feed.loadingInitial) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void fetchNextPage(listView);
      },
      { root: null, rootMargin: "320px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feed.hasMore, feed.loadingMore, feed.loadingInitial, fetchNextPage, listView]);

  return (
    <>
      <div className="flex flex-col" style={{ gap: VOX_GRID_GAP_PX }}>
        {Array.from({ length: rowCount }, (_, rowIndex) => {
          const startIndex = rowIndex * columns;
          const rowItems = filtered.slice(startIndex, startIndex + columns);
          return (
            <div
              key={rowIndex}
              className="flex min-w-0 justify-start"
              style={{ gap: VOX_GRID_GAP_PX }}
            >
              {rowItems.map((vox) => (
                <div
                  key={vox.id}
                  className="min-w-0 shrink-0 overflow-visible"
                  style={{
                    width: `${columnWidth}px`,
                    flex: `0 0 ${columnWidth}px`,
                  }}
                >
                  <VoxCard vox={vox} listView={listView} disableLift={rowIndex === 0} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {showLoadMoreIndicator ? <VoxGridLoadMoreIndicator /> : null}
      <div ref={sentinelRef} className="pointer-events-none h-px w-full shrink-0" aria-hidden />
    </>
  );
};

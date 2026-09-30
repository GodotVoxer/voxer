"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  VOX_GRID_LOAD_MORE_INDICATOR_BLOCK_PX,
  VoxGridLoadMoreIndicator,
} from "@/components/Vox/Grid/VoxGridLoadMoreIndicator";
import { VOX_GRID_GAP_PX } from "@/features/vox/grid/gridLayout";
import { VoxCard } from "./VoxCard/VoxCard";
import type { HomeVoxWindowGridProps } from "./gridTypes";

export const HomeVoxWindowGrid = ({
  filtered,
  columns,
  columnWidth,
  rowHeight,
  rowCount,
  fetchNextPage,
  feed,
}: HomeVoxWindowGridProps) => {
  const virtualListAnchorRef = useRef<HTMLDivElement | null>(null);
  const infiniteSentinelRef = useRef<HTMLDivElement | null>(null);
  const [windowListScrollMargin, setWindowListScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const maxSlopPx = 72;
    const clampSmallScroll = () => {
      const y = window.scrollY;
      if (y > 0 && y <= maxSlopPx) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    };
    clampSmallScroll();
    let rafInner = 0;
    const rafOuter = window.requestAnimationFrame(() => {
      clampSmallScroll();
      rafInner = window.requestAnimationFrame(clampSmallScroll);
    });
    return () => {
      window.cancelAnimationFrame(rafOuter);
      window.cancelAnimationFrame(rafInner);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const el = virtualListAnchorRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setWindowListScrollMargin((prev) => (Math.abs(prev - top) > 0.5 ? top : prev));
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.requestAnimationFrame(() => {
      measure();
    });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", schedule);
      ro.disconnect();
    };
  }, [rowCount, filtered.length, columnWidth, rowHeight, feed.loadingInitial]);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight + VOX_GRID_GAP_PX,
    overscan: 12,
    scrollMargin: windowListScrollMargin,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, windowListScrollMargin, rowCount, rowHeight, columnWidth]);

  const virtualRows = virtualizer.getVirtualItems();
  const listTotalPx = virtualizer.getTotalSize();
  const showLoadMoreIndicator = feed.hasMore && feed.loadingMore;
  const loadMoreBlockPx = showLoadMoreIndicator
    ? VOX_GRID_GAP_PX + VOX_GRID_LOAD_MORE_INDICATOR_BLOCK_PX
    : 0;
  const containerHeightPx = listTotalPx + loadMoreBlockPx;

  useEffect(() => {
    if (!feed.hasMore || feed.loadingMore || feed.loadingInitial) return;
    const el = infiniteSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void fetchNextPage("default");
      },
      { root: null, rootMargin: "480px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [
    feed.hasMore,
    feed.loadingMore,
    feed.loadingInitial,
    fetchNextPage,
    containerHeightPx,
    listTotalPx,
    filtered.length,
  ]);

  return (
    <div
      ref={virtualListAnchorRef}
      className="relative w-full min-w-0"
      style={{ height: `${containerHeightPx}px` }}
    >
      {virtualRows.map((vRow) => {
        const startIndex = vRow.index * columns;
        const rowItems = filtered.slice(startIndex, startIndex + columns);
        return (
          <div
            key={vRow.key}
            className="absolute top-0 left-0 w-full min-w-0"
            style={{
              transform: `translateY(${vRow.start - windowListScrollMargin}px)`,
            }}
          >
            <div className="flex min-w-0 justify-start" style={{ gap: VOX_GRID_GAP_PX }}>
              {rowItems.map((vox, colIndex) => (
                <div
                  key={vox.id}
                  className="min-w-0 shrink-0 overflow-visible"
                  style={{
                    width: `${columnWidth}px`,
                    flex: `0 0 ${columnWidth}px`,
                  }}
                >
                  <VoxCard
                    vox={vox}
                    listView="default"
                    disableLift={vRow.index === 0}
                    imagePriority={vRow.index === 0 && colIndex === 0}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {showLoadMoreIndicator ? (
        <div
          className="absolute top-0 left-0 w-full min-w-0"
          style={{ transform: `translateY(${listTotalPx + VOX_GRID_GAP_PX}px)` }}
        >
          <VoxGridLoadMoreIndicator />
        </div>
      ) : null}
      <div
        ref={infiniteSentinelRef}
        className="pointer-events-none absolute right-0 left-0 h-px"
        style={{ top: `${Math.max(0, containerHeightPx - 1)}px` }}
        aria-hidden
      />
    </div>
  );
};

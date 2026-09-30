"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { MyCommentItem } from "@/lib/comments/myCommentsTypes";
import { MyCommentRow } from "./MyCommentRow";

type Props = {
  items: MyCommentItem[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void | Promise<void>;
};

const LOAD_MORE_BLOCK_PX = 52;

export const MyCommentsVirtualList = ({ items, hasMore, loadingMore, loadMore }: Props) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const element = anchorRef.current;
    if (!element) return;

    let frame = 0;
    const measure = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      setScrollMargin((current) => (Math.abs(current - top) > 0.5 ? top : current));
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("resize", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [items.length]);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 96,
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => items[index]?.id ?? String(index),
  });

  const listHeight = virtualizer.getTotalSize();
  const totalHeight = listHeight + (loadingMore ? LOAD_MORE_BLOCK_PX : 0);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px", threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, items.length, loadMore, loadingMore, totalHeight]);

  return (
    <div
      ref={anchorRef}
      className="relative w-full"
      style={{ height: `${totalHeight}px` }}
      aria-busy={loadingMore}
    >
      <ul className="relative h-full w-full">
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;
          return (
            <li
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full pb-2"
              style={{ transform: `translateY(${virtualRow.start - scrollMargin}px)` }}
            >
              <MyCommentRow item={item} />
            </li>
          );
        })}
        {loadingMore ? (
          <li
            className="absolute top-0 left-0 flex h-11 w-full items-center justify-center text-fg-subtle"
            style={{ transform: `translateY(${listHeight}px)` }}
          >
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">Cargando más comentarios…</span>
          </li>
        ) : null}
      </ul>
      <div
        ref={sentinelRef}
        className="pointer-events-none absolute right-0 left-0 h-px"
        style={{ top: `${Math.max(0, totalHeight - 1)}px` }}
        aria-hidden
      />
    </div>
  );
};

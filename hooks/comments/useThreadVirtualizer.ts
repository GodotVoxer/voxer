"use client";

import type { RefObject } from "react";
import {
  observeWindowOffset,
  observeWindowRect,
  useVirtualizer,
  windowScroll,
  type Virtualizer,
  type VirtualizerOptions,
} from "@tanstack/react-virtual";

type ThreadVirtualizerOptions = VirtualizerOptions<HTMLDivElement, HTMLDivElement>;

type Args = Pick<ThreadVirtualizerOptions, "count" | "estimateSize" | "getItemKey"> &
  Partial<Pick<ThreadVirtualizerOptions, "gap" | "rangeExtractor">> & {
    /** The page scrolls (mobile) instead of the comments panel. */
    documentScroll: boolean;
    scrollParentRef: RefObject<HTMLDivElement | null>;
    /** Offset (px) from the start of the scroll to the start of the list; `null` until measured. */
    scrollMargin: number | null;
  };

const PANEL_OVERSCAN = 3;
/** A touch fling outruns rendering: more rows are kept ready on each side. */
const DOCUMENT_OVERSCAN = 8;

/**
 * Page scroll is reported on the window, never on `<html>`: an element virtualizer over the document
 * hears no scroll and takes the whole page for its viewport, so it mounts every row. The base hook
 * serves both kinds of scroll and only its typings split them, hence the cast.
 */
const windowScrollOptions = {
  getScrollElement: () => (typeof document === "undefined" ? null : window),
  observeElementRect: observeWindowRect,
  observeElementOffset: observeWindowOffset,
  scrollToFn: windowScroll,
  initialOffset: () => (typeof document === "undefined" ? 0 : window.scrollY),
} as unknown as Pick<
  ThreadVirtualizerOptions,
  | "getScrollElement"
  | "observeElementRect"
  | "observeElementOffset"
  | "scrollToFn"
  | "initialOffset"
>;

/** Virtualizer of a comment list that scrolls with the comments panel or, on mobile, with the page. */
export const useThreadVirtualizer = ({
  documentScroll,
  scrollParentRef,
  scrollMargin,
  count,
  ...options
}: Args): Virtualizer<HTMLDivElement, HTMLDivElement> =>
  // TanStack Virtual returns mutable functions by design; this project does not run the React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  useVirtualizer<HTMLDivElement, HTMLDivElement>({
    ...options,
    // No rows until the start is known: a row measured against a wrong start shifts the scroll.
    count: scrollMargin === null ? 0 : count,
    scrollMargin: scrollMargin ?? 0,
    overscan: documentScroll ? DOCUMENT_OVERSCAN : PANEL_OVERSCAN,
    ...(documentScroll
      ? windowScrollOptions
      : {
          getScrollElement: () => scrollParentRef.current,
          // The virtualizer scrolls to this offset on mount, and a list can mount (first comment,
          // comments done loading) after the reader scrolled: the default 0 would jump to the top.
          initialOffset: () => scrollParentRef.current?.scrollTop ?? 0,
        }),
  });

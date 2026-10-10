"use client";

import { useLayoutEffect, useState } from "react";

/**
 * TanStack Virtual scrolls its element to the virtualizer's initial offset (0) when it mounts. A thread
 * mounts late (the first comment of an empty vox, comments that finish loading) after the reader may
 * have scrolled, so the position from before the mount is put back. Call it after `useVirtualizer`:
 * layout effects run in declaration order, and this one has to follow the virtualizer's.
 */
export const useKeepScrollOnVirtualizerMount = (getScrollElement: () => HTMLElement | null) => {
  const [scrollTopBeforeMount] = useState(() => getScrollElement()?.scrollTop ?? null);

  useLayoutEffect(() => {
    if (scrollTopBeforeMount === null) return;
    const element = getScrollElement();
    if (element && element.scrollTop !== scrollTopBeforeMount) {
      element.scrollTop = scrollTopBeforeMount;
    }
    // Mount only: later scrolls belong to the reader and to the virtualizer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

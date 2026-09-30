"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { parseVoxHref, shouldNavigateByHash } from "@/features/vox/detail/anchorNavigation";
import { buildVoxPanelDetailHref } from "@/lib/notifications/links";
import type { NotificationPanelVirtualRow } from "@/features/notifications/panelVirtualListRow";

export type VoxPanelBellRow = { voxId: string; readAt: string | null };

export type UseVoxPanelBellListArgs<TItem extends VoxPanelBellRow> = {
  ownerUserId: string | undefined;
  enabled: boolean;
  fetchList: () => Promise<TItem[]>;
  readCachedItems: (ownerId: string) => TItem[] | null;
  writePanelCache: (ownerId: string, items: TItem[]) => void;
  /** The returned value is ignored; some implementations report how many were marked. */
  postMarkReadForVox: (voxId: string) => Promise<unknown>;
  refresh: () => Promise<void>;
};

export const useVoxPanelBellList = <TItem extends VoxPanelBellRow>({
  ownerUserId,
  enabled,
  fetchList,
  readCachedItems,
  writePanelCache,
  postMarkReadForVox,
  refresh,
}: UseVoxPanelBellListArgs<TItem>) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(
    async (opts?: { blockUi?: boolean; cacheUserId: string | null }) => {
      const blockUi = opts?.blockUi ?? true;
      const uid = opts?.cacheUserId ?? null;
      if (blockUi) setLoading(true);
      try {
        const list = await fetchList();
        setItems(list);
        if (uid) writePanelCache(uid, list);
      } catch {
        if (blockUi) setItems([]);
      } finally {
        if (blockUi) setLoading(false);
      }
    },
    [fetchList, writePanelCache],
  );

  useEffect(() => {
    if (open) {
      scrollParentRef.current?.scrollTo(0, 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !enabled || !ownerUserId) return;
    const cached = readCachedItems(ownerUserId);
    const hasCache = cached != null;
    startTransition(() => {
      if (hasCache) setItems(cached);
      void loadList({ blockUi: !hasCache, cacheUserId: ownerUserId });
    });
    // The counter lives in the store and the list is fetched here: after a missed live event the
    // badge and the rows could disagree, and opening the panel is where that shows.
    void refresh();
  }, [open, enabled, ownerUserId, loadList, readCachedItems, refresh]);

  const onRowActivate = useCallback(
    (row: NotificationPanelVirtualRow, e: MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      e.preventDefault();
      const href = buildVoxPanelDetailHref(row);
      setOpen(false);
      // See `features/vox/detail/anchorNavigation`: on the same vox the anchor must be set by hand.
      if (shouldNavigateByHash(href, window.location.pathname, window.location.hash)) {
        window.location.hash = parseVoxHref(href).hash;
      } else {
        router.push(href);
      }
      void (async () => {
        try {
          await postMarkReadForVox(row.voxId);
          const now = new Date().toISOString();
          setItems((prev) => {
            const next = prev.map((n) =>
              n.voxId === row.voxId && n.readAt == null ? ({ ...n, readAt: now } as TItem) : n,
            );
            if (ownerUserId) writePanelCache(ownerUserId, next);
            return next;
          });
        } catch {
          // ignore; refresh realigns the counter with the server
        }
        await refresh();
      })();
    },
    [ownerUserId, postMarkReadForVox, refresh, router, writePanelCache],
  );

  const runClearList = useCallback(
    (clearRequest: () => Promise<void>) => {
      void (async () => {
        setClearBusy(true);
        try {
          await clearRequest();
          setItems([]);
          if (ownerUserId) writePanelCache(ownerUserId, []);
          await refresh();
        } finally {
          setClearBusy(false);
        }
      })();
    },
    [ownerUserId, refresh, writePanelCache],
  );

  return {
    open,
    setOpen,
    items,
    loading,
    clearBusy,
    scrollParentRef,
    onRowActivate,
    runClearList,
  };
};

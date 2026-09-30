"use client";

import { useEffect } from "react";
import { useCategoryFilterStore } from "@/features/vox/categoryFilterStore";
import { useVoxStore } from "@/features/vox/store";
import type { VoxListItem } from "@/lib/vox/types";
import { shouldSignalNewVoxOnHomeFeed } from "@/features/vox/feed/socketFilters";
import { acquireRealtimeRoom } from "@/features/realtime/acquire";
import { FEED_HOME_ROOM } from "@/lib/realtime/rooms";
import { realtimePushEnabled } from "@/lib/realtime/mode";

type Args = {
  enabled: boolean;
  categoryCode?: string | null;
};

export const useHomeFeedPush = ({ enabled, categoryCode }: Args) => {
  const enabledByCategory = useCategoryFilterStore((s) => s.enabledByCategory);
  const setPendingNewVox = useVoxStore((s) => s.setPendingNewVox);
  const removeVoxFromDefaultFeed = useVoxStore((s) => s.removeVoxFromDefaultFeed);
  const removeVoxIdsFromDefaultFeed = useVoxStore((s) => s.removeVoxIdsFromDefaultFeed);
  const patchVoxInDefaultFeed = useVoxStore((s) => s.patchVoxInDefaultFeed);
  const applyHomeFeedActivity = useVoxStore((s) => s.applyHomeFeedActivity);
  const applyVoxPinInDefaultFeed = useVoxStore((s) => s.applyVoxPinInDefaultFeed);
  const prependNewVoxFromServer = useVoxStore((s) => s.prependNewVoxFromServer);

  useEffect(() => {
    if (!realtimePushEnabled()) return;
    const filterCategoryCode = categoryCode?.trim().toUpperCase() ?? null;
    if (!enabled) return;

    let cancelled = false;
    let teardown: (() => void) | undefined;

    void acquireRealtimeRoom({ room: FEED_HOME_ROOM }).then(
      (lease) => {
        if (!lease) return;
        if (cancelled) {
          lease.release();
          return;
        }

        const onCreated = (item: VoxListItem) => {
          if (
            shouldSignalNewVoxOnHomeFeed(item, {
              categoryCode: filterCategoryCode,
              enabledByCategory,
            })
          ) {
            setPendingNewVox(true);
          }
        };
        const syncAfterReconnect = () => {
          void prependNewVoxFromServer();
        };
        const onDeleted = (payload: { voxId?: string }) => {
          const voxId = payload?.voxId;
          if (voxId) removeVoxFromDefaultFeed(voxId);
        };
        const onBulkDeleted = (payload: { voxIds?: string[] }) => {
          const ids = payload?.voxIds;
          if (Array.isArray(ids) && ids.length > 0) removeVoxIdsFromDefaultFeed(ids);
        };
        const onActivity = (payload: { voxId?: string; replies?: number }) => {
          const voxId = payload?.voxId;
          const replies = payload?.replies;
          if (!voxId || typeof replies !== "number") return;
          applyHomeFeedActivity(voxId, replies);
        };
        const onUpdated = (payload: {
          voxId?: string;
          category?: string;
          pinnedAt?: string | null;
          title?: string;
        }) => {
          const voxId = payload?.voxId;
          if (!voxId) return;
          if (payload.pinnedAt !== undefined) {
            applyVoxPinInDefaultFeed(voxId, payload.pinnedAt);
          }
          if (typeof payload.title === "string") {
            patchVoxInDefaultFeed(voxId, { title: payload.title });
          }
          if (typeof payload.category !== "string") return;
          patchVoxInDefaultFeed(voxId, { category: payload.category });
          if (
            !shouldSignalNewVoxOnHomeFeed(
              { category: payload.category },
              {
                categoryCode: filterCategoryCode,
                enabledByCategory,
              },
            )
          ) {
            removeVoxFromDefaultFeed(voxId);
          }
        };

        lease.onReconnect(syncAfterReconnect);
        lease.on("vox:created", onCreated as (data: unknown) => void);
        lease.on("vox:deleted", onDeleted as (data: unknown) => void);
        lease.on("vox:bulk-deleted", onBulkDeleted as (data: unknown) => void);
        lease.on("vox:activity", onActivity as (data: unknown) => void);
        lease.on("vox:updated", onUpdated as (data: unknown) => void);

        teardown = () => {
          lease.offReconnect(syncAfterReconnect);
          lease.off("vox:created", onCreated as (data: unknown) => void);
          lease.off("vox:deleted", onDeleted as (data: unknown) => void);
          lease.off("vox:bulk-deleted", onBulkDeleted as (data: unknown) => void);
          lease.off("vox:activity", onActivity as (data: unknown) => void);
          lease.off("vox:updated", onUpdated as (data: unknown) => void);
          lease.release();
        };
      },
      () => undefined,
    );

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [
    enabled,
    categoryCode,
    enabledByCategory,
    setPendingNewVox,
    removeVoxFromDefaultFeed,
    removeVoxIdsFromDefaultFeed,
    patchVoxInDefaultFeed,
    applyHomeFeedActivity,
    applyVoxPinInDefaultFeed,
    prependNewVoxFromServer,
  ]);
};

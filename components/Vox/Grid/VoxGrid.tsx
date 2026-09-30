"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVoxStore } from "@/features/vox/store";
import {
  isCategoryVisibleOnHome,
  useCategoryFilterStore,
} from "@/features/vox/categoryFilterStore";
import type { VoxListPage, VoxListView } from "@/lib/vox/types";
import { readSessionHint } from "@/features/auth/sessionHint";
import { getCategoryFromCode } from "@/lib/vox/categoryCodes";
import { Button } from "@/components/ui/button";
import { FriendlyError } from "@/components/Shell/FriendlyError";
import { VoxGridSkeleton } from "@/components/Vox/Grid/VoxGridSkeleton";
import {
  getVoxGridTrackLayout,
  readGridTrackWidthPx,
  VOX_GRID_TRACK_PADDING_TOP_PX,
} from "@/features/vox/grid/gridLayout";
import { canMeasureVoxGridTrack } from "@/features/vox/grid/trackGate";
import type { VoxGridFeedFlags } from "@/components/Vox/Grid/gridTypes";
import { PersonalVoxStaticGrid } from "@/components/Vox/Grid/PersonalVoxStaticGrid";
import { HomeVoxWindowGrid } from "@/components/Vox/Grid/HomeVoxWindowGrid";
import { HomeFeedNewVoxBanner } from "@/components/Vox/Grid/HomeFeedNewVoxBanner";

const voxGridTrackPaddingStyle = {
  paddingTop: `${VOX_GRID_TRACK_PADDING_TOP_PX}px`,
} as const;

type Props = {
  categoryCode?: string | null;
  /** Public first page embedded in the HTML (home and `/[code]`), used only without a session. */
  initialPage?: VoxListPage | null;
  listView?: VoxListView;
  /** Title search through the API for the main list; not combined with `categoryCode`. */
  searchQuery?: string | null;
};

export const VoxGrid = ({
  categoryCode,
  initialPage,
  listView = "default",
  searchQuery,
}: Props) => {
  const { feeds, fetchInitialPage, fetchNextPage, seedDefaultFeed } = useVoxStore();
  const feed = feeds[listView];
  const enabledByCategory = useCategoryFilterStore((s) => s.enabledByCategory);
  const searchMode = Boolean(searchQuery?.trim()) && listView === "default";
  const homeFeedRealtimeEnabled = listView === "default" && !searchMode;

  const clearPendingNewVox = useVoxStore((s) => s.clearPendingNewVox);
  useEffect(() => {
    if (!homeFeedRealtimeEnabled) clearPendingNewVox();
  }, [homeFeedRealtimeEnabled, categoryCode, clearPendingNewVox]);

  // Before the first paint and before the effect that calls the API: the grid shows without waiting
  // for the network and that request refreshes it. Not with a session: the public list would show hidden vox.
  useLayoutEffect(() => {
    if (!initialPage || listView !== "default" || searchQuery?.trim()) return;
    if (readSessionHint()) return;
    seedDefaultFeed(initialPage, categoryCode ?? null);
    // Mount only: afterwards the grid lives on the store and realtime events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchInitialPage(listView, {
      categoryCode: listView === "default" ? (categoryCode ?? null) : null,
      searchQuery: listView === "default" ? (searchQuery ?? null) : null,
    });
  }, [fetchInitialPage, listView, categoryCode, searchQuery]);

  const filtered = useMemo(() => {
    const code = categoryCode?.trim().toUpperCase() ?? null;
    const targetCategory = code ? getCategoryFromCode(code) : null;
    return feed.items.filter((vox) => {
      if (searchMode) {
        return true;
      }
      if (targetCategory) {
        return vox.category === targetCategory;
      }
      if (listView === "default") {
        return isCategoryVisibleOnHome(enabledByCategory, vox.category);
      }
      return true;
    });
  }, [feed.items, categoryCode, enabledByCategory, listView, searchMode]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [trackWidthPx, setTrackWidthPx] = useState(0);
  const trackGridReady = canMeasureVoxGridTrack({
    loadingInitial: feed.loadingInitial,
    error: feed.error,
    itemCount: filtered.length,
  });

  useLayoutEffect(() => {
    if (!trackGridReady) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setTrackWidthPx(readGridTrackWidthPx(el));
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [trackGridReady]);

  const { columns, columnWidth } = getVoxGridTrackLayout(trackWidthPx);

  const rowHeight = Math.max(1, columnWidth);
  const rowCount = Math.ceil(filtered.length / columns);

  const feedFlags: VoxGridFeedFlags = {
    hasMore: feed.hasMore,
    loadingMore: feed.loadingMore,
    loadingInitial: feed.loadingInitial,
  };

  if (feed.loadingInitial) {
    return (
      <div className="px-2 pb-4 sm:px-3" style={voxGridTrackPaddingStyle}>
        <VoxGridSkeleton count={12} />
      </div>
    );
  }
  if (feed.error) {
    return (
      <div className="mx-auto max-w-lg px-3 py-10 sm:px-4">
        <FriendlyError title="No pudimos cargar el inicio" message={feed.error} />
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer border-fg/30 bg-surface-raised text-fg hover:bg-fg/10"
            onClick={() =>
              void fetchInitialPage(listView, {
                force: true,
                categoryCode: listView === "default" ? (categoryCode ?? null) : null,
                searchQuery: listView === "default" ? (searchQuery ?? null) : null,
              })
            }
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <p className="px-2 py-8 text-sm text-fg-muted sm:px-3">
        {searchMode
          ? "No encontramos vox con ese título. Probá con otras palabras o revisá la ortografía."
          : "No hay vox para mostrar con estos filtros."}
      </p>
    );
  }

  return (
    <>
      {homeFeedRealtimeEnabled ? <HomeFeedNewVoxBanner /> : null}
      <div
        ref={containerRef}
        className="min-w-0 px-2 pb-4 sm:px-3"
        style={voxGridTrackPaddingStyle}
      >
        {listView === "default" ? (
          <HomeVoxWindowGrid
            filtered={filtered}
            columns={columns}
            columnWidth={columnWidth}
            rowHeight={rowHeight}
            rowCount={rowCount}
            fetchNextPage={fetchNextPage}
            feed={feedFlags}
          />
        ) : (
          <PersonalVoxStaticGrid
            filtered={filtered}
            columns={columns}
            columnWidth={columnWidth}
            listView={listView}
            fetchNextPage={fetchNextPage}
            feed={feedFlags}
          />
        )}
      </div>
    </>
  );
};

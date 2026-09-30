import { create } from "zustand";
import { getVoxListPage } from "./api";
import type { VoxListItem, VoxListPage, VoxListView } from "@/lib/vox/types";
import {
  applyVoxPinToItems,
  patchVoxListItemsInPlace,
  prependNewVoxItemsPreservingOrder,
} from "@/features/vox/feed/merge";
import { HOME_ACTIVITY_FLASH_MS } from "@/features/vox/constants";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { VOX_LIST_PAGE_SIZE } from "@/lib/limits";

type VoxFeedViewState = {
  items: VoxListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
};

const emptyFeed = (): VoxFeedViewState => ({
  items: [],
  nextCursor: null,
  hasMore: true,
  loadingInitial: false,
  loadingMore: false,
  error: null,
});

/** Initial state: a skeleton until the first load, instead of a flash of "no vox". */
const pendingFeed = (): VoxFeedViewState => ({ ...emptyFeed(), loadingInitial: true });

const normalizeListCategoryCode = (code: string | null | undefined): string | null => {
  if (code == null) return null;
  const t = String(code).trim();
  return t ? t.toUpperCase() : null;
};

interface VoxState {
  feeds: Record<VoxListView, VoxFeedViewState>;
  /** Category code from the URL for the `default` feed (null for the unfiltered home). */
  defaultListCategoryCode: string | null;
  /** Title search for the `default` feed (null without search). */
  defaultListSearchQuery: string | null;
  currentListView: VoxListView;
  /** Loads the first page embedded in the HTML; the usual `fetchInitialPage` refreshes it in the background. */
  seedDefaultFeed: (page: VoxListPage, categoryCode: string | null) => void;
  fetchInitialPage: (
    view?: VoxListView,
    opts?: {
      force?: boolean;
      limit?: number;
      categoryCode?: string | null;
      searchQuery?: string | null;
    },
  ) => Promise<void>;
  fetchNextPage: (view?: VoxListView, opts?: { limit?: number }) => Promise<void>;
  refreshCurrentView: () => Promise<void>;
  resetView: (view: VoxListView) => void;
  removeVoxFromFeeds: (voxId: string) => void;
  setVoxFavoritedInFeeds: (voxId: string, favorited: boolean) => void;
  pendingNewVox: boolean;
  activityFlashUntil: Record<string, number>;
  setPendingNewVox: (value: boolean) => void;
  clearPendingNewVox: () => void;
  registerActivityFlash: (voxId: string, durationMs?: number) => void;
  isActivityFlashing: (voxId: string) => boolean;
  removeVoxFromDefaultFeed: (voxId: string) => void;
  removeVoxIdsFromDefaultFeed: (voxIds: string[]) => void;
  patchVoxInDefaultFeed: (voxId: string, patch: Partial<VoxListItem>) => void;
  applyHomeFeedActivity: (voxId: string, replies?: number) => void;
  applyVoxPinInDefaultFeed: (voxId: string, pinnedAt: string | null) => void;
  prependNewVoxFromServer: () => Promise<void>;
}

/** Which list the `default` feed shows (category + search); responses for an older list are dropped. */
const defaultListKey = (s: {
  defaultListCategoryCode: string | null;
  defaultListSearchQuery: string | null;
}) => `${s.defaultListCategoryCode ?? ""}\u0000${s.defaultListSearchQuery ?? ""}`;

const parseAxiosStatus = (e: unknown): number | undefined =>
  (
    e as {
      response?: {
        status?: number;
      };
    }
  ).response?.status;

export const useVoxStore = create<VoxState>((set, get) => ({
  feeds: {
    default: pendingFeed(),
    hidden: pendingFeed(),
    favorites: pendingFeed(),
    mine: pendingFeed(),
  },
  defaultListCategoryCode: null,
  defaultListSearchQuery: null,
  currentListView: "default",
  pendingNewVox: false,
  activityFlashUntil: {},

  resetView: (view: VoxListView) => {
    set((s) => ({ feeds: { ...s.feeds, [view]: emptyFeed() } }));
  },

  seedDefaultFeed: (page, categoryCode) => {
    const code = normalizeListCategoryCode(categoryCode);
    const sameList = get().defaultListCategoryCode === code && !get().defaultListSearchQuery;
    // When the store already has this list, it is newer than the HTML's (which may come from the router cache).
    if (sameList && get().feeds.default.items.length > 0) return;
    set((s) => ({
      defaultListCategoryCode: code,
      defaultListSearchQuery: null,
      currentListView: "default",
      pendingNewVox: false,
      feeds: {
        ...s.feeds,
        default: {
          ...emptyFeed(),
          items: page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        },
      },
    }));
  },

  fetchInitialPage: async (
    view?: VoxListView,
    opts?: {
      force?: boolean;
      limit?: number;
      categoryCode?: string | null;
      searchQuery?: string | null;
    },
  ) => {
    const v = view ?? get().currentListView;

    if (v !== "default") {
      set({ defaultListCategoryCode: null, defaultListSearchQuery: null });
    }

    if (v === "default") {
      const requestedCat =
        opts && "categoryCode" in opts
          ? normalizeListCategoryCode(opts.categoryCode)
          : get().defaultListCategoryCode;
      const requestedSearch =
        opts && "searchQuery" in opts
          ? opts.searchQuery?.trim()
            ? opts.searchQuery.trim()
            : null
          : get().defaultListSearchQuery;
      const prevCat = get().defaultListCategoryCode;
      const prevSearch = get().defaultListSearchQuery;
      if (requestedCat !== prevCat || requestedSearch !== prevSearch) {
        set((s) => ({
          defaultListCategoryCode: requestedCat,
          defaultListSearchQuery: requestedSearch,
          feeds: { ...s.feeds, default: emptyFeed() },
          currentListView: v,
          pendingNewVox: false,
        }));
      }
    }

    const requestedListKey = defaultListKey(get());
    const isStale = () => v === "default" && defaultListKey(get()) !== requestedListKey;
    const current = get().feeds[v];
    const hasUsableCache = current.items.length > 0 && current.error === null;
    set((s) => ({
      currentListView: v,
      feeds: {
        ...s.feeds,
        [v]: {
          ...s.feeds[v],
          error: null,
          ...(hasUsableCache && !opts?.force ? {} : { loadingInitial: true }),
        },
      },
    }));

    try {
      const page = await getVoxListPage({
        view: v,
        cursor: null,
        limit: opts?.limit ?? VOX_LIST_PAGE_SIZE,
        categoryCode: v === "default" ? get().defaultListCategoryCode : null,
        searchQuery: v === "default" ? get().defaultListSearchQuery : null,
      });
      if (isStale()) return;
      set((s) => ({
        feeds: {
          ...s.feeds,
          [v]: {
            ...s.feeds[v],
            items: page.items,
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
            loadingInitial: false,
            loadingMore: false,
            error: null,
          },
        },
        ...(v === "default" ? { pendingNewVox: false } : {}),
      }));
    } catch (e: unknown) {
      if (isStale()) return;
      const status = parseAxiosStatus(e);
      const apiMsg = userFacingApiErrorMessage(e);
      const message =
        status === 401 && v === "hidden"
          ? "Tenés que iniciar sesión para ver los vox ocultos."
          : status === 401 && v === "favorites"
            ? "Tenés que iniciar sesión para ver tus favoritos."
            : status === 401 && v === "mine"
              ? "Tenés que iniciar sesión para ver tus vox."
              : (apiMsg ?? "Error al cargar los vox");
      set((s) => ({
        feeds: {
          ...s.feeds,
          [v]: {
            ...s.feeds[v],
            error: message,
            loadingInitial: false,
            loadingMore: false,
          },
        },
      }));
    }
  },

  fetchNextPage: async (view?: VoxListView, opts?: { limit?: number }) => {
    const v = view ?? get().currentListView;
    const current = get().feeds[v];
    if (!current.hasMore || current.loadingMore || current.loadingInitial) return;
    if (!current.nextCursor) return;
    const requestedListKey = defaultListKey(get());
    // Besides the list, the cursor: refreshing the same list restarts pagination.
    const isStale = () =>
      get().feeds[v].nextCursor !== current.nextCursor ||
      (v === "default" && defaultListKey(get()) !== requestedListKey);

    set((s) => ({
      currentListView: v,
      feeds: {
        ...s.feeds,
        [v]: { ...s.feeds[v], loadingMore: true, error: null },
      },
    }));

    try {
      const page = await getVoxListPage({
        view: v,
        cursor: current.nextCursor,
        limit: opts?.limit ?? VOX_LIST_PAGE_SIZE,
        categoryCode: v === "default" ? get().defaultListCategoryCode : null,
        searchQuery: v === "default" ? get().defaultListSearchQuery : null,
      });
      if (isStale()) return;

      set((s) => {
        const existingIds = new Set(s.feeds[v].items.map((it) => it.id));
        const merged = s.feeds[v].items.concat(page.items.filter((it) => !existingIds.has(it.id)));
        return {
          feeds: {
            ...s.feeds,
            [v]: {
              ...s.feeds[v],
              items: merged,
              nextCursor: page.nextCursor,
              hasMore: page.hasMore,
              loadingMore: false,
              error: null,
            },
          },
        };
      });
    } catch (e: unknown) {
      if (isStale()) return;
      const status = parseAxiosStatus(e);
      const apiMsg = userFacingApiErrorMessage(e);
      const message =
        status === 401 && v === "hidden"
          ? "Tenés que iniciar sesión para ver los vox ocultos."
          : status === 401 && v === "favorites"
            ? "Tenés que iniciar sesión para ver tus favoritos."
            : status === 401 && v === "mine"
              ? "Tenés que iniciar sesión para ver tus vox."
              : (apiMsg ?? "Error al cargar los vox");
      set((s) => ({
        feeds: {
          ...s.feeds,
          [v]: { ...s.feeds[v], loadingMore: false, error: message },
        },
      }));
    }
  },

  refreshCurrentView: async () => {
    const v = get().currentListView;
    get().resetView(v);
    const cat = v === "default" ? get().defaultListCategoryCode : null;
    const sq = v === "default" ? get().defaultListSearchQuery : null;
    await get().fetchInitialPage(v, { force: true, categoryCode: cat, searchQuery: sq });
  },

  removeVoxFromFeeds: (voxId: string) => {
    set((s) => {
      const views = Object.keys(s.feeds) as VoxListView[];
      const feeds = { ...s.feeds };
      for (const key of views) {
        feeds[key] = {
          ...feeds[key],
          items: feeds[key].items.filter((it) => it.id !== voxId),
        };
      }
      return { feeds };
    });
  },

  setVoxFavoritedInFeeds: (voxId: string, favorited: boolean) => {
    set((s) => {
      const views = Object.keys(s.feeds) as VoxListView[];
      const feeds = { ...s.feeds };
      for (const key of views) {
        feeds[key] = {
          ...feeds[key],
          items: feeds[key].items.map((it) => (it.id === voxId ? { ...it, favorited } : it)),
        };
      }
      return { feeds };
    });
  },

  setPendingNewVox: (value: boolean) => set({ pendingNewVox: value }),

  clearPendingNewVox: () => set({ pendingNewVox: false }),

  registerActivityFlash: (voxId: string, durationMs = HOME_ACTIVITY_FLASH_MS) => {
    const until = Date.now() + durationMs;
    set((s) => ({
      activityFlashUntil: { ...s.activityFlashUntil, [voxId]: until },
    }));
    globalThis.setTimeout(() => {
      set((s) => {
        if (s.activityFlashUntil[voxId] !== until) return s;
        const nextFlash = { ...s.activityFlashUntil };
        delete nextFlash[voxId];
        const activityFlashUntil = nextFlash;
        return { activityFlashUntil };
      });
    }, durationMs);
  },

  isActivityFlashing: (voxId: string) => {
    const until = get().activityFlashUntil[voxId];
    if (!until) return false;
    if (Date.now() >= until) return false;
    return true;
  },

  removeVoxFromDefaultFeed: (voxId: string) => {
    set((s) => ({
      feeds: {
        ...s.feeds,
        default: {
          ...s.feeds.default,
          items: s.feeds.default.items.filter((it) => it.id !== voxId),
        },
      },
    }));
  },

  removeVoxIdsFromDefaultFeed: (voxIds: string[]) => {
    if (voxIds.length === 0) return;
    const drop = new Set(voxIds);
    set((s) => ({
      feeds: {
        ...s.feeds,
        default: {
          ...s.feeds.default,
          items: s.feeds.default.items.filter((it) => !drop.has(it.id)),
        },
      },
    }));
  },

  patchVoxInDefaultFeed: (voxId: string, patch: Partial<VoxListItem>) => {
    set((s) => {
      const items = patchVoxListItemsInPlace(s.feeds.default.items, voxId, patch);
      if (items === s.feeds.default.items) return s;
      return {
        feeds: {
          ...s.feeds,
          default: { ...s.feeds.default, items },
        },
      };
    });
  },

  applyHomeFeedActivity: (voxId: string, replies?: number) => {
    const item = get().feeds.default.items.find((v) => v.id === voxId);
    if (!item) return;
    const nextReplies = typeof replies === "number" ? replies : item.replies + 1;
    get().patchVoxInDefaultFeed(voxId, { replies: nextReplies });
    get().registerActivityFlash(voxId);
  },

  applyVoxPinInDefaultFeed: (voxId: string, pinnedAt: string | null) => {
    set((s) => {
      const items = applyVoxPinToItems(s.feeds.default.items, voxId, pinnedAt);
      if (items === s.feeds.default.items) return s;
      return {
        feeds: {
          ...s.feeds,
          default: { ...s.feeds.default, items },
        },
      };
    });
  },

  prependNewVoxFromServer: async () => {
    const cat = get().defaultListCategoryCode;
    const sq = get().defaultListSearchQuery;
    if (sq) return;
    try {
      const page = await getVoxListPage({
        view: "default",
        cursor: null,
        limit: VOX_LIST_PAGE_SIZE,
        categoryCode: cat,
        searchQuery: null,
      });
      set((s) => ({
        pendingNewVox: false,
        feeds: {
          ...s.feeds,
          default: {
            ...s.feeds.default,
            items: prependNewVoxItemsPreservingOrder(s.feeds.default.items, page.items),
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
          },
        },
      }));
    } catch {
      /* the user can retry with the button */
    }
  },
}));

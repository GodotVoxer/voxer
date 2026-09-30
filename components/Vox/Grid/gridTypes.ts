import type { VoxListItem, VoxListView } from "@/lib/vox/types";

export type VoxGridFeedFlags = {
  hasMore: boolean;
  loadingMore: boolean;
  loadingInitial: boolean;
};

export type PersonalVoxStaticGridProps = {
  filtered: VoxListItem[];
  columns: number;
  columnWidth: number;
  listView: VoxListView;
  fetchNextPage: (view?: VoxListView, opts?: { limit?: number }) => Promise<void>;
  feed: VoxGridFeedFlags;
};

export type HomeVoxWindowGridProps = {
  filtered: VoxListItem[];
  columns: number;
  columnWidth: number;
  rowHeight: number;
  rowCount: number;
  fetchNextPage: (view?: VoxListView, opts?: { limit?: number }) => Promise<void>;
  feed: VoxGridFeedFlags;
};

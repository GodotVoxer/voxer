import type { VoxListItem } from "@/lib/vox/types";

const MERGE_PATCH_KEYS: (keyof VoxListItem)[] = [
  "title",
  "category",
  "thumbnailUrl",
  "coverGifUrl",
  "mediaType",
  "replies",
  "createdAt",
  "favorited",
  "hasPoll",
  "pinnedAt",
];

export const mergeVoxListItemPatch = (
  existing: VoxListItem,
  patch: Partial<VoxListItem>,
): VoxListItem => {
  const next = { ...existing };
  for (const key of MERGE_PATCH_KEYS) {
    if (patch[key] !== undefined) {
      (next as Record<string, unknown>)[key] = patch[key];
    }
  }
  return next;
};

export const patchVoxListItemsInPlace = (
  items: VoxListItem[],
  voxId: string,
  patch: Partial<VoxListItem>,
): VoxListItem[] => {
  let changed = false;
  const next = items.map((it) => {
    if (it.id !== voxId) return it;
    changed = true;
    return mergeVoxListItemPatch(it, patch);
  });
  return changed ? next : items;
};

/** Pinned vox go first, newest pin first, as in `server/vox/list.ts`. */
const pinnedRank = (item: VoxListItem): number | null => {
  if (!item.pinnedAt) return null;
  const ms = Date.parse(item.pinnedAt);
  return Number.isNaN(ms) ? 0 : ms;
};

const pinnedFirst = (items: VoxListItem[]): VoxListItem[] => {
  const pinned: VoxListItem[] = [];
  const rest: VoxListItem[] = [];
  for (const item of items) {
    (pinnedRank(item) === null ? rest : pinned).push(item);
  }
  if (pinned.length === 0) return items;
  pinned.sort((a, b) => (pinnedRank(b) ?? 0) - (pinnedRank(a) ?? 0));
  return [...pinned, ...rest];
};

/** Pin changes arrive as `vox:updated`; an unpinned vox goes to the front of the rest until the next page corrects it. */
export const applyVoxPinToItems = (
  items: VoxListItem[],
  voxId: string,
  pinnedAt: string | null,
): VoxListItem[] => {
  const patched = patchVoxListItemsInPlace(items, voxId, { pinnedAt });
  if (patched === items) return items;
  return pinnedFirst(patched);
};

export const prependNewVoxItemsPreservingOrder = (
  current: VoxListItem[],
  fromServer: VoxListItem[],
): VoxListItem[] => {
  const existingIds = new Set(current.map((v) => v.id));
  const fresh = fromServer.filter((v) => !existingIds.has(v.id));
  const serverById = new Map(fromServer.map((v) => [v.id, v]));
  const updatedCurrent = current.map((it) => {
    const server = serverById.get(it.id);
    return server ? mergeVoxListItemPatch(it, server) : it;
  });

  if (fresh.length === 0) return pinnedFirst(updatedCurrent);
  return pinnedFirst([...fresh, ...updatedCurrent]);
};

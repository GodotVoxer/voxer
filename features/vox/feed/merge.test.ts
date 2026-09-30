import { describe, expect, it } from "vitest";
import {
  applyVoxPinToItems,
  mergeVoxListItemPatch,
  patchVoxListItemsInPlace,
  prependNewVoxItemsPreservingOrder,
} from "@/features/vox/feed/merge";
import type { VoxListItem } from "@/lib/vox/types";

const item = (id: string, replies = 0): VoxListItem => ({
  id,
  title: `T ${id}`,
  category: "General",
  thumbnailUrl: null,
  coverGifUrl: null,
  animatedImage: false,
  mediaType: "IMAGE",
  replies,
  createdAt: "2026-01-01T00:00:00.000Z",
  favorited: false,
  hasPoll: false,
  pinnedAt: null,
});

describe("homeFeedMerge", () => {
  it("patchVoxListItemsInPlace updates replies without reordering", () => {
    const items = [item("a", 1), item("b", 2)];
    const next = patchVoxListItemsInPlace(items, "b", { replies: 5 });
    expect(next.map((v) => v.id)).toEqual(["a", "b"]);
    expect(next[1]?.replies).toBe(5);
  });

  it("prependNewVoxItemsPreservingOrder adds new items first", () => {
    const current = [item("a"), item("b")];
    const server = [item("new"), item("a"), item("b")];
    const next = prependNewVoxItemsPreservingOrder(current, server);
    expect(next.map((v) => v.id)).toEqual(["new", "a", "b"]);
  });

  it("prependNewVoxItemsPreservingOrder keeps pinned vox before a new one", () => {
    const pinned = { ...item("pin"), pinnedAt: "2026-01-02T00:00:00.000Z" };
    const current = [pinned, item("a")];
    const server = [pinned, item("new"), item("a")];
    const next = prependNewVoxItemsPreservingOrder(current, server);
    expect(next.map((v) => v.id)).toEqual(["pin", "new", "a"]);
  });

  it("prependNewVoxItemsPreservingOrder sorts several pinned vox newest first", () => {
    const older = { ...item("older"), pinnedAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...item("newer"), pinnedAt: "2026-01-03T00:00:00.000Z" };
    const current = [older, item("a")];
    const server = [newer, older, item("fresh"), item("a")];
    const next = prependNewVoxItemsPreservingOrder(current, server);
    expect(next.map((v) => v.id)).toEqual(["newer", "older", "fresh", "a"]);
  });

  it("prependNewVoxItemsPreservingOrder moves a vox the server just pinned", () => {
    const current = [item("a"), item("b")];
    const server = [{ ...item("b"), pinnedAt: "2026-01-02T00:00:00.000Z" }, item("a")];
    const next = prependNewVoxItemsPreservingOrder(current, server);
    expect(next.map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("prependNewVoxItemsPreservingOrder keeps the order without new items", () => {
    const current = [item("a", 1), item("b", 2)];
    const server = [item("a", 9), item("b", 8)];
    const next = prependNewVoxItemsPreservingOrder(current, server);
    expect(next.map((v) => v.id)).toEqual(["a", "b"]);
    expect(next[0]?.replies).toBe(9);
    expect(next[1]?.replies).toBe(8);
  });

  it("applyVoxPinToItems moves a newly pinned vox to the front", () => {
    const items = [item("a"), item("b"), item("c")];
    const next = applyVoxPinToItems(items, "c", "2026-01-02T00:00:00.000Z");
    expect(next.map((v) => v.id)).toEqual(["c", "a", "b"]);
  });

  it("applyVoxPinToItems puts an unpinned vox behind the ones still pinned", () => {
    const items = [
      { ...item("pin1"), pinnedAt: "2026-01-03T00:00:00.000Z" },
      { ...item("pin2"), pinnedAt: "2026-01-02T00:00:00.000Z" },
      item("a"),
    ];
    const next = applyVoxPinToItems(items, "pin1", null);
    expect(next.map((v) => v.id)).toEqual(["pin2", "pin1", "a"]);
  });

  it("applyVoxPinToItems ignores a vox not in the list", () => {
    const items = [item("a")];
    expect(applyVoxPinToItems(items, "otro", "2026-01-02T00:00:00.000Z")).toBe(items);
  });

  it("mergeVoxListItemPatch leaves the id alone", () => {
    const base = item("x", 3);
    const merged = mergeVoxListItemPatch(base, { id: "y", replies: 7 });
    expect(merged.id).toBe("x");
    expect(merged.replies).toBe(7);
  });
});

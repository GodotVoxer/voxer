import { describe, expect, it } from "vitest";
import type { CommentPublic } from "@/lib/vox/types";
import { applyCommentPinnedToList, pinnedCommentsNewestFirst } from "@/features/comments/pinning";

const comment = (id: string, pinnedAt: string | null = null): CommentPublic => ({
  id,
  publicTag: id.toUpperCase(),
  body: "texto",
  displayName: "Anónimo",
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  avatarVariant: "BLUE",
  isOp: false,
  createdAt: "2026-09-23T10:00:00.000Z",
  isMine: false,
  pinnedAt,
});

describe("pinnedCommentsNewestFirst", () => {
  it("leaves out unpinned comments", () => {
    const list = [comment("a"), comment("b", "2026-09-23T10:00:00.000Z")];
    expect(pinnedCommentsNewestFirst(list).map((c) => c.id)).toEqual(["b"]);
  });

  it("sorts by the latest pin, not by comment date", () => {
    const list = [
      comment("viejo", "2026-09-23T12:00:00.000Z"),
      comment("nuevo", "2026-09-23T09:00:00.000Z"),
      comment("ultimo", "2026-09-23T18:00:00.000Z"),
    ];
    expect(pinnedCommentsNewestFirst(list).map((c) => c.id)).toEqual(["ultimo", "viejo", "nuevo"]);
  });

  it("does not mutate the input", () => {
    const list = [
      comment("a", "2026-09-23T10:00:00.000Z"),
      comment("b", "2026-09-23T11:00:00.000Z"),
    ];
    const snapshot = list.map((c) => c.id);
    pinnedCommentsNewestFirst(list);
    expect(list.map((c) => c.id)).toEqual(snapshot);
  });
});

describe("applyCommentPinnedToList", () => {
  it("pins the given comment", () => {
    const list = [comment("a"), comment("b")];
    const next = applyCommentPinnedToList(list, "b", "2026-09-23T10:00:00.000Z");
    expect(next[1].pinnedAt).toBe("2026-09-23T10:00:00.000Z");
    expect(next[0]).toBe(list[0]);
  });

  it("unpins with null", () => {
    const list = [comment("a", "2026-09-23T10:00:00.000Z")];
    expect(applyCommentPinnedToList(list, "a", null)[0].pinnedAt).toBeNull();
  });

  it("returns the same reference when nothing changes", () => {
    const list = [comment("a", "2026-09-23T10:00:00.000Z")];
    expect(applyCommentPinnedToList(list, "a", "2026-09-23T10:00:00.000Z")).toBe(list);
    expect(applyCommentPinnedToList(list, "desconocido", null)).toBe(list);
  });
});

import { describe, expect, it } from "vitest";
import type { CommentPublic } from "@/lib/vox/types";
import { mergeCommentIntoList, mergeCommentsIntoList } from "./merge";

const base = (
  overrides: Partial<CommentPublic> & Pick<CommentPublic, "id" | "publicTag">,
): CommentPublic => ({
  id: overrides.id,
  publicTag: overrides.publicTag,
  body: overrides.body ?? "x",
  displayName: overrides.displayName ?? "n",
  imageUrl: overrides.imageUrl ?? null,
  videoUrl: overrides.videoUrl ?? null,
  videoPosterUrl: overrides.videoPosterUrl ?? null,
  avatarVariant: overrides.avatarVariant ?? "BLUE",
  staffBadge: overrides.staffBadge ?? null,
  isOp: overrides.isOp ?? false,
  isMine: overrides.isMine ?? false,
  repliesMuted: overrides.repliesMuted,
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
});

describe("mergeCommentsIntoList", () => {
  it("reveals the pending batch with the posted comment and keeps the real order", () => {
    const existing = base({
      id: "existing",
      publicTag: "EXISTI",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const pending = base({
      id: "pending",
      publicTag: "PENDIN",
      createdAt: "2026-01-01T00:02:00.000Z",
    });
    const posted = base({
      id: "posted",
      publicTag: "POSTED",
      isMine: true,
      createdAt: "2026-01-01T00:03:00.000Z",
    });

    expect(
      mergeCommentsIntoList([existing], [pending, posted]).map((comment) => comment.id),
    ).toEqual(["posted", "pending", "existing"]);
  });
});

describe("mergeCommentIntoList", () => {
  it("same id: replaced with the incoming version (server or attachment)", () => {
    const a = base({ id: "1", publicTag: "AAAAAA", body: "viejo", imageUrl: null });
    const updated = { ...a, body: "nuevo", imageUrl: "https://example.com/a.gif" };
    expect(mergeCommentIntoList([a], updated)).toEqual([updated]);
  });

  it("same publicTag: the row is replaced with the incoming one", () => {
    const a = base({ id: "1", publicTag: "AAAAAA" });
    const sameTag = { ...a, id: "2", body: "otro" };
    expect(mergeCommentIntoList([a], sameTag)).toEqual([sameTag]);
  });

  it("inserts newest first", () => {
    const oldC = base({ id: "o", publicTag: "OLDOLD", createdAt: "2026-01-01T00:00:00.000Z" });
    const newC = base({ id: "n", publicTag: "NEWNEW", createdAt: "2026-01-02T00:00:00.000Z" });
    const merged = mergeCommentIntoList([oldC], newC);
    expect(merged.map((c) => c.id)).toEqual(["n", "o"]);
  });

  it("keeps isMine when either version is the viewer's", () => {
    const a = base({ id: "1", publicTag: "AAAAAA", isMine: true });
    const fromSocket = { ...a, isMine: false };
    expect(mergeCommentIntoList([a], fromSocket)[0]?.isMine).toBe(true);
  });
  it("keeps the viewer's mute when the reader-less room version arrives", () => {
    const mine = base({ id: "1", publicTag: "AAAAAA", isMine: true, repliesMuted: true });
    const fromRoom = base({ id: "1", publicTag: "AAAAAA", isMine: false, repliesMuted: false });
    const [merged] = mergeCommentIntoList([mine], fromRoom);
    expect(merged?.isMine).toBe(true);
    expect(merged?.repliesMuted).toBe(true);
  });
});

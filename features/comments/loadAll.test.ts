import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommentPublic } from "@/lib/vox/types";

import { fetchCommentsPage } from "@/features/vox/api";
import { loadAllCommentsForVox } from "./loadAll";

vi.mock("@/features/vox/api", () => ({
  fetchCommentsPage: vi.fn(),
}));

const sample = (id: string): CommentPublic => ({
  id,
  publicTag: "ABCDEF",
  body: "b",
  displayName: "d",
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  avatarVariant: "BLUE",
  staffBadge: null,
  isOp: false,
  isMine: false,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("loadAllCommentsForVox", () => {
  beforeEach(() => {
    vi.mocked(fetchCommentsPage).mockReset();
  });

  it("a single page when nextCursor is null", async () => {
    vi.mocked(fetchCommentsPage).mockResolvedValueOnce({
      comments: [sample("c1")],
      nextCursor: null,
    });
    const list = await loadAllCommentsForVox("vox-1");
    expect(list).toHaveLength(1);
    expect(fetchCommentsPage).toHaveBeenCalledTimes(1);
  });

  it("pages until nextCursor runs out", async () => {
    vi.mocked(fetchCommentsPage)
      .mockResolvedValueOnce({
        comments: [sample("a")],
        nextCursor: "cur1",
      })
      .mockResolvedValueOnce({
        comments: [sample("b")],
        nextCursor: null,
      });
    const list = await loadAllCommentsForVox("vox-1");
    expect(list.map((c) => c.id)).toEqual(["a", "b"]);
    expect(fetchCommentsPage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchCommentsPage).mock.calls[1]?.[1]?.cursor).toBe("cur1");
  });
});

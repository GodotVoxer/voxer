import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { SOFT_DELETE_GRACE_MS } from "@/lib/moderation/constants";
import { purgeExpiredSoftDeletes } from "./purgeExpiredSoftDeletes";

type VoxFindManyArgs = {
  where: { deletedAt: { lte: Date } };
  take: number;
  orderBy: { deletedAt: "asc" };
  select: unknown;
};
type CommentFindManyArgs = {
  where: { deletedAt: { lte: Date }; vox: { deletedAt: null } };
  take: number;
  orderBy: { deletedAt: "asc" };
  select: unknown;
};

const makeDb = () => {
  const voxFindMany = vi.fn();
  const voxDelete = vi.fn();
  const commentFindMany = vi.fn();
  const commentDelete = vi.fn();
  const db = {
    vox: { findMany: voxFindMany, delete: voxDelete },
    comment: { findMany: commentFindMany, delete: commentDelete },
  } as unknown as PrismaClient;
  return { db, voxFindMany, voxDelete, commentFindMany, commentDelete };
};

const now = new Date("2026-05-20T00:00:00.000Z");
const expectedCutoff = new Date(now.getTime() - SOFT_DELETE_GRACE_MS);

describe("purgeExpiredSoftDeletes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses cutoff = now - SOFT_DELETE_GRACE_MS and honours batchMax", async () => {
    const { db, voxFindMany, commentFindMany } = makeDb();
    voxFindMany.mockResolvedValueOnce([]);
    commentFindMany.mockResolvedValueOnce([]);

    await purgeExpiredSoftDeletes(db, now, 50);

    const voxArgs = voxFindMany.mock.calls[0]?.[0] as VoxFindManyArgs;
    expect(voxArgs.where.deletedAt.lte.getTime()).toBe(expectedCutoff.getTime());
    expect(voxArgs.take).toBe(50);
    expect(voxArgs.orderBy).toEqual({ deletedAt: "asc" });

    const commentArgs = commentFindMany.mock.calls[0]?.[0] as CommentFindManyArgs;
    expect(commentArgs.where.deletedAt.lte.getTime()).toBe(expectedCutoff.getTime());
    expect(commentArgs.where.vox).toEqual({ deletedAt: null });
    expect(commentArgs.take).toBe(50);
  });

  it("hard-deletes expired vox and collects their URLs and their comments'", async () => {
    const { db, voxFindMany, voxDelete, commentFindMany } = makeDb();
    voxFindMany.mockResolvedValueOnce([
      {
        id: "v1",
        mediaType: "IMAGE",
        mediaUrl: "/uploads/2026/05/v1-media.png",
        thumbnailUrl: "/uploads/2026/05/v1-thumb.png",
        comments: [
          { imageUrl: "/uploads/2026/05/c1.png", videoUrl: null, videoPosterUrl: null },
          { imageUrl: null, videoUrl: "/uploads/2026/05/c2.webm", videoPosterUrl: null },
        ],
      },
      {
        id: "v2",
        mediaType: "YOUTUBE",
        mediaUrl: "https://www.youtube.com/embed/abc",
        thumbnailUrl: "https://img.youtube.com/vi/abc/hqdefault.jpg",
        comments: [],
      },
    ]);
    voxDelete.mockResolvedValue({});
    commentFindMany.mockResolvedValueOnce([]);

    const r = await purgeExpiredSoftDeletes(db, now, 100);

    expect(voxDelete).toHaveBeenCalledTimes(2);
    expect(voxDelete).toHaveBeenCalledWith({ where: { id: "v1" } });
    expect(voxDelete).toHaveBeenCalledWith({ where: { id: "v2" } });
    expect(r.voxIds).toEqual(["v1", "v2"]);
    expect(new Set(r.urls)).toEqual(
      new Set([
        "/uploads/2026/05/v1-media.png",
        "/uploads/2026/05/v1-thumb.png",
        "/uploads/2026/05/c1.png",
        "/uploads/2026/05/c2.webm",
      ]),
    );
  });

  it("hard-deletes expired comments of live vox and collects their URLs", async () => {
    const { db, voxFindMany, commentFindMany, commentDelete } = makeDb();
    voxFindMany.mockResolvedValueOnce([]);
    commentFindMany.mockResolvedValueOnce([
      { id: "c1", imageUrl: "/uploads/2026/05/c1.png", videoUrl: null, videoPosterUrl: null },
      {
        id: "c2",
        imageUrl: null,
        videoUrl: "/uploads/2026/05/c2.webm",
        videoPosterUrl: "/uploads/2026/05/c2-poster.webp",
      },
      {
        id: "c3",
        imageUrl: "https://external.example/foo.png",
        videoUrl: null,
        videoPosterUrl: null,
      },
    ]);
    commentDelete.mockResolvedValue({});

    const r = await purgeExpiredSoftDeletes(db, now, 100);

    expect(commentDelete).toHaveBeenCalledTimes(3);
    expect(r.commentIds).toEqual(["c1", "c2", "c3"]);
    expect(new Set(r.urls)).toEqual(
      new Set([
        "/uploads/2026/05/c1.png",
        "/uploads/2026/05/c2.webm",
        "/uploads/2026/05/c2-poster.webp",
      ]),
    );
  });

  it("leaves comments of soft-deleted vox to the query filter", async () => {
    const { db, voxFindMany, commentFindMany, commentDelete } = makeDb();
    voxFindMany.mockResolvedValueOnce([]);
    commentFindMany.mockResolvedValueOnce([]);

    await purgeExpiredSoftDeletes(db, now, 100);

    const commentArgs = commentFindMany.mock.calls[0]?.[0] as CommentFindManyArgs;
    expect(commentArgs.where.vox).toEqual({ deletedAt: null });
    expect(commentDelete).not.toHaveBeenCalled();
  });

  it("tolerates a race: a failed vox.delete of a gone row is skipped without throwing", async () => {
    const { db, voxFindMany, voxDelete, commentFindMany } = makeDb();
    voxFindMany.mockResolvedValueOnce([
      {
        id: "vGone",
        mediaType: "IMAGE",
        mediaUrl: "/uploads/2026/05/g.png",
        thumbnailUrl: "/uploads/2026/05/g-thumb.png",
        comments: [],
      },
      {
        id: "vOk",
        mediaType: "IMAGE",
        mediaUrl: "/uploads/2026/05/ok.png",
        thumbnailUrl: "/uploads/2026/05/ok-thumb.png",
        comments: [],
      },
    ]);
    voxDelete.mockRejectedValueOnce(new Error("P2025")).mockResolvedValueOnce({});
    commentFindMany.mockResolvedValueOnce([]);

    const r = await purgeExpiredSoftDeletes(db, now, 100);

    expect(r.voxIds).toEqual(["vOk"]);
    expect(new Set(r.urls)).toEqual(
      new Set([
        "/uploads/2026/05/g.png",
        "/uploads/2026/05/g-thumb.png",
        "/uploads/2026/05/ok.png",
        "/uploads/2026/05/ok-thumb.png",
      ]),
    );
  });
});

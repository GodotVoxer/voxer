import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorCommentWhere,
  authorVoxWhere,
  bulkCutoffForBanContent,
  purgeAuthorPublicationMedia,
} from "./authorContent";

const { purgeManagedUploadUrlsNow } = vi.hoisted(() => ({
  purgeManagedUploadUrlsNow: vi.fn(),
}));

vi.mock("@/server/media/cleanupUnreferencedUploadUrls", () => ({ purgeManagedUploadUrlsNow }));

describe("author content filters", () => {
  it("skip hidden publications unless the media is being purged", () => {
    const cutoff = new Date("2026-10-01T00:00:00.000Z");
    expect(authorVoxWhere("u1", cutoff)).toEqual({
      ownerId: "u1",
      deletedAt: null,
      createdAt: { gte: cutoff },
    });
    expect(authorCommentWhere("u1", null, { includeDeleted: true })).toEqual({ authorId: "u1" });
  });

  it("has no cutoff for the whole history", () => {
    expect(bulkCutoffForBanContent({ kind: "forever" })).toBeNull();
    expect(
      bulkCutoffForBanContent({ kind: "relative", amount: 2, unit: "HOURS" }, 10 * 3_600_000),
    ).toEqual(new Date(8 * 3_600_000));
  });
});

describe("purgeAuthorPublicationMedia", () => {
  const voxFindMany = vi.fn();
  const voxUpdateMany = vi.fn();
  const commentFindMany = vi.fn();
  const commentUpdateMany = vi.fn();
  const transaction = vi.fn();
  const db = {
    vox: { findMany: voxFindMany, updateMany: voxUpdateMany },
    comment: { findMany: commentFindMany, updateMany: commentUpdateMany },
    $transaction: transaction,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    purgeManagedUploadUrlsNow.mockResolvedValue({ blockedHashes: 0 });
    transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
  });

  it("clears and purges the files of the author's vox, their comments and the author's comments", async () => {
    voxFindMany.mockResolvedValue([
      {
        id: "v1",
        mediaType: "IMAGE",
        mediaUrl: "/uploads/2026/10/a.webp",
        thumbnailUrl: "/uploads/2026/10/a-t.webp",
        comments: [
          { imageUrl: "/uploads/2026/10/reply.webp", videoUrl: null, videoPosterUrl: null },
        ],
      },
    ]);
    commentFindMany.mockResolvedValue([
      {
        id: "c9",
        voxId: "v7",
        imageUrl: null,
        videoUrl: "/uploads/2026/10/c.mp4",
        videoPosterUrl: "/uploads/2026/10/c.webp",
      },
    ]);
    purgeManagedUploadUrlsNow.mockResolvedValue({ blockedHashes: 4 });

    const r = await purgeAuthorPublicationMedia("u1", null, { blockHashes: true }, db as never);

    expect(voxFindMany.mock.calls[0]?.[0].where).toEqual({ ownerId: "u1" });
    expect(voxUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["v1"] } },
      data: { mediaUrl: null, thumbnailUrl: null, youtubeVideoId: null },
    });
    expect(commentUpdateMany).toHaveBeenCalledWith({
      where: { OR: [{ voxId: { in: ["v1"] } }, { id: { in: ["c9"] } }] },
      data: { imageUrl: null, videoUrl: null, videoPosterUrl: null },
    });
    expect(purgeManagedUploadUrlsNow).toHaveBeenCalledWith(
      expect.arrayContaining([
        "/uploads/2026/10/a.webp",
        "/uploads/2026/10/a-t.webp",
        "/uploads/2026/10/reply.webp",
        "/uploads/2026/10/c.mp4",
        "/uploads/2026/10/c.webp",
      ]),
      db,
      { blockHashes: true },
    );
    expect(r).toEqual({ fileCount: 5, blockedHashes: 4, voxIds: ["v1", "v7"] });
  });

  it("writes nothing when the author has no publications in the window", async () => {
    voxFindMany.mockResolvedValue([]);
    commentFindMany.mockResolvedValue([]);

    const r = await purgeAuthorPublicationMedia("u1", null, { blockHashes: false }, db as never);

    expect(transaction).not.toHaveBeenCalled();
    expect(r).toEqual({ fileCount: 0, blockedHashes: 0, voxIds: [] });
  });
});

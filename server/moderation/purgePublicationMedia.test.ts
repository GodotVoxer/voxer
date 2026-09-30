import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  staffPurgeCommentPublicationMedia,
  staffPurgeVoxPublicationMedia,
} from "./purgePublicationMedia";

const { emitToVoxRoom, purgeManagedUploadUrlsNow } = vi.hoisted(() => ({
  emitToVoxRoom: vi.fn(),
  purgeManagedUploadUrlsNow: vi.fn(),
}));

vi.mock("@/server/realtime/broadcast", () => ({ emitToVoxRoom }));
vi.mock("@/server/media/cleanupUnreferencedUploadUrls", () => ({
  purgeManagedUploadUrlsNow,
}));

describe("staffPurgeVoxPublicationMedia", () => {
  const findUnique = vi.fn();
  const voxUpdate = vi.fn();
  const commentUpdateMany = vi.fn();
  const transaction = vi.fn();

  const db = {
    vox: { findUnique, update: voxUpdate },
    comment: { updateMany: commentUpdateMany },
    $transaction: transaction,
  };

  beforeEach(() => {
    findUnique.mockReset();
    voxUpdate.mockReset();
    commentUpdateMany.mockReset();
    transaction.mockReset();
    emitToVoxRoom.mockReset();
    purgeManagedUploadUrlsNow.mockReset();
    purgeManagedUploadUrlsNow.mockResolvedValue({ blockedHashes: 0 });
    transaction.mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) {
        for (const op of ops) await op;
      }
    });
  });

  it("returns not_found when the vox does not exist", async () => {
    findUnique.mockResolvedValue(null);
    const r = await staffPurgeVoxPublicationMedia("missing", db as never);
    expect(r).toEqual({ ok: false, kind: "not_found" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("clears the media of the vox and all its comments", async () => {
    findUnique.mockResolvedValue({
      id: "v1",
      mediaType: "IMAGE",
      mediaUrl: "/uploads/2026/05/a.jpg",
      thumbnailUrl: "/uploads/2026/05/t.webp",
      comments: [
        {
          id: "c1",
          imageUrl: "/uploads/2026/05/c1.png",
          videoUrl: null,
          videoPosterUrl: null,
        },
      ],
    });
    voxUpdate.mockResolvedValue({});
    commentUpdateMany.mockResolvedValue({ count: 1 });

    const r = await staffPurgeVoxPublicationMedia("v1", db as never);

    expect(r).toEqual({ ok: true, voxId: "v1", commentIds: ["c1"], blockedHashes: 0 });
    expect(voxUpdate).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { mediaUrl: null, thumbnailUrl: null, youtubeVideoId: null },
    });
    expect(commentUpdateMany).toHaveBeenCalledWith({
      where: { voxId: "v1" },
      data: { imageUrl: null, videoUrl: null, videoPosterUrl: null },
    });
    expect(purgeManagedUploadUrlsNow).toHaveBeenCalledWith(
      expect.arrayContaining([
        "/uploads/2026/05/a.jpg",
        "/uploads/2026/05/t.webp",
        "/uploads/2026/05/c1.png",
      ]),
      db,
      { blockHashes: undefined },
    );
    expect(emitToVoxRoom).toHaveBeenCalledWith("v1", "vox:updated", { voxId: "v1" });
  });

  it("passes the hash block through and returns how many were blocked", async () => {
    findUnique.mockResolvedValue({
      id: "v1",
      mediaType: "IMAGE",
      mediaUrl: "/uploads/2026/05/a.jpg",
      thumbnailUrl: null,
      comments: [],
    });
    purgeManagedUploadUrlsNow.mockResolvedValue({ blockedHashes: 1 });

    const r = await staffPurgeVoxPublicationMedia("v1", db as never, { blockHashes: true });

    expect(purgeManagedUploadUrlsNow).toHaveBeenCalledWith(expect.anything(), db, {
      blockHashes: true,
    });
    expect(r).toMatchObject({ ok: true, blockedHashes: 1 });
  });
});

describe("staffPurgeCommentPublicationMedia", () => {
  const findUnique = vi.fn();
  const update = vi.fn();

  const db = {
    comment: { findUnique, update },
  };

  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    emitToVoxRoom.mockReset();
    purgeManagedUploadUrlsNow.mockReset();
    purgeManagedUploadUrlsNow.mockResolvedValue({ blockedHashes: 0 });
  });

  it("clears only the comment's media", async () => {
    findUnique.mockResolvedValue({
      id: "c9",
      voxId: "v1",
      imageUrl: "/uploads/2026/05/c9.png",
      videoUrl: null,
      videoPosterUrl: null,
    });
    update.mockResolvedValue({});

    const r = await staffPurgeCommentPublicationMedia("c9", db as never);

    expect(r).toEqual({ ok: true, voxId: "v1", commentIds: ["c9"], blockedHashes: 0 });
    expect(update).toHaveBeenCalledWith({
      where: { id: "c9" },
      data: { imageUrl: null, videoUrl: null, videoPosterUrl: null },
    });
    expect(purgeManagedUploadUrlsNow).toHaveBeenCalledWith(["/uploads/2026/05/c9.png"], db, {
      blockHashes: undefined,
    });
    expect(emitToVoxRoom).toHaveBeenCalledWith("v1", "vox:updated", { voxId: "v1" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeBlobUpload,
  discardBlobUpload,
  pruneExpiredBlobPendingFinalizes,
  registerBlobFinalizeSlot,
  releaseBlobFinalizeSlot,
  verifyBlobFinalizeAuthorization,
} from "./blobPendingFinalize";

const { deleteMany, findUnique, findMany, upsert, storedFindFirst, deleteR2ObjectByKey } =
  vi.hoisted(() => ({
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    storedFindFirst: vi.fn(),
    deleteR2ObjectByKey: vi.fn(),
  }));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    blobPendingPutFinalize: { deleteMany, findUnique, findMany, upsert },
    storedMediaByHash: { findFirst: storedFindFirst },
  },
}));

vi.mock("@/server/storage/r2Env", () => ({
  isR2StorageFullyConfigured: () => true,
}));

vi.mock("@/lib/media/publicStorage", () => ({
  r2PublicUrlForKey: (key: string) => `https://r2.example/${key}`,
}));

vi.mock("@/server/storage/r2Storage", () => ({ deleteR2ObjectByKey }));

describe("blobPendingFinalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteMany.mockResolvedValue({ count: 0 });
    findMany.mockResolvedValue([]);
    storedFindFirst.mockResolvedValue(null);
    deleteR2ObjectByKey.mockResolvedValue(undefined);
  });

  it("registerBlobFinalizeSlot upserts", async () => {
    upsert.mockResolvedValue({});
    await registerBlobFinalizeSlot("uploads/2026/05/u.webp", "user-1");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pathname: "uploads/2026/05/u.webp" },
        create: expect.objectContaining({ userId: "user-1" }),
      }),
    );
  });

  it("verifyBlobFinalizeAuthorization requires the same user and a live slot", async () => {
    findUnique.mockResolvedValue({
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(verifyBlobFinalizeAuthorization("uploads/2026/05/u.webp", "user-1")).resolves.toBe(
      true,
    );
    await expect(verifyBlobFinalizeAuthorization("uploads/2026/05/u.webp", "user-2")).resolves.toBe(
      false,
    );
  });

  it("releaseBlobFinalizeSlot deletes by pathname and userId", async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    await releaseBlobFinalizeSlot("uploads/2026/05/u.webp", "user-1");
    expect(deleteMany).toHaveBeenCalledWith({
      where: { pathname: "uploads/2026/05/u.webp", userId: "user-1" },
    });
  });

  it("prune deletes the object of expired slots that never finalized", async () => {
    findMany.mockResolvedValue([{ pathname: "uploads/2026/05/a.jpg" }]);
    await pruneExpiredBlobPendingFinalizes();
    expect(deleteR2ObjectByKey).toHaveBeenCalledWith("uploads/2026/05/a.jpg");
    expect(deleteMany).toHaveBeenCalledWith({
      where: { pathname: { in: ["uploads/2026/05/a.jpg"] } },
    });
  });

  it("prune keeps objects already recorded as finalized", async () => {
    findMany.mockResolvedValue([{ pathname: "uploads/2026/05/b.jpg" }]);
    storedFindFirst.mockResolvedValue({ id: "s1" });
    await pruneExpiredBlobPendingFinalizes();
    expect(deleteR2ObjectByKey).not.toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledWith({
      where: { pathname: { in: ["uploads/2026/05/b.jpg"] } },
    });
  });

  it("prune keeps the row when the R2 delete fails, to retry later", async () => {
    findMany.mockResolvedValue([{ pathname: "uploads/2026/05/c.jpg" }]);
    deleteR2ObjectByKey.mockRejectedValue(new Error("r2 down"));
    await pruneExpiredBlobPendingFinalizes();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("discardBlobUpload deletes the object and releases the slot", async () => {
    await discardBlobUpload("uploads/2026/05/d.webm", "user-1");
    expect(deleteR2ObjectByKey).toHaveBeenCalledWith("uploads/2026/05/d.webm");
    expect(deleteMany).toHaveBeenCalledWith({
      where: { pathname: "uploads/2026/05/d.webm", userId: "user-1" },
    });
  });

  it("completeBlobUpload deletes the original and releases the slot", async () => {
    await completeBlobUpload("uploads/2026/05/e.mp4", "user-1");
    expect(deleteR2ObjectByKey).toHaveBeenCalledWith("uploads/2026/05/e.mp4");
    expect(deleteMany).toHaveBeenCalledWith({
      where: { pathname: "uploads/2026/05/e.mp4", userId: "user-1" },
    });
  });

  it("completeBlobUpload keeps the slot when the original cannot be deleted, without throwing", async () => {
    deleteR2ObjectByKey.mockRejectedValue(new Error("r2 down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(completeBlobUpload("uploads/2026/05/f.mp4", "user-1")).resolves.toBeUndefined();
    expect(deleteMany).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

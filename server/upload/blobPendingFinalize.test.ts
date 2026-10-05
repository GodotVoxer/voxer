import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimBlobFinalizeSlot,
  deleteBlobOriginal,
  pruneExpiredBlobPendingFinalizes,
  registerBlobFinalizeSlot,
} from "./blobPendingFinalize";

const { deleteMany, updateMany, findMany, upsert, storedFindFirst, deleteR2ObjectByKey } =
  vi.hoisted(() => ({
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    storedFindFirst: vi.fn(),
    deleteR2ObjectByKey: vi.fn(),
  }));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    blobPendingPutFinalize: { deleteMany, updateMany, findMany, upsert },
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

  it("claimBlobFinalizeSlot consumes a live slot of the same user, atomically", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await expect(claimBlobFinalizeSlot("incoming/2026/05/u.webp", "user-1")).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        pathname: "incoming/2026/05/u.webp",
        userId: "user-1",
        consumedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it("claimBlobFinalizeSlot loses when another finalize already claimed the slot", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(claimBlobFinalizeSlot("incoming/2026/05/u.webp", "user-1")).resolves.toBe(false);
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

  it("deleteBlobOriginal deletes the object and keeps the slot row for the prune", async () => {
    await deleteBlobOriginal("incoming/2026/05/e.mp4");
    expect(deleteR2ObjectByKey).toHaveBeenCalledWith("incoming/2026/05/e.mp4");
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("deleteBlobOriginal does not throw when the delete fails", async () => {
    deleteR2ObjectByKey.mockRejectedValue(new Error("r2 down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(deleteBlobOriginal("incoming/2026/05/f.mp4")).resolves.toBeUndefined();
    err.mockRestore();
  });
});

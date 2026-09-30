import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { lookupStoredMediaByHash, recordStoredMediaByHash } from "./storedMediaByHash";

const { findFirst, create, updateMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    storedMediaByHash: {
      findFirst,
      create,
      updateMany,
    },
  },
}));

describe("storedMediaByHash", () => {
  beforeEach(() => {
    findFirst.mockReset();
    create.mockReset();
    updateMany.mockReset();
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("normalizes the hash and returns an active row as a dedupe hit", async () => {
    findFirst.mockResolvedValueOnce({
      kind: "IMAGE",
      mediaUrl: "https://x/u",
      thumbnailUrl: "https://x/t",
      blockedAt: null,
    });
    const row = await lookupStoredMediaByHash("A".repeat(64));
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sha256Hex: "a".repeat(64) } }),
    );
    expect(row).toEqual({ kind: "IMAGE", mediaUrl: "https://x/u", thumbnailUrl: "https://x/t" });
  });

  it("renews lastUsedAt on a hit so the sweep keeps the file", async () => {
    findFirst.mockResolvedValueOnce({
      kind: "IMAGE",
      mediaUrl: "u",
      thumbnailUrl: "t",
      blockedAt: null,
    });
    await lookupStoredMediaByHash("d".repeat(64));
    expect(updateMany).toHaveBeenCalledWith({
      where: { sha256Hex: "d".repeat(64) },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("reports a tombstone as blocked without renewing it", async () => {
    findFirst.mockResolvedValueOnce({
      kind: "IMAGE",
      mediaUrl: "u",
      thumbnailUrl: "t",
      blockedAt: new Date(),
    });
    await expect(lookupStoredMediaByHash("aabbcc")).resolves.toBe("blocked");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns null for an unknown hash", async () => {
    findFirst.mockResolvedValueOnce(null);
    await expect(lookupStoredMediaByHash("e".repeat(64))).resolves.toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("recordStoredMediaByHash ignores P2002 from a race and renews lastUsedAt", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    });
    create.mockRejectedValueOnce(err);
    await expect(
      recordStoredMediaByHash({
        sha256Hex: "b".repeat(64),
        kind: "IMAGE",
        mediaUrl: "u",
        thumbnailUrl: "t",
        byteSize: 1,
        mimeType: "image/jpeg",
      }),
    ).resolves.toBeUndefined();
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sha256Hex: "b".repeat(64) } }),
    );
  });

  it("recordStoredMediaByHash rethrows other errors", async () => {
    create.mockRejectedValueOnce(new Error("db down"));
    await expect(
      recordStoredMediaByHash({
        sha256Hex: "c".repeat(64),
        kind: "IMAGE",
        mediaUrl: "u",
        thumbnailUrl: "t",
        byteSize: 1,
        mimeType: null,
      }),
    ).rejects.toThrow("db down");
  });
});

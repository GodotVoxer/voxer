import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcessedBackgroundImage } from "./processBackgroundImage";
import {
  createThemeAssetShare,
  deleteThemeAsset,
  importSharedThemeAsset,
  listThemeAssets,
  purgeOrphanThemeAssets,
  saveThemeAsset,
} from "./themeAssets";

const db = vi.hoisted(() => ({
  storedMediaByHash: { findFirst: vi.fn() },
  userThemeAsset: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
  userTheme: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  putThemeAssetObject: vi.fn(),
  deleteThemeAssetObject: vi.fn(),
  readThemeAssetObject: vi.fn(),
  newThemeAssetKeys: vi.fn(),
  themeAssetPublicUrl: vi.fn((key: string) => `https://media.voxer.pro/${key}`),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/theme/themeAssetStorage", () => storage);

const processed: ProcessedBackgroundImage = {
  full: Buffer.alloc(1000),
  small: Buffer.alloc(300),
  width: 2560,
  height: 1440,
  sha256Hex: "a".repeat(64),
  sourceSha256Hex: "b".repeat(64),
};

const row = (extra: Record<string, unknown> = {}) => ({
  id: "classet1",
  objectKey: "theme-bg/k.webp",
  objectKeySm: "theme-bg/k-sm.webp",
  width: 2560,
  height: 1440,
  byteSize: 1300,
  createdAt: new Date("2026-09-14T12:00:00.000Z"),
  ...extra,
});

const reset = () => {
  for (const group of [db.storedMediaByHash, db.userThemeAsset, db.userTheme]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
  db.$transaction.mockReset();
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  storage.putThemeAssetObject.mockReset();
  storage.deleteThemeAssetObject.mockReset();
  storage.readThemeAssetObject.mockReset();
  storage.newThemeAssetKeys.mockReset();
  storage.newThemeAssetKeys.mockReturnValue({
    key: "theme-bg/new.webp",
    keySm: "theme-bg/new-sm.webp",
  });
  storage.readThemeAssetObject
    .mockResolvedValueOnce(Buffer.alloc(1000))
    .mockResolvedValueOnce(Buffer.alloc(300));
};

describe("theme background images (server)", () => {
  beforeEach(reset);

  it("lists only the user's images with the quota", async () => {
    db.userThemeAsset.findMany.mockResolvedValueOnce([
      row(),
      row({ id: "classet2", byteSize: 700 }),
    ]);
    const result = await listThemeAssets("user-1");
    expect(db.userThemeAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(result.quota).toEqual({
      count: 2,
      maxCount: 5,
      bytes: 2000,
      maxBytes: 12 * 1024 * 1024,
    });
    expect(result.assets[0].url).toBe("https://media.voxer.pro/theme-bg/k.webp");
  });

  it("creates an opaque share reference only for an own image and reuses it", async () => {
    db.userThemeAsset.findFirst
      .mockResolvedValueOnce({ id: "classet1", shareId: null })
      .mockResolvedValueOnce({ shareId: "s".repeat(32) })
      .mockResolvedValueOnce({ id: "classet1", shareId: "s".repeat(32) });
    db.userThemeAsset.updateMany.mockResolvedValueOnce({ count: 1 });

    expect(await createThemeAssetShare("user-1", "classet1")).toBe("s".repeat(32));
    expect(db.userThemeAsset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "classet1", userId: "user-1", shareId: null } }),
    );
    expect(await createThemeAssetShare("user-1", "classet1")).toBe("s".repeat(32));
    expect(db.userThemeAsset.updateMany).toHaveBeenCalledTimes(1);

    db.userThemeAsset.findFirst.mockResolvedValueOnce(null);
    expect(await createThemeAssetShare("user-2", "classet1")).toBeNull();
  });

  it("imports a shared reference by copying both objects to the receiving account", async () => {
    db.userThemeAsset.findUnique.mockResolvedValueOnce(
      row({ userId: "owner", sha256Hex: "a".repeat(64) }),
    );
    db.storedMediaByHash.findFirst.mockResolvedValueOnce(null);
    db.userThemeAsset.findFirst.mockResolvedValueOnce(null);
    db.userThemeAsset.aggregate
      .mockResolvedValueOnce({ _count: { _all: 0 }, _sum: { byteSize: null } })
      .mockResolvedValueOnce({ _count: { _all: 1 }, _sum: { byteSize: 1300 } });
    db.userThemeAsset.create.mockResolvedValueOnce(row({ id: "copied" }));

    const result = await importSharedThemeAsset("recipient", "s".repeat(32));
    expect(result).toMatchObject({ ok: true, deduplicated: false, asset: { id: "copied" } });
    expect(storage.readThemeAssetObject).toHaveBeenNthCalledWith(1, "theme-bg/k.webp");
    expect(storage.readThemeAssetObject).toHaveBeenNthCalledWith(2, "theme-bg/k-sm.webp");
    expect(db.userThemeAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "recipient" }) }),
    );
  });

  it("re-checks block list, quotas and existence on import", async () => {
    db.userThemeAsset.findUnique.mockResolvedValueOnce(null);
    expect(await importSharedThemeAsset("user-1", "missing")).toEqual({
      ok: false,
      reason: "not_found",
    });

    db.userThemeAsset.findUnique.mockResolvedValueOnce(
      row({ userId: "owner", sha256Hex: "a".repeat(64) }),
    );
    db.storedMediaByHash.findFirst.mockResolvedValueOnce({ id: "blocked" });
    expect(await importSharedThemeAsset("user-1", "s".repeat(32))).toEqual({
      ok: false,
      reason: "blocked",
    });

    db.userThemeAsset.findUnique.mockResolvedValueOnce(
      row({ userId: "owner", sha256Hex: "a".repeat(64) }),
    );
    db.storedMediaByHash.findFirst.mockResolvedValueOnce(null);
    db.userThemeAsset.findFirst.mockResolvedValueOnce(null);
    db.userThemeAsset.aggregate.mockResolvedValueOnce({
      _count: { _all: 5 },
      _sum: { byteSize: 100 },
    });
    expect(await importSharedThemeAsset("user-1", "s".repeat(32))).toEqual({
      ok: false,
      reason: "quota_count",
    });
    expect(storage.readThemeAssetObject).not.toHaveBeenCalled();
  });

  it("reuses the image when the receiver already owns it or the hash matches", async () => {
    db.userThemeAsset.findUnique.mockResolvedValueOnce(
      row({ userId: "user-1", sha256Hex: "a".repeat(64) }),
    );
    expect(await importSharedThemeAsset("user-1", "s".repeat(32))).toMatchObject({
      ok: true,
      deduplicated: true,
      asset: { id: "classet1" },
    });

    db.userThemeAsset.findUnique.mockResolvedValueOnce(
      row({ userId: "owner", sha256Hex: "a".repeat(64) }),
    );
    db.storedMediaByHash.findFirst.mockResolvedValueOnce(null);
    db.userThemeAsset.findFirst.mockResolvedValueOnce(row({ id: "existing" }));
    expect(await importSharedThemeAsset("user-1", "s".repeat(32))).toMatchObject({
      ok: true,
      deduplicated: true,
      asset: { id: "existing" },
    });
    expect(storage.readThemeAssetObject).not.toHaveBeenCalled();
  });

  it("rejects hashes blocked by moderation without writing anything", async () => {
    db.storedMediaByHash.findFirst.mockResolvedValueOnce({ id: "blocked" });
    expect(await saveThemeAsset("user-1", processed)).toEqual({ ok: false, reason: "blocked" });
    expect(db.storedMediaByHash.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sha256Hex: { in: ["a".repeat(64), "b".repeat(64)] },
          NOT: { blockedAt: null },
        },
      }),
    );
    expect(storage.putThemeAssetObject).not.toHaveBeenCalled();
  });

  it("rolls back row and objects when a concurrent upload filled the quota", async () => {
    db.storedMediaByHash.findFirst.mockResolvedValue(null);
    db.userThemeAsset.findFirst.mockResolvedValue(null);
    db.userThemeAsset.aggregate
      .mockResolvedValueOnce({ _count: { _all: 4 }, _sum: { byteSize: 100 } })
      .mockResolvedValueOnce({ _count: { _all: 6 }, _sum: { byteSize: 2700 } });
    db.userThemeAsset.create.mockResolvedValueOnce(row({ id: "classetnew" }));
    expect(await saveThemeAsset("user-1", processed)).toEqual({ ok: false, reason: "quota_count" });
    expect(db.userThemeAsset.deleteMany).toHaveBeenCalledWith({ where: { id: "classetnew" } });
    expect(storage.deleteThemeAssetObject).toHaveBeenCalledWith("theme-bg/new.webp");
    expect(storage.deleteThemeAssetObject).toHaveBeenCalledWith("theme-bg/new-sm.webp");
  });

  it("reuses an image the user already uploaded", async () => {
    db.storedMediaByHash.findFirst.mockResolvedValueOnce(null);
    db.userThemeAsset.findFirst.mockResolvedValueOnce(row());
    const result = await saveThemeAsset("user-1", processed);
    expect(result).toMatchObject({ ok: true, deduplicated: true, asset: { id: "classet1" } });
    expect(storage.putThemeAssetObject).not.toHaveBeenCalled();
  });

  it("enforces count and byte quotas", async () => {
    db.storedMediaByHash.findFirst.mockResolvedValue(null);
    db.userThemeAsset.findFirst.mockResolvedValue(null);
    db.userThemeAsset.aggregate.mockResolvedValueOnce({
      _count: { _all: 5 },
      _sum: { byteSize: 10 },
    });
    expect(await saveThemeAsset("user-1", processed)).toEqual({ ok: false, reason: "quota_count" });
    db.userThemeAsset.aggregate.mockResolvedValueOnce({
      _count: { _all: 1 },
      _sum: { byteSize: 12 * 1024 * 1024 - 100 },
    });
    expect(await saveThemeAsset("user-1", processed)).toEqual({ ok: false, reason: "quota_bytes" });
    expect(storage.putThemeAssetObject).not.toHaveBeenCalled();
  });

  it("stores both variants and the row; deletes the objects if the database fails", async () => {
    db.storedMediaByHash.findFirst.mockResolvedValue(null);
    db.userThemeAsset.findFirst.mockResolvedValue(null);
    db.userThemeAsset.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { byteSize: null },
    });
    db.userThemeAsset.create.mockResolvedValueOnce(row({ objectKey: "theme-bg/new.webp" }));
    const saved = await saveThemeAsset("user-1", processed);
    expect(saved).toMatchObject({ ok: true, deduplicated: false });
    expect(storage.putThemeAssetObject).toHaveBeenCalledTimes(2);
    expect(db.userThemeAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          byteSize: 1300,
          sha256Hex: "a".repeat(64),
        }),
      }),
    );

    db.userThemeAsset.create.mockRejectedValueOnce(new Error("db caída"));
    await expect(saveThemeAsset("user-1", processed)).rejects.toThrow("db caída");
    expect(storage.deleteThemeAssetObject).toHaveBeenCalledWith("theme-bg/new.webp");
    expect(storage.deleteThemeAssetObject).toHaveBeenCalledWith("theme-bg/new-sm.webp");
  });

  it("deleting an own image resets the themes using it and removes the objects", async () => {
    db.userThemeAsset.findFirst.mockResolvedValueOnce(row());
    expect(await deleteThemeAsset("user-1", "classet1")).toBe(true);
    expect(db.userTheme.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", backgroundAssetId: "classet1" },
      data: {
        voxBackground: { kind: "none" },
        backgroundAssetId: null,
        version: { increment: 1 },
      },
    });
    expect(storage.deleteThemeAssetObject).toHaveBeenCalledWith("theme-bg/k.webp");
  });

  it("deleting someone else's image does nothing", async () => {
    db.userThemeAsset.findFirst.mockResolvedValueOnce(null);
    expect(await deleteThemeAsset("user-2", "classet1")).toBe(false);
    expect(db.userThemeAsset.delete).not.toHaveBeenCalled();
    expect(storage.deleteThemeAssetObject).not.toHaveBeenCalled();
  });

  it("purges old orphans and re-checks before deleting", async () => {
    db.userThemeAsset.findMany.mockResolvedValueOnce([row(), row({ id: "classet2" })]);
    db.userThemeAsset.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const now = new Date("2026-09-15T12:00:00.000Z");
    expect(await purgeOrphanThemeAssets("user-1", now)).toBe(1);
    expect(db.userThemeAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          createdAt: { lt: new Date("2026-09-14T12:00:00.000Z") },
          themes: { none: {} },
        },
      }),
    );
    expect(storage.deleteThemeAssetObject).toHaveBeenCalledTimes(2);
  });
});

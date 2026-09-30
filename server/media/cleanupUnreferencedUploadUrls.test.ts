import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  STORED_MEDIA_SWEEP_GRACE_MS,
  cleanupManagedUploadUrlsIfUnreferenced,
  countUploadUrlRefsInDb,
  purgeManagedUploadUrlsNow,
  sweepUnreferencedStoredMediaByHashRows,
} from "./cleanupUnreferencedUploadUrls";

const { unlink } = vi.hoisted(() => ({ unlink: vi.fn() }));

vi.mock("fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("fs/promises")>()),
  unlink,
}));

const now = new Date("2026-09-14T12:00:00.000Z");
const expectedCutoffMs = now.getTime() - STORED_MEDIA_SWEEP_GRACE_MS;

const makeDb = () => ({
  vox: { count: vi.fn().mockResolvedValue(0) },
  comment: { count: vi.fn().mockResolvedValue(0) },
  storedMediaByHash: {
    findFirst: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  $queryRaw: vi.fn().mockResolvedValue([]),
});

describe("countUploadUrlRefsInDb", () => {
  it("adds up matches in Vox and Comment", async () => {
    const db = {
      vox: {
        count: vi.fn().mockResolvedValue(1),
      },
      comment: {
        count: vi.fn().mockResolvedValue(2),
      },
    };
    const n = await countUploadUrlRefsInDb(db as never, "https://x.blob/x.jpg");
    expect(n).toBe(3);
    expect(db.vox.count).toHaveBeenCalledWith({
      where: {
        OR: [{ mediaUrl: "https://x.blob/x.jpg" }, { thumbnailUrl: "https://x.blob/x.jpg" }],
      },
    });
    expect(db.comment.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { imageUrl: "https://x.blob/x.jpg" },
          { videoUrl: "https://x.blob/x.jpg" },
          { videoPosterUrl: "https://x.blob/x.jpg" },
        ],
      },
    });
  });
  it("returns 0 for an empty URL", async () => {
    const db = { vox: { count: vi.fn() }, comment: { count: vi.fn() } };
    expect(await countUploadUrlRefsInDb(db as never, "")).toBe(0);
    expect(db.vox.count).not.toHaveBeenCalled();
  });
});

describe("sweepUnreferencedStoredMediaByHashRows", () => {
  beforeEach(() => {
    unlink.mockReset();
    unlink.mockResolvedValue(undefined);
  });

  it("queries in batch with cutoff = now - grace and deletes files of claimed rows", async () => {
    const db = makeDb();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: "s1",
        mediaUrl: "/uploads/2026/09/old-main.jpg",
        thumbnailUrl: "/uploads/2026/09/old-main.thumb.webp",
      },
    ]);

    const deleted = await sweepUnreferencedStoredMediaByHashRows(db as never, now, 10);

    const values = db.$queryRaw.mock.calls[0]!.slice(1) as unknown[];
    const cutoff = values.find((v): v is Date => v instanceof Date);
    expect(cutoff?.getTime()).toBe(expectedCutoffMs);
    expect(values).toContain(10);
    expect(db.storedMediaByHash.deleteMany).toHaveBeenCalledWith({
      where: { id: "s1", lastUsedAt: { lt: new Date(expectedCutoffMs) } },
    });
    expect(unlink).toHaveBeenCalledTimes(2);
    expect(deleted).toBe(1);
  });

  it("keeps files when a dedupe renewed the row between query and delete", async () => {
    const db = makeDb();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: "s2",
        mediaUrl: "/uploads/2026/09/x.jpg",
        thumbnailUrl: "/uploads/2026/09/x.thumb.webp",
      },
    ]);
    db.storedMediaByHash.deleteMany.mockResolvedValueOnce({ count: 0 });

    const deleted = await sweepUnreferencedStoredMediaByHashRows(db as never, now);

    expect(unlink).not.toHaveBeenCalled();
    expect(deleted).toBe(0);
  });
});

describe("cleanupManagedUploadUrlsIfUnreferenced", () => {
  beforeEach(() => {
    unlink.mockReset();
    unlink.mockResolvedValue(undefined);
  });

  it("keeps an unreferenced but recently used upload (unsent draft)", async () => {
    const db = makeDb();
    db.storedMediaByHash.findFirst.mockResolvedValueOnce({ id: "fresh" });

    await cleanupManagedUploadUrlsIfUnreferenced(["/uploads/2026/09/fresh.jpg"], db as never, now);

    expect(unlink).not.toHaveBeenCalled();
  });

  it("deletes a URL with no references and no recent use", async () => {
    const db = makeDb();

    await cleanupManagedUploadUrlsIfUnreferenced(["/uploads/2026/09/stale.jpg"], db as never, now);

    expect(unlink).toHaveBeenCalledTimes(1);
  });

  it("keeps URLs that are still referenced", async () => {
    const db = makeDb();
    db.vox.count.mockResolvedValueOnce(1);

    await cleanupManagedUploadUrlsIfUnreferenced(["/uploads/2026/09/used.jpg"], db as never, now);

    expect(unlink).not.toHaveBeenCalled();
  });
});

describe("purgeManagedUploadUrlsNow", () => {
  beforeEach(() => {
    unlink.mockReset();
    unlink.mockResolvedValue(undefined);
  });

  it("deletes the file even after a recent dedupe: the draft grace does not apply", async () => {
    const db = makeDb();
    db.storedMediaByHash.findFirst.mockResolvedValue({ id: "fresh" });

    await purgeManagedUploadUrlsNow(["/uploads/2026/09/grave.jpg"], db as never);

    expect(unlink).toHaveBeenCalledTimes(1);
  });

  it("deletes the dedupe row pointing at the file as media or thumbnail", async () => {
    const db = makeDb();

    await purgeManagedUploadUrlsNow(["/uploads/2026/09/grave.jpg"], db as never);

    expect(db.storedMediaByHash.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { mediaUrl: "/uploads/2026/09/grave.jpg" },
          { thumbnailUrl: "/uploads/2026/09/grave.jpg" },
        ],
      },
    });
  });

  it("keeps a file that another live publication shares through dedupe", async () => {
    const db = makeDb();
    db.comment.count.mockResolvedValueOnce(1);

    await purgeManagedUploadUrlsNow(["/uploads/2026/09/compartida.jpg"], db as never);

    expect(unlink).not.toHaveBeenCalled();
    expect(db.storedMediaByHash.deleteMany).not.toHaveBeenCalled();
  });

  it("ignores the shared placeholder and links that are not own uploads", async () => {
    const db = makeDb();

    await purgeManagedUploadUrlsNow(
      ["/video-thumb.svg", "https://www.youtube.com/watch?v=abc"],
      db as never,
    );

    expect(unlink).not.toHaveBeenCalled();
    expect(db.storedMediaByHash.deleteMany).not.toHaveBeenCalled();
  });
});

describe("purgeManagedUploadUrlsNow with block", () => {
  beforeEach(() => {
    unlink.mockReset();
    unlink.mockResolvedValue(undefined);
  });

  it("keeps the row as a tombstone with blockedAt instead of deleting it", async () => {
    const db = makeDb();
    const now = new Date("2026-09-23T10:00:00.000Z");

    const r = await purgeManagedUploadUrlsNow(["/uploads/2026/09/grave.jpg"], db as never, {
      blockHashes: true,
      now,
    });

    expect(db.storedMediaByHash.deleteMany).not.toHaveBeenCalled();
    expect(db.storedMediaByHash.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { mediaUrl: "/uploads/2026/09/grave.jpg" },
          { thumbnailUrl: "/uploads/2026/09/grave.jpg" },
        ],
        blockedAt: null,
      },
      data: { blockedAt: now },
    });
    expect(r.blockedHashes).toBe(1);
  });

  it("deletes the file just like without block", async () => {
    const db = makeDb();

    await purgeManagedUploadUrlsNow(["/uploads/2026/09/grave.jpg"], db as never, {
      blockHashes: true,
    });

    expect(unlink).toHaveBeenCalledTimes(1);
  });

  it("does not block the hash of a file another live publication still uses", async () => {
    const db = makeDb();
    db.vox.count.mockResolvedValueOnce(1);

    const r = await purgeManagedUploadUrlsNow(["/uploads/2026/09/compartida.jpg"], db as never, {
      blockHashes: true,
    });

    expect(db.storedMediaByHash.updateMany).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
    expect(r.blockedHashes).toBe(0);
  });
});

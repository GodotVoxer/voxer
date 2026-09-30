import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarVariant } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { listCommentsForVox } from "./list";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    vox: { findUnique: vi.fn() },
    comment: { findMany: vi.fn() },
  },
}));

const baseComment = {
  id: "c1",
  publicTag: "ABCDEF",
  voxId: "v1",
  body: "hola",
  displayName: "x",
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  avatarVariant: AvatarVariant.BLUE,
  staffBadge: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  authorId: "u1",
  deletedAt: null,
  deletedByUserId: null,
  pollDisclosureOption: null,
  countryCode: null,
  threadTag: null,
  threadBadgeHue: null,
} as const;

const liveVox = {
  id: "v1",
  ownerId: null,
  deletedAt: null,
  threadUniqueIdsEnabled: false,
} as never;

describe("listCommentsForVox", () => {
  beforeEach(() => {
    vi.mocked(prisma.vox.findUnique).mockReset();
    vi.mocked(prisma.comment.findMany).mockReset();
  });

  it("returns not_found when the vox does not exist", async () => {
    vi.mocked(prisma.vox.findUnique).mockResolvedValueOnce(null);
    const r = await listCommentsForVox("missing", undefined, 50, null);
    expect(r).toEqual({ ok: false, kind: "not_found" });
    expect(prisma.comment.findMany).not.toHaveBeenCalled();
  });

  it("returns not_found when the vox is soft-deleted", async () => {
    vi.mocked(prisma.vox.findUnique).mockResolvedValueOnce({
      id: "v1",
      ownerId: null,
      deletedAt: new Date(),
      threadUniqueIdsEnabled: false,
    } as never);
    const r = await listCommentsForVox("v1", undefined, 50, null);
    expect(r).toEqual({ ok: false, kind: "not_found" });
    expect(prisma.comment.findMany).not.toHaveBeenCalled();
  });

  it("lists comments of a live vox", async () => {
    vi.mocked(prisma.vox.findUnique).mockResolvedValueOnce({
      id: "v1",
      ownerId: "u1",
      deletedAt: null,
      threadUniqueIdsEnabled: false,
    } as never);
    vi.mocked(prisma.comment.findMany).mockResolvedValueOnce([{ ...baseComment } as never]);
    const r = await listCommentsForVox("v1", undefined, 50, null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.comments).toHaveLength(1);
      expect(r.comments[0]?.isOp).toBe(true);
      expect(r.comments[0]?.isMine).toBe(false);
      expect(r.comments[0]?.threadTag).toBeNull();
      expect(r.nextCursor).toBeNull();
    }
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    );
  });

  it("marks isMine when the viewer is the author", async () => {
    vi.mocked(prisma.vox.findUnique).mockResolvedValueOnce({
      id: "v1",
      ownerId: "other",
      deletedAt: null,
      threadUniqueIdsEnabled: false,
    } as never);
    vi.mocked(prisma.comment.findMany).mockResolvedValueOnce([{ ...baseComment } as never]);
    const r = await listCommentsForVox("v1", undefined, 50, "u1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.comments[0]?.isOp).toBe(false);
      expect(r.comments[0]?.isMine).toBe(true);
    }
  });

  it("exposes threadTag from the comment row when the vox has thread IDs", async () => {
    vi.mocked(prisma.vox.findUnique).mockResolvedValueOnce({
      id: "v1",
      ownerId: null,
      deletedAt: null,
      threadUniqueIdsEnabled: true,
    } as never);
    vi.mocked(prisma.comment.findMany).mockResolvedValueOnce([
      {
        ...baseComment,
        authorId: "u9",
        threadTag: "K7P",
        threadBadgeHue: 120,
      } as never,
    ]);
    const r = await listCommentsForVox("v1", undefined, 50, null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.comments[0]?.threadTag).toEqual({ text: "K7P", badgeHue: 120 });
    }
  });

  it("after mode returns only newer comments, ascending, with no nextCursor", async () => {
    vi.mocked(prisma.vox.findUnique).mockResolvedValueOnce(liveVox);
    vi.mocked(prisma.comment.findMany).mockResolvedValueOnce([
      { ...baseComment, id: "c2", publicTag: "AAAAAA02" } as never,
      { ...baseComment, id: "c3", publicTag: "AAAAAA03" } as never,
    ]);
    const after = { createdAt: new Date("2026-01-01T00:00:00.000Z"), id: "c1" };

    const r = await listCommentsForVox("v1", undefined, 1, null, after);

    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          voxId: "v1",
          deletedAt: null,
          OR: [
            { createdAt: { gt: after.createdAt } },
            { AND: [{ createdAt: after.createdAt }, { id: { gt: "c1" } }] },
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 2,
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.comments.map((c) => c.id)).toEqual(["c2"]);
      expect(r.nextCursor).toBeNull();
    }
  });
});

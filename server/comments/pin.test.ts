import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/server/db/prisma";
import { setCommentPinned } from "./pin";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    comment: { findFirst: vi.fn(), updateMany: vi.fn() },
  },
}));

describe("setCommentPinned", () => {
  beforeEach(() => {
    vi.mocked(prisma.comment.findFirst).mockReset();
    vi.mocked(prisma.comment.updateMany).mockReset();
  });

  it("only looks up live comments of the user's own live vox", async () => {
    vi.mocked(prisma.comment.findFirst).mockResolvedValueOnce(null);
    const r = await setCommentPinned("u1", "c1", true);
    expect(r.ok).toBe(false);
    expect(prisma.comment.updateMany).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.comment.findFirst).mock.calls[0][0]).toMatchObject({
      where: {
        id: "c1",
        deletedAt: null,
        vox: { ownerId: "u1", deletedAt: null },
      },
    });
  });

  it("pins with the current time and returns the vox to broadcast", async () => {
    vi.mocked(prisma.comment.findFirst).mockResolvedValueOnce({
      id: "c1",
      voxId: "v1",
    } as never);
    vi.mocked(prisma.comment.updateMany).mockResolvedValueOnce({ count: 1 } as never);
    const r = await setCommentPinned("u1", "c1", true);
    expect(r).toMatchObject({ ok: true, voxId: "v1" });
    expect(r.ok && r.pinnedAt).toEqual(expect.any(String));
    const data = vi.mocked(prisma.comment.updateMany).mock.calls[0][0].data as {
      pinnedAt: Date | null;
    };
    expect(data.pinnedAt).toBeInstanceOf(Date);
  });

  it("unpins with pinnedAt null", async () => {
    vi.mocked(prisma.comment.findFirst).mockResolvedValueOnce({
      id: "c1",
      voxId: "v1",
    } as never);
    vi.mocked(prisma.comment.updateMany).mockResolvedValueOnce({ count: 1 } as never);
    const r = await setCommentPinned("u1", "c1", false);
    expect(r).toEqual({ ok: true, voxId: "v1", pinnedAt: null });
  });

  it("fails when the row disappears between read and write", async () => {
    vi.mocked(prisma.comment.findFirst).mockResolvedValueOnce({
      id: "c1",
      voxId: "v1",
    } as never);
    vi.mocked(prisma.comment.updateMany).mockResolvedValueOnce({ count: 0 } as never);
    expect(await setCommentPinned("u1", "c1", true)).toEqual({ ok: false });
  });
});

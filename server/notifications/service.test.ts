import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@/server/db/prisma";
import { listNotificationsForUser, markNotificationsReadForUserVox } from "./service";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    notification: { updateMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));

describe("markNotificationsReadForUserVox", () => {
  beforeEach(() => {
    vi.mocked(prisma.notification.updateMany).mockReset();
    vi.mocked(prisma.notification.count).mockReset();
  });

  it("marks every unread notification of the vox when no comment is given", async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 2 });
    const result = await markNotificationsReadForUserVox("u1", "vox-a");
    expect(result).toEqual({ marked: 2, remaining: 0 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", voxId: "vox-a", readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(prisma.notification.count).not.toHaveBeenCalled();
  });

  it("leaves unread the notifications of comments newer than the last one on screen", async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.notification.count).mockResolvedValue(2);
    const seenThrough = new Date("2026-05-01T12:00:00.000Z");
    const result = await markNotificationsReadForUserVox("u1", "vox-a", seenThrough);
    expect(result).toEqual({ marked: 1, remaining: 2 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        voxId: "vox-a",
        readAt: null,
        OR: [
          { relatedCommentId: null },
          { relatedComment: { deletedAt: { not: null } } },
          { relatedComment: { createdAt: { lte: seenThrough } } },
        ],
      },
      data: { readAt: expect.any(Date) },
    });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "u1", voxId: "vox-a", readAt: null },
    });
  });

  it("marks only notifications without a visible comment when nothing is on screen", async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.notification.count).mockResolvedValue(1);
    const result = await markNotificationsReadForUserVox("u1", "vox-a", null);
    expect(result).toEqual({ marked: 0, remaining: 1 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        voxId: "vox-a",
        readAt: null,
        OR: [{ relatedCommentId: null }, { relatedComment: { deletedAt: { not: null } } }],
      },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe("listNotificationsForUser", () => {
  it("excerpts the comment while it exists, and still links to it once deleted", async () => {
    const row = (id: string, deletedAt: Date | null) => ({
      id,
      type: "REPLY_TO_COMMENT",
      message: "Alguien respondió a tu comentario en el vox «v».",
      thumbnailUrl: null,
      voxId: "v1",
      readAt: null,
      createdAt: new Date("2026-05-01T12:00:00Z"),
      relatedComment: {
        publicTag: "AB12CD34",
        body: ">>ABCD1234\nNo estoy de acuerdo",
        imageUrl: null,
        videoUrl: null,
        animatedImage: false,
        deletedAt,
      },
    });
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      row("live", null),
      row("deleted", new Date("2026-05-02T12:00:00Z")),
      { ...row("orphan", null), relatedComment: null },
    ] as never);

    const res = await listNotificationsForUser("u1");
    expect(res.map((r) => r.commentPreview)).toEqual(["No estoy de acuerdo", null, null]);
    expect(res.map((r) => r.commentPublicTag)).toEqual(["AB12CD34", "AB12CD34", null]);
  });
});

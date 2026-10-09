import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@/server/db/prisma";
import { listNotificationsForUser, markNotificationsReadForUserVox } from "./service";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    notification: { updateMany: vi.fn(), findMany: vi.fn() },
  },
}));

describe("markNotificationsReadForUserVox", () => {
  beforeEach(() => {
    vi.mocked(prisma.notification.updateMany).mockReset();
  });

  it("marks only that user's unread notifications of the vox", async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 2 });
    const n = await markNotificationsReadForUserVox("u1", "vox-a");
    expect(n).toBe(2);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", voxId: "vox-a", readAt: null },
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

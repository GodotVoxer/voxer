import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@/server/db/prisma";
import {
  listStaffNotificationsForUser,
  markStaffNotificationsReadForUserVox,
} from "./staffNotifications";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    staffNotification: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("markStaffNotificationsReadForUserVox", () => {
  beforeEach(() => {
    vi.mocked(prisma.staffNotification.updateMany).mockReset();
    vi.mocked(prisma.staffNotification.findMany).mockReset();
  });

  it("marks that moderator's unread notifications of the vox", async () => {
    vi.mocked(prisma.staffNotification.updateMany).mockResolvedValue({ count: 2 });
    const n = await markStaffNotificationsReadForUserVox("u1", "vox-a");
    expect(n).toBe(2);
    expect(prisma.staffNotification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", voxId: "vox-a", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe("listStaffNotificationsForUser", () => {
  beforeEach(() => {
    vi.mocked(prisma.staffNotification.updateMany).mockReset();
    vi.mocked(prisma.staffNotification.findMany).mockReset();
  });

  it("returns notifications including reportDetails", async () => {
    const createdAt = new Date("2026-05-01T12:00:00Z");
    vi.mocked(prisma.staffNotification.findMany).mockResolvedValue([
      {
        id: "sn1",
        message: "Denuncia con detalle",
        thumbnailUrl: "/thumb.webp",
        voxId: "v1",
        commentHash: null,
        readAt: null,
        createdAt,
        report: {
          details: "El usuario está haciendo spam reiterado",
          comment: null,
        },
      },
      {
        id: "sn2",
        message: "Denuncia sin detalle",
        thumbnailUrl: null,
        voxId: "v2",
        commentHash: "AB12",
        readAt: createdAt,
        createdAt,
        report: null,
      },
    ] as never);

    const res = await listStaffNotificationsForUser("u1");
    expect(res).toHaveLength(2);
    expect(res[0]?.reportDetails).toBe("El usuario está haciendo spam reiterado");
    expect(res[1]?.reportDetails).toBeNull();
    expect(prisma.staffNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        select: expect.objectContaining({
          report: { select: expect.objectContaining({ details: true }) },
        }),
      }),
    );
  });

  it("excerpts the reported comment while it exists", async () => {
    const row = (id: string, deletedAt: Date | null) => ({
      id,
      message: "Denuncia",
      thumbnailUrl: null,
      voxId: "v1",
      commentHash: "AB12",
      readAt: null,
      createdAt: new Date("2026-05-01T12:00:00Z"),
      report: {
        details: null,
        comment: {
          body: ">>ABCD1234\ncomprá acá",
          imageUrl: null,
          videoUrl: null,
          animatedImage: false,
          deletedAt,
        },
      },
    });
    vi.mocked(prisma.staffNotification.findMany).mockResolvedValue([
      row("live", null),
      row("deleted", new Date("2026-05-02T12:00:00Z")),
    ] as never);

    const res = await listStaffNotificationsForUser("u1");
    expect(res[0]?.commentPreview).toBe("comprá acá");
    expect(res[1]?.commentPreview).toBeNull();
  });
});

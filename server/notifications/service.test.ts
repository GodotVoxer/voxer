import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@/server/db/prisma";
import { markNotificationsReadForUserVox } from "./service";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    notification: { updateMany: vi.fn() },
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

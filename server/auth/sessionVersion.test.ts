import { beforeEach, describe, expect, it, vi } from "vitest";

import { bumpUserSessionVersion, getUserSessionVersion } from "./sessionVersion";

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: { findUnique, update },
  },
}));

describe("sessionVersion", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
  });

  it("getUserSessionVersion returns 0 when the user does not exist", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getUserSessionVersion("u1")).toBe(0);
  });

  it("bumpUserSessionVersion increments the version", async () => {
    update.mockResolvedValue({});
    await bumpUserSessionVersion("u1");
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { sessionVersion: { increment: 1 } },
    });
  });
});

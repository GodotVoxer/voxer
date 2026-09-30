import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Vox } from "@prisma/client";

import { withViewerFlags } from "@/server/vox/getDetailApi";

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("@/server/db/prisma", () => ({
  prisma: { $queryRaw: queryRaw },
}));

const vox = { id: "v1", ownerId: "owner" } as Vox;

describe("withViewerFlags", () => {
  beforeEach(() => queryRaw.mockReset());

  it("does not query flags for anonymous visitors", async () => {
    await expect(withViewerFlags(vox, null)).resolves.toMatchObject({
      following: false,
      hidden: false,
      favorited: false,
      isOwner: false,
    });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("resolves the three private flags in one query", async () => {
    queryRaw.mockResolvedValue([{ following: true, hidden: false, favorited: true }]);
    await expect(withViewerFlags(vox, "owner")).resolves.toMatchObject({
      following: true,
      hidden: false,
      favorited: true,
      isOwner: true,
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});

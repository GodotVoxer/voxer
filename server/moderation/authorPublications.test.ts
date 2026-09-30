import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  listModerationAuthorPublications,
  resolveModerationHistoryAnchorAuthorId,
} from "./authorPublications";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  vox: { findFirst: vi.fn() },
  comment: { findFirst: vi.fn() },
  $queryRaw: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: db }));

describe("authorPublications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.$queryRaw.mockResolvedValue([]);
  });

  describe("listModerationAuthorPublications", () => {
    it("returns nothing without querying another ADMIN's publications", async () => {
      db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
      expect(
        await listModerationAuthorPublications({
          viewerUserId: "peer",
          authorId: "admin",
          cursor: null,
          limit: 24,
        }),
      ).toEqual({ items: [], nextCursor: null });
      expect(db.$queryRaw).not.toHaveBeenCalled();
    });

    it.each([
      ["admin", "admin", "ADMIN"],
      ["mod", "user", "USER"],
    ])("permite historial %s → %s", async (viewerUserId, authorId, role) => {
      db.user.findUnique.mockResolvedValue({ role });
      await listModerationAuthorPublications({ viewerUserId, authorId, cursor: null, limit: 24 });
      expect(db.$queryRaw).toHaveBeenCalledOnce();
    });
  });

  describe("resolveModerationHistoryAnchorAuthorId", () => {
    it("returns the author and role of the vox creator", async () => {
      db.vox.findFirst.mockResolvedValueOnce({
        ownerId: "admin-1",
        owner: { role: "ADMIN" },
      });

      const res = await resolveModerationHistoryAnchorAuthorId({ voxId: "v1" });
      expect(res).toEqual({
        ok: true,
        authorId: "admin-1",
        authorRole: "ADMIN",
        anchor: { kind: "vox", voxId: "v1" },
      });
    });

    it("returns the author and role of the comment author", async () => {
      db.comment.findFirst.mockResolvedValueOnce({
        authorId: "user-1",
        author: { role: "USER" },
      });

      const res = await resolveModerationHistoryAnchorAuthorId({ commentId: "c1" });
      expect(res).toEqual({
        ok: true,
        authorId: "user-1",
        authorRole: "USER",
        anchor: { kind: "comment", commentId: "c1" },
      });
    });

    it("returns not_found when the vox does not exist", async () => {
      db.vox.findFirst.mockResolvedValueOnce(null);

      const res = await resolveModerationHistoryAnchorAuthorId({ voxId: "missing" });
      expect(res).toEqual({ ok: false, reason: "not_found" });
    });
  });
});

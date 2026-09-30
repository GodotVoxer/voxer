import { describe, expect, it, vi, beforeEach } from "vitest";

import { getModerationCommentSnapshot } from "./commentSnapshot";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    comment: { findUnique },
  },
}));

describe("getModerationCommentSnapshot", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("includes soft-deleted comments", async () => {
    findUnique.mockResolvedValue({
      id: "c1",
      authorId: "author",
      vox: { ownerId: "other", threadUniqueIdsEnabled: true },
      avatarVariant: "BLUE",
      animatedImage: true,
      threadTag: "ABCD",
      threadBadgeHue: 120,
      publicTag: "ABC123",
      voxId: "v1",
      body: "hola",
      displayName: "Anón",
      imageUrl: "/uploads/x.png",
      videoUrl: null,
      videoPosterUrl: null,
      createdAt: new Date("2026-05-01T12:00:00Z"),
      deletedAt: new Date("2026-05-02T12:00:00Z"),
    });
    const r = await getModerationCommentSnapshot("c1", "viewer");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.comment.deletedAt).toBe("2026-05-02T12:00:00.000Z");
    expect(r.comment.animatedImage).toBe(true);
    expect(r.comment.threadTag).toEqual({ text: "ABCD", badgeHue: 120 });
    expect(r.comment).not.toHaveProperty("authorId");
    expect(r.comment.imageUrl).toBe("/uploads/x.png");
  });

  it("returns not_found when missing", async () => {
    findUnique.mockResolvedValue(null);
    const r = await getModerationCommentSnapshot("missing", "viewer");
    expect(r).toEqual({ ok: false, kind: "not_found" });
  });
});

it("hides an ADMIN's snapshot from other ADMINs and MODs", async () => {
  findUnique.mockResolvedValue({ authorId: "admin", author: { role: "ADMIN" } });
  expect(await getModerationCommentSnapshot("c1", "other-admin")).toEqual({
    ok: false,
    kind: "not_found",
  });
});

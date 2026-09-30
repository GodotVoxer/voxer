import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/server/db/prisma";
import {
  clampMyCommentsLimit,
  listMyComments,
  MY_COMMENTS_PAGE_LIMIT_DEFAULT,
  MY_COMMENTS_PAGE_LIMIT_MAX,
} from "./listMine";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    comment: { findMany: vi.fn() },
  },
}));

const row = {
  id: "comment-1",
  publicTag: "ABC123",
  body: "Una frase para encontrar",
  createdAt: new Date("2026-09-23T12:00:00.000Z"),
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  animatedImage: false,
  pinnedAt: null,
  vox: { id: "vox-1", title: "Título", category: "General" },
} as const;

describe("clampMyCommentsLimit", () => {
  it("uses the default page size when none is given", () => {
    expect(clampMyCommentsLimit(null)).toBe(MY_COMMENTS_PAGE_LIMIT_DEFAULT);
    expect(clampMyCommentsLimit("")).toBe(MY_COMMENTS_PAGE_LIMIT_DEFAULT);
    expect(clampMyCommentsLimit("no-es-numero")).toBe(MY_COMMENTS_PAGE_LIMIT_DEFAULT);
  });

  it("bounds the requested page size", () => {
    expect(clampMyCommentsLimit("0")).toBe(1);
    expect(clampMyCommentsLimit("999")).toBe(MY_COMMENTS_PAGE_LIMIT_MAX);
  });
});

describe("listMyComments", () => {
  beforeEach(() => {
    vi.mocked(prisma.comment.findMany).mockReset();
  });

  it("searches the body case-insensitively and keeps keyset pagination", async () => {
    vi.mocked(prisma.comment.findMany).mockResolvedValueOnce([row as never]);

    const result = await listMyComments({
      userId: "user-1",
      cursor: null,
      limit: 20,
      query: "  Frase  ",
    });

    expect(result.ok).toBe(true);
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorId: "user-1",
          deletedAt: null,
          body: { contains: "Frase", mode: "insensitive" },
        }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 21,
      }),
    );
  });

  it("adds no text filter for an empty query", async () => {
    vi.mocked(prisma.comment.findMany).mockResolvedValueOnce([]);

    await listMyComments({ userId: "user-1", cursor: null, limit: 20, query: "  " });

    const call = vi.mocked(prisma.comment.findMany).mock.calls[0]?.[0];
    expect(call?.where).not.toHaveProperty("body");
  });
});

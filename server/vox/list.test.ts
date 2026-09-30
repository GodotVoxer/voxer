import { describe, expect, it, vi, beforeEach } from "vitest";
import { decodeVoxListCursor, encodeVoxListCursor } from "@/server/vox/listCursor";
import { InvalidVoxListCursorError, listVoxListItems } from "./list";

const { findMany, findUnique, commentGroupBy, commentCount } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  commentGroupBy: vi.fn(),
  commentCount: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    vox: {
      findMany,
      findUnique,
    },
    comment: {
      groupBy: commentGroupBy,
      count: commentCount,
    },
  },
}));

const row = (
  id: string,
  opts: { lastActivityAt?: Date; pinnedAt?: Date | null; mediaUrl?: string | null } = {},
) => ({
  id,
  title: "t",
  category: "GENERAL",
  thumbnailUrl: null,
  mediaUrl: opts.mediaUrl ?? null,
  mediaType: "IMAGE",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  lastActivityAt: opts.lastActivityAt ?? new Date("2024-02-01T00:00:00.000Z"),
  hasPoll: false,
  pinnedAt: opts.pinnedAt ?? null,
});

type FindManyArgs = { where: { AND: unknown[] } };
const lastWhereClause = (): unknown => {
  const args = findMany.mock.calls[0]?.[0] as FindManyArgs;
  return args.where.AND[args.where.AND.length - 1];
};

describe("listVoxListItems pagination", () => {
  beforeEach(() => {
    findMany.mockReset();
    findUnique.mockReset();
    commentGroupBy.mockReset();
    commentGroupBy.mockResolvedValue([]);
    commentCount.mockReset();
    commentCount.mockResolvedValue(0);
  });

  it("uses take = limit + 1 and returns a keyset cursor of the last item", async () => {
    const bActivity = new Date("2024-03-05T10:00:00.000Z");
    findMany.mockResolvedValueOnce([row("a"), row("b", { lastActivityAt: bActivity }), row("c")]);

    const page = await listVoxListItems({ view: "default", limit: 2 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        orderBy: [
          { pinnedAt: { sort: "desc", nulls: "last" } },
          { lastActivityAt: "desc" },
          { id: "desc" },
        ],
      }),
    );
    expect(page.items.map((x) => x.id)).toEqual(["a", "b"]);
    expect(page.hasMore).toBe(true);
    expect(decodeVoxListCursor(page.nextCursor!)).toEqual({
      id: "b",
      pinnedAtMs: null,
      lastActivityAtMs: bActivity.getTime(),
    });
  });

  it("returns no cursor without more pages", async () => {
    findMany.mockResolvedValueOnce([row("a")]);
    const page = await listVoxListItems({ view: "default", limit: 2 });
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it("exposes coverGifUrl when the main image is a .gif", async () => {
    findMany.mockResolvedValueOnce([row("g", { mediaUrl: "https://cdn.example/u.gif" })]);
    const page = await listVoxListItems({ view: "default", limit: 10 });
    expect(page.items[0]?.coverGifUrl).toBe("https://cdn.example/u.gif");
  });

  it("unpinned cursor: filters by activity and id after it and skips pinned vox", async () => {
    findMany.mockResolvedValueOnce([]);
    const at = new Date("2024-03-01T00:00:00.000Z");
    const cursor = encodeVoxListCursor({
      id: "m",
      pinnedAtMs: null,
      lastActivityAtMs: at.getTime(),
    });

    await listVoxListItems({ view: "default", cursor, limit: 10 });

    expect(findMany.mock.calls[0]?.[0]).not.toHaveProperty("cursor");
    expect(lastWhereClause()).toEqual({
      pinnedAt: null,
      OR: [{ lastActivityAt: { lt: at } }, { lastActivityAt: at, id: { lt: "m" } }],
    });
  });

  it("pinned cursor: continues with older pinned vox, then unpinned ones", async () => {
    findMany.mockResolvedValueOnce([]);
    const pinnedAt = new Date("2024-04-01T00:00:00.000Z");
    const at = new Date("2024-03-01T00:00:00.000Z");
    const cursor = encodeVoxListCursor({
      id: "p",
      pinnedAtMs: pinnedAt.getTime(),
      lastActivityAtMs: at.getTime(),
    });

    await listVoxListItems({ view: "default", cursor, limit: 10 });

    expect(lastWhereClause()).toEqual({
      OR: [
        { pinnedAt: null },
        { pinnedAt: { lt: pinnedAt } },
        {
          pinnedAt,
          OR: [{ lastActivityAt: { lt: at } }, { lastActivityAt: at, id: { lt: "p" } }],
        },
      ],
    });
  });

  it("accepts a bare id (legacy cursor) by resolving its position", async () => {
    const at = new Date("2024-03-02T00:00:00.000Z");
    findUnique.mockResolvedValueOnce({ id: "legacy", pinnedAt: null, lastActivityAt: at });
    findMany.mockResolvedValueOnce([]);

    await listVoxListItems({ view: "default", cursor: "legacy", limit: 10 });

    expect(lastWhereClause()).toEqual({
      pinnedAt: null,
      OR: [{ lastActivityAt: { lt: at } }, { lastActivityAt: at, id: { lt: "legacy" } }],
    });
  });

  it("throws InvalidVoxListCursorError for an invalid cursor or a deleted vox", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(
      listVoxListItems({ view: "default", cursor: "gone", limit: 10 }),
    ).rejects.toBeInstanceOf(InvalidVoxListCursorError);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("adds a category name filter", async () => {
    findMany.mockResolvedValueOnce([]);
    await listVoxListItems({ view: "default", limit: 10, category: "General" });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([{ deletedAt: null }, { category: "General" }]),
        },
      }),
    );
  });

  it("favorites sort only by activity and the cursor ignores pins", async () => {
    findMany.mockResolvedValueOnce([]);
    const at = new Date("2024-03-01T00:00:00.000Z");
    const cursor = encodeVoxListCursor({
      id: "f",
      pinnedAtMs: 123,
      lastActivityAtMs: at.getTime(),
    });

    await listVoxListItems({ view: "favorites", sessionUserId: "u1", cursor, limit: 10 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(lastWhereClause()).toEqual({
      OR: [{ lastActivityAt: { lt: at } }, { lastActivityAt: at, id: { lt: "f" } }],
    });
  });

  it("counts comments bounded to the vox ids of the page", async () => {
    findMany.mockResolvedValueOnce([row("v1"), row("v2")]);
    commentGroupBy.mockResolvedValueOnce([
      { voxId: "v1", _count: { _all: 7 } },
      { voxId: "v2", _count: { _all: 3 } },
    ]);

    const page = await listVoxListItems({ view: "default", limit: 10 });

    expect(commentGroupBy).toHaveBeenCalledWith({
      by: ["voxId"],
      where: {
        voxId: { in: ["v1", "v2"] },
        deletedAt: null,
      },
      _count: { _all: true },
    });
    expect(page.items.find((x) => x.id === "v1")?.replies).toBe(7);
    expect(page.items.find((x) => x.id === "v2")?.replies).toBe(3);
  });
});

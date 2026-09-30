import { describe, expect, it, vi, beforeEach } from "vitest";
import { encodeSearchCursor, parseSearchCursor, searchVoxListItems } from "./searchList";

const { queryRaw } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $queryRaw: queryRaw,
  },
}));

describe("parseSearchCursor / encodeSearchCursor", () => {
  it("first page without a cursor starts at offset 0", () => {
    expect(parseSearchCursor(null)).toEqual({ ok: true, offset: 0 });
    expect(parseSearchCursor("")).toEqual({ ok: true, offset: 0 });
  });

  it("an s:N cursor returns the offset", () => {
    expect(parseSearchCursor("s:24")).toEqual({ ok: true, offset: 24 });
    expect(encodeSearchCursor(24)).toBe("s:24");
  });

  it("invalid cursor", () => {
    expect(parseSearchCursor("bad")).toEqual({ ok: false, reason: "invalid" });
    expect(parseSearchCursor("s:-1")).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("searchVoxListItems", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("an empty query returns an empty page without SQL", async () => {
    const page = await searchVoxListItems({ q: "   " });
    expect(page).toEqual({ items: [], nextCursor: null, hasMore: false });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("paginates results and exposes nextCursor", async () => {
    const row = {
      id: "v1",
      title: "Hola mundo",
      category: "General",
      thumbnailUrl: null,
      mediaUrl: null,
      mediaType: "IMAGE",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      replies: 1,
      favorited: false,
      hasPoll: false,
    };
    queryRaw.mockResolvedValueOnce([row, row]);

    const page = await searchVoxListItems({ q: "hola", limit: 1, cursor: null });

    expect(page.items.length).toBe(1);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("s:1");
    expect(page.items[0]?.title).toBe("Hola mundo");
  });
});

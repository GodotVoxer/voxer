import { describe, expect, it } from "vitest";
import { sortUnreadFirst } from "./sortUnreadFirst";

describe("sortUnreadFirst", () => {
  it("moves unread items first keeping their relative order", () => {
    const items = [
      { id: "a", readAt: "2026-01-03T00:00:00.000Z" },
      { id: "b", readAt: null },
      { id: "c", readAt: "2026-01-02T00:00:00.000Z" },
      { id: "d", readAt: null },
      { id: "e", readAt: "2026-01-01T00:00:00.000Z" },
    ];
    expect(sortUnreadFirst(items).map((i) => i.id)).toEqual(["b", "d", "a", "c", "e"]);
  });

  it("changes nothing when all are read or all unread", () => {
    const allRead = [
      { id: "a", readAt: "2026-01-02T00:00:00.000Z" },
      { id: "b", readAt: "2026-01-01T00:00:00.000Z" },
    ];
    expect(sortUnreadFirst(allRead).map((i) => i.id)).toEqual(["a", "b"]);

    const allUnread = [
      { id: "a", readAt: null },
      { id: "b", readAt: null },
    ];
    expect(sortUnreadFirst(allUnread).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("returns empty for an empty list", () => {
    expect(sortUnreadFirst([])).toEqual([]);
  });
});

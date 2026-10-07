import { describe, expect, it, vi, afterEach } from "vitest";
import { api } from "@/features/http/apiClient";
import { HOME_FEED_PRELOAD_HREF } from "@/lib/vox/homeFeedPreload";
import { VOX_LIST_PAGE_SIZE } from "@/lib/limits";
import { getVoxListPage, getVoxPollById, toggleModerationVoxPin } from "./api";

describe("getVoxListPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("requests the regular feed without view", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
    });
    await getVoxListPage({ view: "default" });
    expect(spy).toHaveBeenCalledWith("/vox", {
      params: { cursor: undefined, limit: 24 },
    });
  });
  it("requests the home's first page at the URL the page preloads", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
    });
    // Same arguments as the store's `fetchInitialPage` for the unfiltered home.
    await getVoxListPage({
      view: "default",
      cursor: null,
      limit: VOX_LIST_PAGE_SIZE,
      categoryCode: null,
      searchQuery: null,
    });
    const [url, config] = spy.mock.calls[0]!;
    expect(api.getUri({ url, ...config })).toBe(HOME_FEED_PRELOAD_HREF);
  });
  it("requests hidden vox with view=hidden", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
    });
    await getVoxListPage({ view: "hidden", cursor: "c1", limit: 10 });
    expect(spy).toHaveBeenCalledWith("/vox", {
      params: { view: "hidden", cursor: "c1", limit: 10 },
    });
  });
  it("requests favorites with view=favorites", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
    });
    await getVoxListPage({ view: "favorites" });
    expect(spy).toHaveBeenCalledWith("/vox", {
      params: { view: "favorites", cursor: undefined, limit: 24 },
    });
  });
  it("requests the user's vox with view=mine", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
    });
    await getVoxListPage({ view: "mine", limit: 12 });
    expect(spy).toHaveBeenCalledWith("/vox", {
      params: { view: "mine", cursor: undefined, limit: 12 },
    });
  });
  it("requests a category with an uppercase categoryCode", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
    });
    await getVoxListPage({ view: "default", categoryCode: "gen" });
    expect(spy).toHaveBeenCalledWith("/vox", {
      params: { categoryCode: "GEN", cursor: undefined, limit: 24 },
    });
  });
  it("requests a search with q when searchQuery is set", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
    });
    await getVoxListPage({ view: "default", searchQuery: "  hola  " });
    expect(spy).toHaveBeenCalledWith("/vox", {
      params: { q: "hola", cursor: undefined, limit: 24 },
    });
  });
});

describe("toggleModerationVoxPin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("POST /moderation/vox/:id/pin", async () => {
    const spy = vi.spyOn(api, "post").mockResolvedValue({
      data: { ok: true as const, pinnedAt: "2026-01-01T00:00:00.000Z" },
    });
    const r = await toggleModerationVoxPin("vox-1");
    expect(spy).toHaveBeenCalledWith("/moderation/vox/vox-1/pin");
    expect(r).toEqual({ ok: true, pinnedAt: "2026-01-01T00:00:00.000Z" });
  });
});

describe("getVoxPollById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("requests GET /vox/:id/poll and returns the poll", async () => {
    const payload = {
      poll: {
        options: [{ id: "o1", label: "A", sortOrder: 0 }],
        tallies: [{ optionId: "o1", count: 1, percent: 100 }],
        totalVotes: 1,
        viewerVoteOptionId: "o1" as const,
      },
    };
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: payload });
    const poll = await getVoxPollById("abc");
    expect(spy).toHaveBeenCalledWith("/vox/abc/poll");
    expect(poll).toEqual(payload.poll);
  });
  it("returns null when the API answers poll null", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: { poll: null } });
    const poll = await getVoxPollById("xyz");
    expect(poll).toBeNull();
  });
});

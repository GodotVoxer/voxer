import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getVoxListPage } from "./api";
import type { VoxListItem } from "@/lib/vox/types";
import { useVoxStore } from "./store";

vi.mock("./api", () => ({
  getVoxListPage: vi.fn(),
}));

const listItem = (id: string, favorited = false): VoxListItem => ({
  id,
  title: "t",
  category: "GENERAL",
  thumbnailUrl: null,
  coverGifUrl: null,
  animatedImage: false,
  mediaType: "IMAGE",
  replies: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  favorited,
  hasPoll: false,
  pinnedAt: null,
});

describe("useVoxStore pagination", () => {
  beforeEach(() => {
    vi.mocked(getVoxListPage).mockReset();
    useVoxStore.setState({
      currentListView: "default",
      defaultListCategoryCode: null,
      defaultListSearchQuery: null,
      feeds: {
        default: {
          items: [],
          nextCursor: null,
          hasMore: true,
          loadingInitial: false,
          loadingMore: false,
          error: null,
        },
        hidden: {
          items: [],
          nextCursor: null,
          hasMore: true,
          loadingInitial: false,
          loadingMore: false,
          error: null,
        },
        favorites: {
          items: [],
          nextCursor: null,
          hasMore: true,
          loadingInitial: false,
          loadingMore: false,
          error: null,
        },
        mine: {
          items: [],
          nextCursor: null,
          hasMore: true,
          loadingInitial: false,
          loadingMore: false,
          error: null,
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchInitialPage keeps loadingInitial true until it resolves", async () => {
    let resolvePage!: (page: {
      items: VoxListItem[];
      nextCursor: string | null;
      hasMore: boolean;
    }) => void;
    const pending = new Promise<{
      items: VoxListItem[];
      nextCursor: string | null;
      hasMore: boolean;
    }>((r) => {
      resolvePage = r;
    });
    vi.mocked(getVoxListPage).mockReturnValueOnce(pending);

    const p = useVoxStore.getState().fetchInitialPage("default");
    expect(useVoxStore.getState().feeds.default.loadingInitial).toBe(true);

    resolvePage({ items: [listItem("v1")], nextCursor: "v1", hasMore: true });
    await p;

    expect(useVoxStore.getState().feeds.default.loadingInitial).toBe(false);
    expect(useVoxStore.getState().feeds.default.items[0]?.id).toBe("v1");
    expect(useVoxStore.getState().feeds.default.nextCursor).toBe("v1");
    expect(useVoxStore.getState().feeds.default.hasMore).toBe(true);
  });

  it("fetchNextPage appends items without duplicate ids", async () => {
    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("a"), listItem("b")],
      nextCursor: "b",
      hasMore: true,
    });
    await useVoxStore.getState().fetchInitialPage("default");
    expect(useVoxStore.getState().feeds.default.items.map((x) => x.id)).toEqual(["a", "b"]);

    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("b"), listItem("c")],
      nextCursor: "c",
      hasMore: false,
    });
    await useVoxStore.getState().fetchNextPage("default");

    expect(useVoxStore.getState().feeds.default.items.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(useVoxStore.getState().feeds.default.hasMore).toBe(false);
    expect(useVoxStore.getState().feeds.default.nextCursor).toBe("c");
  });

  it("refreshCurrentView resets and fetches the first page again", async () => {
    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("a")],
      nextCursor: "a",
      hasMore: true,
    });
    await useVoxStore.getState().fetchInitialPage("default");
    expect(useVoxStore.getState().feeds.default.items.length).toBe(1);

    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("x")],
      nextCursor: "x",
      hasMore: false,
    });
    await useVoxStore.getState().refreshCurrentView();
    expect(useVoxStore.getState().feeds.default.items.map((i) => i.id)).toEqual(["x"]);
  });

  it("removeVoxFromFeeds removes the vox from every view", async () => {
    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("a"), listItem("b")],
      nextCursor: null,
      hasMore: false,
    });
    await useVoxStore.getState().fetchInitialPage("default");
    useVoxStore.setState((s) => ({
      feeds: {
        ...s.feeds,
        hidden: { ...s.feeds.hidden, items: [listItem("b")] },
      },
    }));

    useVoxStore.getState().removeVoxFromFeeds("b");
    expect(useVoxStore.getState().feeds.default.items.map((i) => i.id)).toEqual(["a"]);
    expect(useVoxStore.getState().feeds.hidden.items.length).toBe(0);
  });

  it("setVoxFavoritedInFeeds updates favorited in every view", async () => {
    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("a"), listItem("b")],
      nextCursor: null,
      hasMore: false,
    });
    await useVoxStore.getState().fetchInitialPage("default");
    useVoxStore.setState((s) => ({
      feeds: {
        ...s.feeds,
        mine: { ...s.feeds.mine, items: [listItem("b")] },
      },
    }));

    useVoxStore.getState().setVoxFavoritedInFeeds("b", true);
    expect(useVoxStore.getState().feeds.default.items.find((i) => i.id === "b")?.favorited).toBe(
      true,
    );
    expect(useVoxStore.getState().feeds.mine.items.find((i) => i.id === "b")?.favorited).toBe(true);
  });

  it("fetchInitialPage with categoryCode requests and stores that code", async () => {
    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("z")],
      nextCursor: null,
      hasMore: false,
    });
    await useVoxStore.getState().fetchInitialPage("default", { categoryCode: "gen" });
    expect(useVoxStore.getState().defaultListCategoryCode).toBe("GEN");
    expect(vi.mocked(getVoxListPage)).toHaveBeenCalledWith(
      expect.objectContaining({ categoryCode: "GEN", view: "default" }),
    );
  });

  it("fetchNextPage on default uses defaultListCategoryCode", async () => {
    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("a")],
      nextCursor: "c1",
      hasMore: true,
    });
    await useVoxStore.getState().fetchInitialPage("default", { categoryCode: "tec" });
    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("b")],
      nextCursor: null,
      hasMore: false,
    });
    await useVoxStore.getState().fetchNextPage("default");
    expect(vi.mocked(getVoxListPage).mock.calls[1]?.[0]).toMatchObject({
      view: "default",
      cursor: "c1",
      categoryCode: "TEC",
    });
  });

  it("drops the late response of an earlier search", async () => {
    let resolveOld: (page: Awaited<ReturnType<typeof getVoxListPage>>) => void = () => {};
    vi.mocked(getVoxListPage)
      .mockImplementationOnce(() => new Promise((r) => (resolveOld = r)))
      .mockResolvedValueOnce({ items: [listItem("nuevo")], nextCursor: null, hasMore: false });
    const store = useVoxStore.getState();
    const old = store.fetchInitialPage("default", { searchQuery: "viejo" });
    await store.fetchInitialPage("default", { searchQuery: "nuevo" });
    resolveOld({ items: [listItem("viejo")], nextCursor: null, hasMore: false });
    await old;
    expect(useVoxStore.getState().feeds.default.items.map((i) => i.id)).toEqual(["nuevo"]);
  });

  it("does not mix another search's next page into the new one", async () => {
    vi.mocked(getVoxListPage).mockResolvedValueOnce({
      items: [listItem("a")],
      nextCursor: "c1",
      hasMore: true,
    });
    await useVoxStore.getState().fetchInitialPage("default", { searchQuery: "viejo" });
    let resolveNext: (page: Awaited<ReturnType<typeof getVoxListPage>>) => void = () => {};
    vi.mocked(getVoxListPage)
      .mockImplementationOnce(() => new Promise((r) => (resolveNext = r)))
      .mockResolvedValueOnce({ items: [listItem("n")], nextCursor: null, hasMore: false });
    const next = useVoxStore.getState().fetchNextPage("default");
    await useVoxStore.getState().fetchInitialPage("default", { searchQuery: "nuevo" });
    resolveNext({ items: [listItem("b")], nextCursor: null, hasMore: false });
    await next;
    expect(useVoxStore.getState().feeds.default.items.map((i) => i.id)).toEqual(["n"]);
  });
});

describe("useVoxStore seedDefaultFeed", () => {
  const page = (ids: string[]) => ({
    items: ids.map((id) => listItem(id)),
    nextCursor: "c1",
    hasMore: true,
  });
  const resetDefault = (categoryCode: string | null, ids: string[]) =>
    useVoxStore.setState((s) => ({
      defaultListCategoryCode: categoryCode,
      defaultListSearchQuery: null,
      feeds: {
        ...s.feeds,
        default: {
          items: ids.map((id) => listItem(id)),
          nextCursor: null,
          hasMore: true,
          loadingInitial: true,
          loadingMore: false,
          error: null,
        },
      },
    }));

  it("loads the HTML page and hides the skeleton", () => {
    resetDefault(null, []);
    useVoxStore.getState().seedDefaultFeed(page(["a", "b"]), null);
    const s = useVoxStore.getState();
    expect(s.feeds.default.items.map((v) => v.id)).toEqual(["a", "b"]);
    expect(s.feeds.default.loadingInitial).toBe(false);
    expect(s.feeds.default.nextCursor).toBe("c1");
  });

  it("does not overwrite the same list the store already has", () => {
    resetDefault("GEN", ["nuevo"]);
    useVoxStore.getState().seedDefaultFeed(page(["viejo"]), "gen");
    expect(useVoxStore.getState().feeds.default.items.map((v) => v.id)).toEqual(["nuevo"]);
  });

  it("replaces the list of another category", () => {
    resetDefault(null, ["inicio"]);
    useVoxStore.getState().seedDefaultFeed(page(["gen"]), "GEN");
    const s = useVoxStore.getState();
    expect(s.defaultListCategoryCode).toBe("GEN");
    expect(s.feeds.default.items.map((v) => v.id)).toEqual(["gen"]);
  });
});

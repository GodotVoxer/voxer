import { http, HttpResponse } from "msw";
import { getMockVoxDetail, voxList } from "@/mocks/data/voxList";
import type { VoxDetail, VoxListItem, VoxListPage } from "@/lib/vox/types";
import { getCategoryFromCode } from "@/lib/vox/categoryCodes";
import { extractYoutubeVideoId } from "@/lib/media/youtube";
import { rankVoxRowsByFuzzyTitle, significantSearchTokens } from "@/lib/vox/titleSearch";
import { coverGifUrlFromVoxMedia } from "@/lib/vox/coverGifUrl";
import {
  appendVoxDescriptionFeatureMarkerLines,
  parseVoxDescriptionFeatureMarkers,
} from "@/lib/vox/descriptionFeatureMarkers";
import {
  demoState,
  withMswDemoFreshCreatedAt,
  sortMswDefaultHomeByPin,
  readMockRulesAccepted,
  mockRulesNotAcceptedResponse,
  mockDetailOverrides,
  parseJson,
} from "@/mocks/handlers/shared";

export const voxHandlers = [
  http.get("/api/vox", ({ request }) => {
    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    const rawQ = url.searchParams.get("q")?.trim() ?? "";
    const rawCat = url.searchParams.get("categoryCode")?.trim();
    const cursor = url.searchParams.get("cursor");
    const rawLimit = url.searchParams.get("limit");
    const limitNum = Number.parseInt(rawLimit ?? "24", 10);
    const limit = Number.isFinite(limitNum) ? Math.min(Math.max(limitNum, 1), 50) : 24;

    const empty: VoxListPage = { items: [], nextCursor: null, hasMore: false };

    if (rawQ.length > 0) {
      if (view && view !== "default") {
        return HttpResponse.json(
          { error: "La búsqueda solo aplica al listado principal." },
          {
            status: 400,
          },
        );
      }
      if (rawCat) {
        return HttpResponse.json({ error: "No combinás búsqueda con categoría." }, { status: 400 });
      }
      const sig = significantSearchTokens(rawQ);
      const qLower = rawQ.toLowerCase();
      const pool = voxList.filter((v) => {
        const t = v.title.toLowerCase();
        if (sig.length > 0) {
          return sig.every((tok) => t.includes(tok));
        }
        return qLower.length > 0 && t.includes(qLower);
      });
      const ranked = rankVoxRowsByFuzzyTitle(pool, rawQ);
      let offset = 0;
      if (cursor != null && cursor !== "") {
        const m = /^s:(\d+)$/.exec(cursor.trim());
        if (!m) {
          return HttpResponse.json({ error: "Cursor inválido" }, { status: 400 });
        }
        offset = Number.parseInt(m[1], 10);
      }
      const take = limit + 1;
      const window = ranked.slice(offset, offset + take);
      const hasMore = offset + limit < ranked.length;
      const itemsPage = hasMore ? window.slice(0, limit) : window;
      const nextCursor = hasMore ? `s:${offset + itemsPage.length}` : null;
      return HttpResponse.json({
        items: withMswDemoFreshCreatedAt(itemsPage),
        nextCursor,
        hasMore,
      } satisfies VoxListPage);
    }

    if (view === "favorites") {
      const items = voxList.filter((v) => v.favorited);
      return HttpResponse.json({
        items: withMswDemoFreshCreatedAt(items),
        nextCursor: null,
        hasMore: false,
      } satisfies VoxListPage);
    }
    if (view === "hidden" || view === "mine") {
      return HttpResponse.json(empty);
    }
    const categoryName = rawCat ? getCategoryFromCode(rawCat) : null;
    const base =
      categoryName == null ? [...voxList] : voxList.filter((v) => v.category === categoryName);
    const ordered = sortMswDefaultHomeByPin(base);
    return HttpResponse.json({
      items: withMswDemoFreshCreatedAt(ordered),
      nextCursor: null,
      hasMore: false,
    } satisfies VoxListPage);
  }),
  http.get("/api/vox/:id", ({ params }) => {
    const id = String(params.id);
    const override = mockDetailOverrides.get(id);
    if (override) return HttpResponse.json(override);
    const detail = getMockVoxDetail(id);
    if (!detail) {
      return HttpResponse.json({ error: "Vox no encontrado" }, { status: 404 });
    }
    return HttpResponse.json(detail);
  }),
  http.get("/api/vox/:id/poll", ({ params }) => {
    const id = String(params.id);
    const row = voxList.find((v) => v.id === id);
    if (!row) {
      return HttpResponse.json({ error: "Vox no encontrado" }, { status: 404 });
    }
    if (!row.hasPoll) {
      return HttpResponse.json({ poll: null });
    }
    return HttpResponse.json({
      poll: {
        options: [
          { id: "msw-opt-a", label: "Opción A", sortOrder: 0 },
          { id: "msw-opt-b", label: "Opción B", sortOrder: 1 },
        ],
        tallies: [
          { optionId: "msw-opt-a", count: 0, percent: 0 },
          { optionId: "msw-opt-b", count: 0, percent: 0 },
        ],
        totalVotes: 0,
        viewerVoteOptionId: null,
      },
    });
  }),
  http.post("/api/vox/:id/poll/vote", ({ params }) => {
    const id = String(params.id);
    if (!voxList.find((v) => v.id === id)) {
      return HttpResponse.json({ error: "Vox no encontrado" }, { status: 404 });
    }
    return HttpResponse.json({
      poll: {
        options: [
          { id: "msw-opt-a", label: "Opción A", sortOrder: 0 },
          { id: "msw-opt-b", label: "Opción B", sortOrder: 1 },
        ],
        tallies: [
          { optionId: "msw-opt-a", count: 1, percent: 100 },
          { optionId: "msw-opt-b", count: 0, percent: 0 },
        ],
        totalVotes: 1,
        viewerVoteOptionId: "msw-opt-a",
      },
    });
  }),
  http.post("/api/vox", async ({ request }) => {
    if (!readMockRulesAccepted()) return mockRulesNotAcceptedResponse();
    const parsed = parseJson<{
      title: string;
      description: string;
      category: string;
      mediaType: string;
      mediaUrl?: string;
      thumbnailUrl?: string;
      youtubeVideoId?: string;
      youtubeUrl?: string;
      poll?: { options: string[] };
      threadUniqueIdsEnabled?: boolean;
      countryFlagsEnabled?: boolean;
    }>(await request.text());
    if (!parsed?.title || !parsed.description || !parsed.category) {
      return HttpResponse.json({ error: "Faltan campos" }, { status: 400 });
    }
    const fromDesc = parseVoxDescriptionFeatureMarkers(parsed.description);
    const threadUniqueIdsEnabled =
      Boolean(parsed.threadUniqueIdsEnabled) || fromDesc.threadUniqueIdsFromDescription;
    const countryFlagsEnabled =
      Boolean(parsed.countryFlagsEnabled) || fromDesc.countryFlagsFromDescription;
    const descriptionStored = appendVoxDescriptionFeatureMarkerLines(parsed.description, {
      threadUniqueIds: threadUniqueIdsEnabled,
      countryFlags: countryFlagsEnabled,
    });
    const newId = String(demoState.voxCounter++);
    const isYt =
      parsed.mediaType === "YOUTUBE" || Boolean(parsed.youtubeUrl || parsed.youtubeVideoId);
    const ytId =
      parsed.youtubeVideoId ??
      (parsed.youtubeUrl ? extractYoutubeVideoId(parsed.youtubeUrl) : null) ??
      "dQw4w9WgXcQ";
    const thumb =
      parsed.thumbnailUrl ||
      parsed.mediaUrl ||
      (isYt ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "/video-thumb.svg");
    const listMediaType = isYt
      ? "YOUTUBE"
      : parsed.mediaType === "UPLOADED_VIDEO"
        ? "UPLOADED_VIDEO"
        : "IMAGE";
    const listItem: VoxListItem = {
      id: newId,
      animatedImage: false,
      title: parsed.title,
      category: parsed.category,
      thumbnailUrl: thumb,
      coverGifUrl: coverGifUrlFromVoxMedia(listMediaType, parsed.mediaUrl ?? null),
      mediaType: listMediaType,
      replies: 0,
      createdAt: new Date().toISOString(),
      favorited: false,
      hasPoll: Boolean(
        parsed && typeof parsed === "object" && parsed !== null && "poll" in parsed && parsed.poll,
      ),
      pinnedAt: null,
    };
    voxList.unshift(listItem);
    const detail: VoxDetail = {
      id: newId,
      title: parsed.title,
      description: descriptionStored,
      category: parsed.category,
      mediaType: listItem.mediaType,
      mediaUrl: isYt ? `https://www.youtube.com/embed/${ytId}` : (parsed.mediaUrl ?? thumb),
      thumbnailUrl: thumb,
      animatedImage: false,
      youtubeVideoId: isYt ? ytId : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      following: false,
      hidden: false,
      favorited: false,
      isOwner: true,
      threadUniqueIdsEnabled,
      countryFlagsEnabled,
      hasPoll: listItem.hasPoll,
      poll: null,
    };
    mockDetailOverrides.set(newId, detail);
    return HttpResponse.json({ id: newId }, { status: 201 });
  }),
  http.post("/api/vox/:id/follow", () => HttpResponse.json({ ok: true })),
  http.delete("/api/vox/:id/follow", () => HttpResponse.json({ ok: true })),
  http.post("/api/vox/:id/hide", () => HttpResponse.json({ ok: true })),
  http.delete("/api/vox/:id/hide", () => HttpResponse.json({ ok: true })),
  http.post("/api/vox/:id/favorite", ({ params }) => {
    const id = String(params.id);
    const row = voxList.find((v) => v.id === id);
    if (row) row.favorited = true;
    return HttpResponse.json({ ok: true });
  }),
  http.delete("/api/vox/:id/favorite", ({ params }) => {
    const id = String(params.id);
    const row = voxList.find((v) => v.id === id);
    if (row) row.favorited = false;
    return HttpResponse.json({ ok: true });
  }),
];

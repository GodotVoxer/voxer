import { http, HttpResponse } from "msw";
import { appendMockComment, getMockComments, seedMockComments } from "@/mocks/data/mockComments";
import { voxList } from "@/mocks/data/voxList";
import type { CommentPublic } from "@/lib/vox/types";
import { extractYoutubeVideoId } from "@/lib/media/youtube";
import { replyTagsErrorMessageEs, validateCommentReplyTags } from "@/lib/comments/replies";
import { COMMENT_BODY_MAX } from "@/lib/limits";
import {
  readMockRulesAccepted,
  mockRulesNotAcceptedResponse,
  parseJson,
  DEMO_MY_COMMENT_BODIES,
} from "@/mocks/handlers/shared";

export const commentsHandlers = [
  http.get("/api/me/comments", ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim().toLocaleLowerCase("es") ?? "";
    const cursor = Number.parseInt(url.searchParams.get("cursor")?.replace(/^m:/, "") ?? "0", 10);
    const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 30) : 20;
    const base = new Date("2024-06-02T10:00:00.000Z").getTime();
    const allItems = Array.from({ length: 64 }, (_, i) => {
      const vox = voxList[i % voxList.length]!;
      return {
        id: `${vox.id}-mine-${i}`,
        publicTag: `MINE${String(i).padStart(4, "0")}`,
        body: DEMO_MY_COMMENT_BODIES[i] ?? `Comentario de historial ${i + 1}`,
        createdAt: new Date(base - i * 3_600_000).toISOString(),
        imageUrl: null,
        videoUrl: null,
        videoPosterUrl: null,
        animatedImage: false,
        pinned: i === 1,
        voxId: vox.id,
        voxTitle: vox.title,
        voxCategory: vox.category,
      };
    });
    const filtered = query
      ? allItems.filter((item) => item.body.toLocaleLowerCase("es").includes(query))
      : allItems;
    const offset = Number.isFinite(cursor) && cursor >= 0 ? cursor : 0;
    const items = filtered.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < filtered.length;
    return HttpResponse.json({
      items,
      nextCursor: hasMore ? `m:${nextOffset}` : null,
      hasMore,
    });
  }),
  http.get("/api/vox/:id/comments", ({ params }) => {
    const id = String(params.id);
    const row = voxList.find((v) => v.id === id);
    if (!row) {
      return HttpResponse.json({ error: "Vox no encontrado" }, { status: 404 });
    }
    seedMockComments(id, row.replies);
    const comments = getMockComments(id);
    return HttpResponse.json({ comments, nextCursor: null });
  }),
  http.post("/api/vox/:id/comments", async ({ params, request }) => {
    if (!readMockRulesAccepted()) return mockRulesNotAcceptedResponse();
    const id = String(params.id);
    const row = voxList.find((v) => v.id === id);
    if (!row) {
      return HttpResponse.json({ error: "Vox no encontrado" }, { status: 404 });
    }
    seedMockComments(id, row.replies);
    const parsed = parseJson<{
      body?: string;
      displayName?: string;
      imageUrl?: string;
      videoUrl?: string;
      videoPosterUrl?: string;
      youtubeUrl?: string;
      showStaffIdentity?: boolean;
    }>(await request.text());
    const hasMedia = Boolean(
      parsed?.imageUrl?.trim() || parsed?.videoUrl?.trim() || parsed?.youtubeUrl?.trim(),
    );
    if (!parsed || (!parsed.body?.trim() && !hasMedia)) {
      return HttpResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const rawBody = parsed.body?.trim() ?? "";
    if (rawBody.length > COMMENT_BODY_MAX) {
      return HttpResponse.json({ error: "El comentario es demasiado largo" }, { status: 400 });
    }
    const existingUpper = new Set(getMockComments(id).map((c) => c.publicTag.toUpperCase()));
    const tagErr = validateCommentReplyTags({
      newBody: rawBody,
      existingPublicTagsUpper: existingUpper,
    });
    if (tagErr) {
      return HttpResponse.json({ error: replyTagsErrorMessageEs(tagErr) }, { status: 400 });
    }
    const dn = parsed.displayName?.trim() || "Anónimo";
    const staffBadge = parsed.showStaffIdentity === true ? ("MOD" as const) : null;
    const ytFromField = parsed.youtubeUrl?.trim()
      ? extractYoutubeVideoId(parsed.youtubeUrl.trim())
      : null;
    const mockVideoUrl = parsed.videoUrl?.trim()
      ? parsed.videoUrl.trim()
      : ytFromField
        ? `https://www.youtube.com/embed/${ytFromField}`
        : null;
    const isYt = Boolean(mockVideoUrl?.includes("youtube.com/embed"));
    const created: CommentPublic = {
      id: `mock-${id}-${Date.now()}`,
      publicTag: Array.from({ length: 8 }, () =>
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(Math.random() * 36)),
      ).join(""),
      body: rawBody,
      displayName: dn,
      imageUrl: parsed.imageUrl?.trim() ?? null,
      videoUrl: mockVideoUrl,
      videoPosterUrl: isYt ? null : (parsed.videoPosterUrl?.trim() ?? null),
      avatarVariant: "PINK",
      staffBadge,
      isOp: false,
      createdAt: new Date().toISOString(),
      threadTag: null,
      countryCode: null,
      pollVoteLabel: null,
      pollVoteHue: null,
      isMine: true,
    };
    appendMockComment(id, created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.post("/api/comments/:id/mute", () => HttpResponse.json({ ok: true, repliesMuted: true })),
  http.delete("/api/comments/:id/mute", () => HttpResponse.json({ ok: true, repliesMuted: false })),
  http.post("/api/comments/:id/pin", () =>
    HttpResponse.json({ ok: true, pinnedAt: new Date().toISOString() }),
  ),
  http.delete("/api/comments/:id/pin", () => HttpResponse.json({ ok: true, pinnedAt: null })),
];

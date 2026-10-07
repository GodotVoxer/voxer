import { mockModerationActions, mockModerationPreview } from "@/mocks/data/moderationActions";
import { http, HttpResponse } from "msw";
import { voxList } from "@/mocks/data/voxList";

export const moderationHandlers = [
  http.get("/api/moderation/notifications", () => {
    return HttpResponse.json({
      notifications: [
        {
          id: "mock-mod-notif-1",
          readAt: null,
          voxId: "1",
          message: "Denuncia en: ¿Cuál es el mejor lenguaje para sistemas?",
          thumbnailUrl: null,
          commentHash: null,
          reportDetails: "Contenido ofensivo y spam repetido en el hilo.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }),
  http.post("/api/moderation/notifications/mark-read", () => {
    return HttpResponse.json({ ok: true, marked: 1 });
  }),
  http.delete("/api/moderation/notifications", () => {
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/moderation/actions", () => {
    return HttpResponse.json({ actions: mockModerationActions, nextCursor: null });
  }),
  http.get("/api/moderation/actions/:id/preview", ({ params, request }) => {
    const page = mockModerationPreview(
      String(params.id),
      Number(new URL(request.url).searchParams.get("offset") ?? 0),
    );
    return page
      ? HttpResponse.json(page)
      : HttpResponse.json({ error: "Acción no encontrada." }, { status: 404 });
  }),
  http.post(/\/api\/moderation\/actions\/[^/]+\/undo$/, () => {
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/moderation/staff", () => {
    return HttpResponse.json({ users: [] });
  }),
  http.post("/api/moderation/staff", () => {
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),
  http.get("/api/moderation/vox/:id/owner", () => {
    return HttpResponse.json({ ownerId: null as string | null });
  }),
  http.post("/api/moderation/vox/:id/pin", ({ params }) => {
    const id = String(params.id);
    const row = voxList.find((v) => v.id === id);
    if (!row) {
      return HttpResponse.json({ error: "Vox no encontrado." }, { status: 404 });
    }
    row.pinnedAt = row.pinnedAt ? null : new Date().toISOString();
    return HttpResponse.json({ ok: true as const, pinnedAt: row.pinnedAt });
  }),
  http.get("/api/moderation/comments/:id/author", () => {
    return HttpResponse.json({ authorId: "demo-author" as string | null });
  }),
  http.post("/api/moderation/comments/:id/delete", () => {
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/moderation/comments/:id/purge-media", () => {
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/moderation/vox/:id/delete", () => {
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/moderation/vox/:id/purge-media", () => {
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/moderation/author-publications", ({ request }) => {
    const url = new URL(request.url);
    const voxId = url.searchParams.get("voxId");
    const commentId = url.searchParams.get("commentId");
    const anchor =
      voxId && !commentId
        ? ({ kind: "vox", voxId } as const)
        : commentId && !voxId
          ? ({ kind: "comment", commentId } as const)
          : null;
    if (!anchor) {
      return HttpResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    const body = {
      anchor,
      authorLinked: true,
      items: [] as unknown[],
      nextCursor: null as string | null,
    };
    return HttpResponse.json(body);
  }),
  http.post("/api/moderation/ban", () => {
    return HttpResponse.json({ banId: "mock-ban", actionId: "mock-ban-action" });
  }),
  http.get("/api/moderation/users/:id/ban-content", ({ request }) => {
    const forever = new URL(request.url).searchParams.get("forever") === "true";
    return HttpResponse.json(
      forever
        ? { voxCount: 4, commentCount: 17, mediaCount: 6 }
        : { voxCount: 1, commentCount: 3, mediaCount: 1 },
    );
  }),
  http.post("/api/moderation/users/:id/ban-content", () => {
    return HttpResponse.json({
      ok: true,
      actionId: "mock-bulk",
      voxCount: 4,
      commentCount: 17,
      fileCount: 6,
      blockedHashes: 0,
    });
  }),
  http.patch(/\/api\/moderation\/users\/[^/]+\/role$/, () => {
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/reports", () => {
    return HttpResponse.json({ ok: true, reportId: "mock-report" }, { status: 201 });
  }),
];

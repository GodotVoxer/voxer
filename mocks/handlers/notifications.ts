import { http, HttpResponse } from "msw";

export const notificationsHandlers = [
  http.get("/api/notifications", () => {
    return HttpResponse.json({
      notifications: [
        {
          id: "mock-notif-1",
          type: "REPLY_TO_COMMENT",
          readAt: null,
          voxId: "1",
          message:
            "Alguien respondió a tu comentario en el vox «¿Cuál es el mejor lenguaje para sistemas?».",
          thumbnailUrl: null,
          commentPublicTag: null,
          commentPreview:
            "No estoy de acuerdo: para sistemas sigue ganando C, y todo lo demás termina llamando a una biblioteca escrita en C.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }),
  http.post("/api/notifications/mark-read", () => {
    return HttpResponse.json({ ok: true });
  }),
  http.delete("/api/notifications", () => {
    return HttpResponse.json({ ok: true });
  }),
];

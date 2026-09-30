import { http, HttpResponse } from "msw";

export const notificationsHandlers = [
  http.get("/api/notifications", () => {
    return HttpResponse.json({ notifications: [] });
  }),
  http.post("/api/notifications/mark-read", () => {
    return HttpResponse.json({ ok: true });
  }),
  http.delete("/api/notifications", () => {
    return HttpResponse.json({ ok: true });
  }),
];

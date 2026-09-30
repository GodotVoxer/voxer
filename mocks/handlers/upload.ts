import { http, HttpResponse } from "msw";
import { UPLOAD_SERVICE_UNAVAILABLE_ES } from "@/lib/media/uploadUnavailable";

export const uploadHandlers = [
  http.post("/api/upload/blob-token", () =>
    HttpResponse.json({ error: UPLOAD_SERVICE_UNAVAILABLE_ES }, { status: 503 }),
  ),
  http.post("/api/upload", async ({ request }) => {
    const ct = request.headers.get("content-type") ?? "";
    if (!ct.includes("multipart/form-data")) {
      return HttpResponse.json({ error: "Se esperaba multipart" }, { status: 400 });
    }
    return HttpResponse.json({
      kind: "IMAGE" as const,
      mediaUrl: "/video-thumb.svg",
      thumbnailUrl: "/video-thumb.svg",
    });
  }),
];

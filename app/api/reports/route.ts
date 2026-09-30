import { NextResponse } from "next/server";
import { withinRateLimit } from "@/server/http/rateLimits";
import { createReportSchema } from "@/lib/moderation/schemas";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  voxNotFound,
  zodToMessage,
} from "@/server/http/apiErrors";
import { requestClientIp } from "@/server/http/requestIp";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { createReportWithStaffNotifications } from "@/server/moderation/reports";
import { ZodError } from "zod";
export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const ip = requestClientIp(req);
  if (!(await withinRateLimit("report", ip))) {
    return jsonError("Demasiadas denuncias. Esperá un momento.", 429);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return jsonError("Tenés que iniciar sesión para denunciar.", 401);
  }
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = createReportSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const result = await createReportWithStaffNotifications({
    reporterUserId: userId,
    voxId: parsed.voxId,
    commentId: parsed.commentId,
    reason: parsed.reason,
    details: parsed.details,
    clientIpRaw: ip,
  });
  if (!result.ok) {
    if (result.kind === "not_found") return voxNotFound();
    if (result.kind === "gone")
      return jsonError("Comentario no encontrado o ya no disponible.", 400);
    if (result.kind === "duplicate")
      return jsonError("Ya enviaste una denuncia con este motivo para este contenido.", 409);
    return jsonError("No se pudo registrar la denuncia", 400);
  }
  return NextResponse.json({ ok: true, reportId: result.reportId }, { status: 201 });
};

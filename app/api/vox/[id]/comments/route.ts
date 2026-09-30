import { NextResponse } from "next/server";
import { withinRateLimit } from "@/server/http/rateLimits";
import { createCommentSchema, commentsQuerySchema } from "@/lib/comments/schemas";
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
import { createCommentOnVox } from "@/server/comments/create";
import { listCommentsForVox } from "@/server/comments/list";
import { rulesNotAcceptedResponse, userHasAcceptedRules } from "@/server/auth/communityRules";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { countryCodeFromRequestHeaders } from "@/server/http/requestCountryCode";
import { ZodError } from "zod";
import { invalidateVoxDetailCache } from "@/server/vox/getVoxDetailCached";
type Params = {
  params: Promise<{
    id: string;
  }>;
};
export const GET = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const { id: voxId } = await params;
  const { searchParams } = new URL(req.url);
  let q: ReturnType<typeof commentsQuerySchema.parse>;
  try {
    q = commentsQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      afterCreatedAt: searchParams.get("afterCreatedAt") ?? undefined,
      afterId: searchParams.get("afterId") ?? undefined,
    });
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const limit = q.limit ?? 50;
  const viewerUserId = await getSessionUserIdFromCookies();
  const after =
    q.afterCreatedAt && q.afterId ? { createdAt: new Date(q.afterCreatedAt), id: q.afterId } : null;
  const result = await listCommentsForVox(voxId, q.cursor, limit, viewerUserId, after);
  if (!result.ok) {
    if (result.kind === "not_found") return voxNotFound();
    if (result.kind === "bad_cursor") return jsonError("Cursor inválido", 400);
    return jsonError("Error al cargar comentarios", 500);
  }
  return NextResponse.json({ comments: result.comments, nextCursor: result.nextCursor });
};
export const POST = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const { id: voxId } = await params;
  const ip = requestClientIp(req);
  if (!(await withinRateLimit("comment", ip))) {
    return jsonError("Demasiados comentarios. Esperá un momento.", 429);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return jsonError("Tenés que iniciar sesión para comentar.", 401);
  }
  if (!(await userHasAcceptedRules(userId))) {
    return rulesNotAcceptedResponse();
  }
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = createCommentSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const result = await createCommentOnVox(voxId, parsed, {
    userId,
    countryCode: countryCodeFromRequestHeaders(req),
    clientIpRaw: ip,
  });
  if (!result.ok) {
    if (result.kind === "not_found") return voxNotFound();
    if (result.kind === "bad_poll") {
      return jsonError(result.message ?? "Solicitud inválida", 400);
    }
    if (result.kind === "bad_reply_tags") {
      return jsonError(result.message ?? "Referencias inválidas en el comentario", 400);
    }
    if (result.kind === "bad_media") {
      return jsonError(result.message ?? "Multimedia inválida", 400);
    }
    if (result.kind === "rate") {
      return jsonError(result.message ?? "Esperá unos segundos.", 429);
    }
    if (result.kind === "unauthorized") {
      return jsonError("Sesión inválida.", 401);
    }
    if (result.kind === "banned" && result.ban) {
      return NextResponse.json(
        {
          code: "BANNED" as const,
          error: "Tu cuenta está suspendida.",
          ban: result.ban,
        },
        { status: 403 },
      );
    }
    if (result.kind === "client_network_blocked") {
      return NextResponse.json(
        {
          code: "CLIENT_NETWORK_BLOCKED" as const,
          error: "Publicar desde esta conexión no está permitido.",
          ban: result.ban,
        },
        { status: 403 },
      );
    }
    if (result.kind === "unavailable") {
      return jsonError("Servicio no disponible. Probá más tarde.", 503);
    }
    return jsonError("No se pudo publicar el comentario", 500);
  }
  invalidateVoxDetailCache(voxId);
  return NextResponse.json(result.payload, { status: 201 });
};

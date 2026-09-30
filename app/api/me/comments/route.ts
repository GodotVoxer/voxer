import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { clampMyCommentsLimit, listMyComments } from "@/server/comments/listMine";
import { MY_COMMENTS_SEARCH_MAX } from "@/lib/limits";

export const GET = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length > MY_COMMENTS_SEARCH_MAX) {
    return jsonError(`La búsqueda no puede superar ${MY_COMMENTS_SEARCH_MAX} caracteres.`, 400);
  }
  const result = await listMyComments({
    userId: sessionId,
    cursor: url.searchParams.get("cursor"),
    limit: clampMyCommentsLimit(url.searchParams.get("limit")),
    query,
  });
  if (!result.ok) return jsonError("Paginación inválida.", 400);
  return NextResponse.json(result.page);
};

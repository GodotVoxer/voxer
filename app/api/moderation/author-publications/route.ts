import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  forbidden,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { moderationAuthorPublicationsQuerySchema } from "@/lib/moderation/schemas";
import { parseAuthorPublicationsCursor } from "@/server/moderation/authorPublicationsCursor";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { canModerateTarget } from "@/lib/moderation/roleGuards";
import {
  listModerationAuthorPublications,
  resolveModerationHistoryAnchorAuthorId,
} from "@/server/moderation/authorPublications";
import type { ModerationAuthorPublicationsPage } from "@/lib/moderation/authorPublicationsTypes";

export const GET = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();

  const url = new URL(req.url);
  const raw = {
    voxId: url.searchParams.get("voxId") ?? undefined,
    commentId: url.searchParams.get("commentId") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  };
  const parsed = moderationAuthorPublicationsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("Parámetros inválidos (usá voxId o commentId).", 400);
  }
  const voxId = parsed.data.voxId?.trim() || undefined;
  const commentId = parsed.data.commentId?.trim() || undefined;
  const cursorRaw = parsed.data.cursor;
  const limit = parsed.data.limit;

  const resolved = await resolveModerationHistoryAnchorAuthorId({
    voxId,
    commentId,
  });
  if (!resolved.ok) {
    return jsonError("Publicación no encontrada.", 404);
  }

  if (
    resolved.authorRole &&
    !canModerateTarget(staff.role, resolved.authorRole, resolved.authorId === staff.id)
  ) {
    return jsonError(
      "No tenés permiso para ver el historial de publicaciones de un administrador.",
      403,
    );
  }

  const cursorPayload = parseAuthorPublicationsCursor(cursorRaw ?? null);
  const cursor =
    cursorPayload == null ? null : { createdAt: new Date(cursorPayload.t), id: cursorPayload.id };
  if (cursor && Number.isNaN(cursor.createdAt.getTime())) {
    return jsonError("Cursor inválido.", 400);
  }

  if (!resolved.authorId) {
    const body: ModerationAuthorPublicationsPage = {
      anchor: resolved.anchor,
      authorLinked: false,
      items: [],
      nextCursor: null,
    };
    return NextResponse.json(body);
  }

  const { items, nextCursor } = await listModerationAuthorPublications({
    viewerUserId: sessionId,
    authorId: resolved.authorId,
    cursor,
    limit: limit ?? 24,
  });

  const body: ModerationAuthorPublicationsPage = {
    anchor: resolved.anchor,
    authorLinked: true,
    items,
    nextCursor,
  };
  return NextResponse.json(body);
};

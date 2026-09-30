import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  dbUnavailableMessageEs,
  forbidden,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  signInRequired,
  zodToMessage,
} from "@/server/http/apiErrors";
import { moderationEditCommentSchema } from "@/lib/moderation/schemas";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { editOwnCommentByAdmin } from "@/server/comments/adminEditOwnComment";
import { isAdminRole } from "@/lib/moderation/roles";

type Params = { params: Promise<{ id: string }> };

export const PATCH = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) {
    return signInRequired();
  }
  const staff = await getStaffUser(sessionId);
  if (!staff || !isAdminRole(staff.role)) {
    return forbidden();
  }
  const { id: commentId } = await params;

  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = moderationEditCommentSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }

  const r = await editOwnCommentByAdmin(staff.id, staff.role, commentId, parsed);
  if (!r.ok) {
    if (r.kind === "not_found") return jsonError("Comentario no encontrado.", 404);
    if (r.kind === "unchanged") return jsonError("No cambiaste nada.", 400);
    if (r.kind === "empty") return jsonError("El comentario no puede quedar vacío.", 400);
    if (r.kind === "bad_reply_tags") return jsonError(r.message, 400);
    // `not_owner` is not told apart from `not_admin`, so ownership is not revealed.
    return jsonError("Solo podés editar tus propios comentarios.", 403);
  }
  return NextResponse.json({ ok: true as const, comment: r.comment });
};

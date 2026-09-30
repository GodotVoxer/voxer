import { NextResponse } from "next/server";
import {
  commentNotFound,
  dbUnavailableMessageEs,
  forbidden,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { staffSoftDeleteComment } from "@/server/moderation/softDelete";
type Params = { params: Promise<{ id: string }> };
export const POST = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { id } = await params;
  const r = await staffSoftDeleteComment(sessionId, id);
  if (!r.ok) {
    if (r.kind === "forbidden_target")
      return jsonError("No podés moderar contenido de otro administrador.", 403);
    if (r.kind === "not_found") return commentNotFound();
    return jsonError("El comentario ya estaba eliminado.", 400);
  }
  return NextResponse.json({ ok: true, actionId: r.actionId, voxId: r.voxId });
};

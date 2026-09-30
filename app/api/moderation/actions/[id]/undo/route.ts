import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  forbidden,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { undoModerationAction } from "@/server/moderation/undo";
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
  let r: Awaited<ReturnType<typeof undoModerationAction>>;
  try {
    r = await undoModerationAction(id, sessionId);
  } catch {
    return jsonError("No se pudo deshacer la acción.", 500);
  }
  if (!r.ok) {
    if (r.kind === "not_found") return jsonError("Acción no encontrada", 404);
    if (r.kind === "already_undone") return jsonError("Esta acción ya fue deshecha.", 400);
    if (r.kind === "forbidden_admin_action") {
      return jsonError("Solo un administrador puede deshacer acciones de otro administrador.", 403);
    }
    if (r.kind === "unsupported")
      return jsonError("No se puede deshacer este tipo de acción.", 400);
    return forbidden();
  }
  return NextResponse.json({ ok: true });
};

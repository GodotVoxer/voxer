import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  forbidden,
  isDbConfigured,
  jsonError,
  signInRequired,
  voxNotFound,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { staffSoftDeleteVox } from "@/server/moderation/softDelete";
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
  const r = await staffSoftDeleteVox(sessionId, id);
  if (!r.ok) {
    if (r.kind === "forbidden_target")
      return jsonError("No podés moderar contenido de otro administrador.", 403);
    if (r.kind === "not_found") return voxNotFound();
    return jsonError("El vox ya estaba eliminado.", 400);
  }
  return NextResponse.json({ ok: true, actionId: r.actionId });
};

import { NextResponse } from "next/server";
import { moderationRoleSchema } from "@/lib/moderation/schemas";
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
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { setUserRoleByAdmin } from "@/server/moderation/staffDirectory";
import { ZodError } from "zod";
import { isAdminRole } from "@/lib/moderation/roles";
type Params = { params: Promise<{ id: string }> };
export const PATCH = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff || !isAdminRole(staff.role)) {
    return jsonError("Solo un administrador puede cambiar roles.", 403);
  }
  const { id: targetUserId } = await params;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = moderationRoleSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const r = await setUserRoleByAdmin(sessionId, targetUserId, parsed.role);
  if (!r.ok) {
    if (r.kind === "not_found") return jsonError("Usuario no encontrado", 404);
    if (r.kind === "cannot_change_own_role") {
      return jsonError("No podés cambiar tu propio rol desde el panel.", 403);
    }
    if (r.kind === "cannot_demote_peer_admin") {
      return jsonError(
        "No podés quitar el rol de administrador a otro administrador. Solo podés gestionar moderadores.",
        403,
      );
    }
    return forbidden();
  }
  return NextResponse.json({ ok: true });
};

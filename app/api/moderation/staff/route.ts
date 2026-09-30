import { NextResponse } from "next/server";
import { moderationStaffAddByUsernameSchema } from "@/lib/moderation/schemas";
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
import { addStaffMemberByUsername, listStaffDirectory } from "@/server/moderation/staffDirectory";
import { ZodError } from "zod";
import { isAdminRole } from "@/lib/moderation/roles";

export const GET = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const users = await listStaffDirectory();
  return NextResponse.json({ users });
};

export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff || !isAdminRole(staff.role)) {
    return jsonError("Solo un administrador puede agregar moderadores.", 403);
  }
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = moderationStaffAddByUsernameSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const r = await addStaffMemberByUsername(sessionId, parsed.username);
  if (!r.ok) {
    if (r.kind === "invalid_username") return jsonError("Nombre de usuario inválido.", 400);
    if (r.kind === "not_found") return jsonError("No existe un usuario con ese nombre.", 404);
    if (r.kind === "already_staff") {
      return jsonError("Ese usuario ya es moderador o administrador.", 409);
    }
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
  return NextResponse.json({ ok: true }, { status: 201 });
};

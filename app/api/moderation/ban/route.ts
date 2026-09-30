import { NextResponse } from "next/server";
import { moderationBanSchema } from "@/lib/moderation/schemas";
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
import { staffBanUser } from "@/server/moderation/ban";
import type { DurationUnit } from "@/lib/time";
import { ZodError } from "zod";
export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = moderationBanSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const unit = parsed.unit as DurationUnit;
  const r = await staffBanUser(sessionId, parsed.targetUserId, parsed.reason, unit, parsed.value, {
    blockClientNetwork: parsed.blockClientNetwork,
  });
  if (!r.ok) {
    if (r.kind === "forbidden_target") {
      return jsonError("No podés sancionar a un administrador.", 403);
    }
    if (r.kind === "cannot_ban_self") {
      return jsonError("No podés banearte a vos mismo.", 403);
    }
    if (r.kind === "no_client_network_fingerprint") {
      return jsonError(
        "No hay huella de red reciente para esa cuenta (solo se guarda desde publicaciones nuevas). No se aplicó el bloqueo por red.",
        400,
      );
    }
    return jsonError("Usuario no encontrado", 404);
  }
  return NextResponse.json({ ok: true, banId: r.banId, actionId: r.actionId });
};

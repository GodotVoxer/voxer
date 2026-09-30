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
import { getModerationActionPreview } from "@/server/moderation/actionPreview";

export const GET = async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  if (!isDbConfigured()) return jsonError(dbUnavailableMessageEs(), 503);
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  if (!(await getStaffUser(sessionId))) return forbidden();
  const offset = Number(new URL(req.url).searchParams.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0) return jsonError("Página inválida.", 400);
  const { id } = await params;
  const page = await getModerationActionPreview(id, sessionId, offset);
  return page ? NextResponse.json(page) : jsonError("Acción no encontrada.", 404);
};

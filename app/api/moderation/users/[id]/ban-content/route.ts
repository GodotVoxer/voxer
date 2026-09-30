import { NextResponse } from "next/server";
import { moderationBanContentSchema } from "@/lib/moderation/schemas";
import {
  dbUnavailableMessageEs,
  forbidden,
  internalErrorMessageEs,
  invalidJson,
  isDbConfigured,
  jsonError,
  signInRequired,
  zodToMessage,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { staffBulkBanUserContent, type BulkBanContentInput } from "@/server/moderation/ban";
import { ZodError } from "zod";
type Params = { params: Promise<{ id: string }> };
export const POST = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { id: targetUserId } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return invalidJson();
  }
  let parsed;
  try {
    parsed = moderationBanContentSchema.parse({ ...body, targetUserId });
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const contentBan: BulkBanContentInput =
    parsed.forever === true
      ? { kind: "forever" }
      : { kind: "relative", amount: parsed.amount, unit: parsed.unit };
  const r = await staffBulkBanUserContent(sessionId, parsed.targetUserId, contentBan);
  if (!r.ok) {
    if (r.kind === "not_found") return jsonError("Usuario no encontrado", 404);
    return jsonError("No podés eliminar publicaciones de otro administrador.", 403);
  }
  return NextResponse.json({
    ok: true,
    actionId: r.actionId,
    voxCount: r.voxCount,
    commentCount: r.commentCount,
  });
};

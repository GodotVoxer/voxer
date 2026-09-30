import { NextResponse } from "next/server";
import { moderationCategorySchema } from "@/lib/moderation/schemas";
import {
  dbUnavailableMessageEs,
  forbidden,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  signInRequired,
  voxNotFound,
  zodToMessage,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { staffRecategorizeVox } from "@/server/moderation/recategorize";
import { ZodError } from "zod";
type Params = { params: Promise<{ id: string }> };
export const PATCH = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { id } = await params;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = moderationCategorySchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const r = await staffRecategorizeVox(sessionId, id, parsed.category);
  if (!r.ok) {
    if (r.kind === "forbidden_target")
      return jsonError("No podés moderar contenido de otro administrador.", 403);
    if (r.kind === "not_found") return voxNotFound();
    return jsonError("El vox ya estaba eliminado.", 400);
  }
  return NextResponse.json({ ok: true, actionId: r.actionId });
};

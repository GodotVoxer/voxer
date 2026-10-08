import { NextResponse } from "next/server";
import { moderationTextOnlyModeSchema } from "@/lib/moderation/schemas";
import { isAdminRole } from "@/lib/moderation/roles";
import {
  dbUnavailableMessageEs,
  forbidden,
  invalidRequest,
  isDbConfigured,
  jsonError,
  readJsonBody,
  signInRequired,
} from "@/server/http/apiErrors";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { getTextOnlySince, setTextOnlyMode } from "@/server/moderation/textOnlyMode";

const toPayload = (since: Date | null) => ({ since: since?.toISOString() ?? null });

export const GET = async () => {
  if (!isDbConfigured()) return jsonError(dbUnavailableMessageEs(), 503);
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  if (!(await getStaffUser(sessionId))) return forbidden();
  return NextResponse.json(toPayload(await getTextOnlySince()));
};

export const PUT = async (req: Request) => {
  if (!isDbConfigured()) return jsonError(dbUnavailableMessageEs(), 503);
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff || !isAdminRole(staff.role)) {
    return jsonError("Solo un administrador puede cambiar el modo «solo texto».", 403);
  }
  const limited = await userActionRateLimitResponse(staff.id, "textOnlyMode");
  if (limited) return limited;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const parsed = moderationTextOnlyModeSchema.safeParse(jsonBody.body);
  if (!parsed.success) return invalidRequest();
  return NextResponse.json(toPayload(await setTextOnlyMode(parsed.data.active)));
};

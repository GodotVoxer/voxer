import { NextResponse } from "next/server";
import { ZodError } from "zod";
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
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { markStaffNotificationsReadForUserVox } from "@/server/moderation/staffNotifications";
import { notificationsMarkReadVoxSchema } from "@/lib/notifications/schemas";

export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) return signInRequired();
  const staff = await getStaffUser(userId);
  if (!staff) return forbidden();
  const limited = await userActionRateLimitResponse(userId, "markRead");
  if (limited) return limited;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = notificationsMarkReadVoxSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const marked = await markStaffNotificationsReadForUserVox(userId, parsed.voxId);
  return NextResponse.json({ ok: true, marked });
};

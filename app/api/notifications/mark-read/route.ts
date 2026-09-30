import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  signInRequired,
  zodToMessage,
} from "@/server/http/apiErrors";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { markNotificationsReadForUserVox } from "@/server/notifications/service";
import { notificationsMarkReadVoxSchema } from "@/lib/notifications/schemas";

export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
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
  const marked = await markNotificationsReadForUserVox(userId, parsed.voxId);
  return NextResponse.json({ ok: true, marked });
};

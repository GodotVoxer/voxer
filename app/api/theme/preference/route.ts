import { after, NextResponse } from "next/server";
import { broadcastUserThemeUpdated } from "@/server/realtime/broadcast";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  signInRequired,
  zodToMessage,
} from "@/server/http/apiErrors";
import { themePreferenceUpdateSchema } from "@/lib/theme/themePreferenceSchema";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { setUserThemePreference } from "@/server/theme/preference";
import {
  allowThemeWrite,
  isBodyTooLarge,
  THEME_PREFERENCE_BODY_MAX_BYTES,
} from "@/server/theme/themeWriteGuard";

export const PUT = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  if (isBodyTooLarge(req, THEME_PREFERENCE_BODY_MAX_BYTES)) {
    return jsonError("Solicitud demasiado grande", 413);
  }
  if (!(await allowThemeWrite(userId))) {
    return jsonError("Demasiados cambios de tema. Probá más tarde.", 429);
  }
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  const parsed = themePreferenceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(zodToMessage(parsed.error), 400);
  }
  try {
    const theme = await setUserThemePreference(userId, parsed.data);
    if (!theme) return jsonError("Tema no encontrado", 404);
    after(() => broadcastUserThemeUpdated(userId));
    return NextResponse.json({ theme });
  } catch {
    return jsonError(internalErrorMessageEs(), 500);
  }
};

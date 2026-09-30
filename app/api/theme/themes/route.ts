import { after, NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  signInRequired,
  zodToMessage,
} from "@/server/http/apiErrors";
import { broadcastUserThemeUpdated } from "@/server/realtime/broadcast";
import { CUSTOM_THEMES_PER_USER_MAX } from "@/lib/theme/customTheme";
import { customThemeInputSchema } from "@/lib/theme/customThemeSchema";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { createCustomTheme, listCustomThemes } from "@/server/theme/customThemes";
import { purgeOrphanThemeAssets } from "@/server/theme/themeAssets";
import {
  allowThemeWrite,
  CUSTOM_THEME_BODY_MAX_BYTES,
  isBodyTooLarge,
} from "@/server/theme/themeWriteGuard";

export const GET = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const themes = await listCustomThemes(userId);
  return NextResponse.json({ themes });
};

export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  if (isBodyTooLarge(req, CUSTOM_THEME_BODY_MAX_BYTES)) {
    return jsonError("Solicitud demasiado grande", 413);
  }
  if (!(await allowThemeWrite(userId))) {
    return jsonError("Demasiados cambios de tema. Probá más tarde.", 429);
  }
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  const parsed = customThemeInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(zodToMessage(parsed.error), 400);
  }
  try {
    const result = await createCustomTheme(userId, parsed.data);
    if (!result.ok) {
      return result.reason === "limit"
        ? jsonError(`Llegaste al máximo de ${CUSTOM_THEMES_PER_USER_MAX} temas.`, 409)
        : jsonError("La imagen de fondo ya no existe.", 404);
    }
    after(() => purgeOrphanThemeAssets(userId).catch(() => undefined));
    after(() => broadcastUserThemeUpdated(userId));
    return NextResponse.json({ theme: result.theme }, { status: 201 });
  } catch {
    return jsonError(internalErrorMessageEs(), 500);
  }
};

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
import { customThemeUpdateSchema } from "@/lib/theme/customThemeSchema";
import { customThemeIdSchema } from "@/lib/theme/themePreferenceSchema";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { deleteCustomTheme, updateCustomTheme } from "@/server/theme/customThemes";
import { purgeOrphanThemeAssets } from "@/server/theme/themeAssets";
import {
  allowThemeWrite,
  CUSTOM_THEME_BODY_MAX_BYTES,
  isBodyTooLarge,
} from "@/server/theme/themeWriteGuard";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const NOT_FOUND_ES = "Tema no encontrado";

export const PATCH = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const { id } = await params;
  if (!customThemeIdSchema.safeParse(id).success) {
    return jsonError(NOT_FOUND_ES, 404);
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
  const parsed = customThemeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(zodToMessage(parsed.error), 400);
  }
  try {
    const result = await updateCustomTheme(userId, id, parsed.data);
    if (!result.ok) {
      if (result.reason === "not_found") return jsonError(NOT_FOUND_ES, 404);
      if (result.reason === "asset_not_found") {
        return jsonError("La imagen de fondo ya no existe.", 404);
      }
      return jsonError("El tema cambió en otro dispositivo. Recargalo antes de guardar.", 409);
    }
    after(() => purgeOrphanThemeAssets(userId).catch(() => undefined));
    after(() => broadcastUserThemeUpdated(userId));
    return NextResponse.json({ theme: result.theme });
  } catch {
    return jsonError(internalErrorMessageEs(), 500);
  }
};

export const DELETE = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const { id } = await params;
  if (!customThemeIdSchema.safeParse(id).success) {
    return jsonError(NOT_FOUND_ES, 404);
  }
  if (!(await allowThemeWrite(userId))) {
    return jsonError("Demasiados cambios de tema. Probá más tarde.", 429);
  }
  try {
    const deleted = await deleteCustomTheme(userId, id);
    if (!deleted) return jsonError(NOT_FOUND_ES, 404);
    after(() => purgeOrphanThemeAssets(userId).catch(() => undefined));
    after(() => broadcastUserThemeUpdated(userId));
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError(internalErrorMessageEs(), 500);
  }
};

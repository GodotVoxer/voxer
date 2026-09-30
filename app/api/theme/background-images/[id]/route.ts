import { after, NextResponse } from "next/server";
import { broadcastUserThemeUpdated } from "@/server/realtime/broadcast";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { customThemeIdSchema } from "@/lib/theme/themePreferenceSchema";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { deleteThemeAsset } from "@/server/theme/themeAssets";
import { allowThemeWrite } from "@/server/theme/themeWriteGuard";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const NOT_FOUND_ES = "Imagen no encontrada";

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
    const deleted = await deleteThemeAsset(userId, id);
    if (!deleted) return jsonError(NOT_FOUND_ES, 404);
    // Themes using the image went back to no background: the other tabs must find out.
    after(() => broadcastUserThemeUpdated(userId));
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError(internalErrorMessageEs(), 500);
  }
};

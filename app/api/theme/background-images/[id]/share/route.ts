import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { customThemeIdSchema } from "@/lib/theme/themePreferenceSchema";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { createThemeAssetShare } from "@/server/theme/themeAssets";
import { allowThemeWrite } from "@/server/theme/themeWriteGuard";

type Params = { params: Promise<{ id: string }> };

export const POST = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) return jsonError(dbUnavailableMessageEs(), 503);
  const userId = await getSessionUserIdFromCookies();
  if (!userId) return signInRequired();
  const { id } = await params;
  if (!customThemeIdSchema.safeParse(id).success) return jsonError("Imagen no encontrada", 404);
  if (!(await allowThemeWrite(userId))) {
    return jsonError("Demasiados cambios de tema. Probá más tarde.", 429);
  }
  try {
    const shareId = await createThemeAssetShare(userId, id);
    if (!shareId) return jsonError("Imagen no encontrada", 404);
    return NextResponse.json({ shareId });
  } catch {
    return jsonError(internalErrorMessageEs(), 500);
  }
};

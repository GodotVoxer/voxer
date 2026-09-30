import { after, NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { THEME_BG_ASSETS_PER_USER_MAX } from "@/lib/theme/themeBackgroundLimits";
import { themeAssetShareImportSchema } from "@/lib/theme/themeAssetShareSchema";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { requestClientIp } from "@/server/http/requestIp";
import { getPostingBlockForUser } from "@/server/moderation/postingEligibility";
import { importSharedThemeAsset, purgeOrphanThemeAssets } from "@/server/theme/themeAssets";
import { allowThemeWrite, isBodyTooLarge } from "@/server/theme/themeWriteGuard";

const BODY_MAX_BYTES = 256;

export const POST = async (req: Request) => {
  if (!isDbConfigured()) return jsonError(dbUnavailableMessageEs(), 503);
  const userId = await getSessionUserIdFromCookies();
  if (!userId) return signInRequired();
  if (isBodyTooLarge(req, BODY_MAX_BYTES)) return jsonError("Solicitud demasiado grande", 413);
  if (!(await allowThemeWrite(userId))) {
    return jsonError("Demasiados cambios de tema. Probá más tarde.", 429);
  }
  if (await getPostingBlockForUser(userId, requestClientIp(req))) {
    return jsonError("Tu cuenta no puede importar imágenes en este momento.", 403);
  }
  const parsed = themeAssetShareImportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Referencia de imagen inválida", 400);
  try {
    const result = await importSharedThemeAsset(userId, parsed.data.shareId);
    if (!result.ok) {
      if (result.reason === "not_found")
        return jsonError("La imagen compartida ya no existe.", 404);
      if (result.reason === "blocked") return jsonError("Esta imagen no está permitida.", 422);
      if (result.reason === "quota_count") {
        return jsonError(
          `Llegaste al máximo de ${THEME_BG_ASSETS_PER_USER_MAX} imágenes. Borrá alguna para importar otra.`,
          409,
        );
      }
      return jsonError("No queda espacio para importar la imagen de fondo.", 409);
    }
    after(() => purgeOrphanThemeAssets(userId).catch(() => undefined));
    return NextResponse.json({ asset: result.asset }, { status: result.deduplicated ? 200 : 201 });
  } catch {
    return jsonError(internalErrorMessageEs(), 500);
  }
};

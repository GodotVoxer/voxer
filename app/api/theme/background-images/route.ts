import { after, NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { withinRateLimit } from "@/server/http/rateLimits";
import {
  THEME_BG_ASSETS_PER_USER_MAX,
  THEME_BG_REQUEST_MAX_BYTES,
  THEME_BG_UPLOAD_MAX_BYTES,
} from "@/lib/theme/themeBackgroundLimits";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { requestClientIp } from "@/server/http/requestIp";
import { getPostingBlockForUser } from "@/server/moderation/postingEligibility";
import {
  processBackgroundImage,
  ThemeBackgroundImageError,
  type ThemeBackgroundImageErrorCode,
} from "@/server/theme/processBackgroundImage";
import {
  listThemeAssets,
  purgeOrphanThemeAssets,
  saveThemeAsset,
} from "@/server/theme/themeAssets";
import { isBodyTooLarge } from "@/server/theme/themeWriteGuard";

export const runtime = "nodejs";

const PROCESSING_ERRORS: Record<ThemeBackgroundImageErrorCode, [string, number]> = {
  UNREADABLE: ["No pudimos leer la imagen. Usá un JPG, PNG o WebP.", 415],
  UNSUPPORTED_FORMAT: ["Usá una imagen JPG, PNG o WebP.", 415],
  DIMENSIONS: ["La imagen es demasiado grande (máximo 8000 px por lado).", 413],
  OUTPUT_TOO_LARGE: ["La imagen sigue siendo demasiado pesada después de comprimirla.", 413],
};

export const GET = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  return NextResponse.json(await listThemeAssets(userId));
};

export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  if (isBodyTooLarge(req, THEME_BG_REQUEST_MAX_BYTES)) {
    return jsonError("La imagen es demasiado pesada.", 413);
  }
  if (!(await withinRateLimit("theme:bg:user", userId))) {
    return jsonError("Subiste muchas imágenes seguidas. Probá más tarde.", 429);
  }
  if (await getPostingBlockForUser(userId, requestClientIp(req))) {
    return jsonError("Tu cuenta no puede subir imágenes en este momento.", 403);
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Formulario inválido", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("Falta la imagen", 400);
  }
  if (file.size > THEME_BG_UPLOAD_MAX_BYTES) {
    return jsonError("La imagen es demasiado pesada.", 413);
  }

  let processed;
  try {
    processed = await processBackgroundImage(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof ThemeBackgroundImageError) {
      const [message, status] = PROCESSING_ERRORS[error.code];
      return jsonError(message, status);
    }
    return jsonError(internalErrorMessageEs(), 500);
  }

  try {
    const result = await saveThemeAsset(userId, processed);
    if (!result.ok) {
      if (result.reason === "blocked") return jsonError("Esta imagen no está permitida.", 422);
      if (result.reason === "quota_count") {
        return jsonError(
          `Llegaste al máximo de ${THEME_BG_ASSETS_PER_USER_MAX} imágenes. Borrá alguna para subir otra.`,
          409,
        );
      }
      return jsonError(
        "No queda espacio para imágenes de fondo. Borrá alguna para subir otra.",
        409,
      );
    }
    after(() => purgeOrphanThemeAssets(userId).catch(() => undefined));
    return NextResponse.json({ asset: result.asset }, { status: result.deduplicated ? 200 : 201 });
  } catch {
    return jsonError("No se pudo guardar la imagen. Probá de nuevo.", 500);
  }
};

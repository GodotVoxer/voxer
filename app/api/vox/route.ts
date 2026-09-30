import { NextResponse } from "next/server";
import { withinRateLimit } from "@/server/http/rateLimits";
import { createVoxSchema } from "@/lib/vox/schemas";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  zodToMessage,
} from "@/server/http/apiErrors";
import { requestClientIp } from "@/server/http/requestIp";
import { createVoxFromParsed } from "@/server/vox/create";
import { InvalidVoxListCursorError, listVoxListItems, type VoxListView } from "@/server/vox/list";
import { getPublicVoxListFirstPage } from "@/server/vox/getVoxListCached";
import { searchVoxListItems } from "@/server/vox/searchList";
import { VOX_TITLE_MAX } from "@/lib/limits";
import { hasAcceptedCurrentRules } from "@/lib/auth/communityRules";
import { rulesNotAcceptedResponse } from "@/server/auth/communityRules";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getCategoryFromCode } from "@/lib/vox/categoryCodes";
import { prisma } from "@/server/db/prisma";
import { ZodError } from "zod";
import { clampPageLimit } from "@/server/http/pagination";
import { VOX_LIST_PAGE_MAX, VOX_LIST_PAGE_SIZE } from "@/lib/limits";

const parseLimit = (value: string | null): number | null => {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
};

export const GET = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const { searchParams } = new URL(req.url);
  const rawView = searchParams.get("view");
  const view: VoxListView =
    rawView === "hidden"
      ? "hidden"
      : rawView === "favorites"
        ? "favorites"
        : rawView === "mine"
          ? "mine"
          : "default";
  const cursor = searchParams.get("cursor");
  const rawLimit = parseLimit(searchParams.get("limit"));
  const limit =
    rawLimit == null
      ? undefined
      : clampPageLimit(rawLimit, { max: VOX_LIST_PAGE_MAX, fallback: VOX_LIST_PAGE_SIZE });

  const sessionUserId = await getSessionUserIdFromCookies();
  if (view === "hidden" && !sessionUserId) {
    return jsonError("Tenés que iniciar sesión para ver los vox ocultos.", 401);
  }
  if (view === "favorites" && !sessionUserId) {
    return jsonError("Tenés que iniciar sesión para ver tus favoritos.", 401);
  }
  if (view === "mine" && !sessionUserId) {
    return jsonError("Tenés que iniciar sesión para ver tus vox.", 401);
  }

  const rawCategoryCode = searchParams.get("categoryCode")?.trim();
  let category: string | null = null;
  if (rawCategoryCode) {
    if (view !== "default") {
      return jsonError("El filtro por categoría solo aplica al listado principal.", 400);
    }
    const resolved = getCategoryFromCode(rawCategoryCode);
    if (!resolved) {
      return jsonError("Código de categoría inválido.", 400);
    }
    category = resolved;
  }

  const rawSearch = searchParams.get("q")?.trim() ?? "";
  if (rawSearch.length > 0) {
    if (rawSearch.length > VOX_TITLE_MAX) {
      return jsonError(`La búsqueda no puede superar ${VOX_TITLE_MAX} caracteres.`, 400);
    }
    if (view !== "default") {
      return jsonError("La búsqueda solo aplica al listado principal.", 400);
    }
    if (rawCategoryCode) {
      return jsonError("No podés combinar búsqueda con filtro por categoría.", 400);
    }
    const ip = requestClientIp(req);
    if (!(await withinRateLimit("vox:search", ip))) {
      return jsonError("Demasiadas búsquedas. Probá de nuevo en un minuto.", 429);
    }
    try {
      const data = await searchVoxListItems({
        sessionUserId,
        q: rawSearch,
        cursor,
        limit,
      });
      return NextResponse.json(data);
    } catch (e) {
      if (e instanceof Error && e.message === "INVALID_SEARCH_CURSOR") {
        return jsonError("Cursor de búsqueda inválido.", 400);
      }
      return jsonError("Error al buscar vox", 500);
    }
  }

  try {
    // Without a session or cursor the response does not depend on the user: served from the shared cache.
    const isPublicFirstPage = !sessionUserId && view === "default" && !cursor;
    const data = isPublicFirstPage
      ? await getPublicVoxListFirstPage(category, limit)
      : await listVoxListItems({ sessionUserId, view, cursor, limit, category });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof InvalidVoxListCursorError) {
      return jsonError("Cursor inválido.", 400);
    }
    return jsonError("Error al listar vox", 500);
  }
};
export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const ip = requestClientIp(req);
  if (!(await withinRateLimit("vox:create", ip))) {
    return jsonError("Demasiadas solicitudes. Probá de nuevo en un minuto.", 429);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return jsonError("Tenés que iniciar sesión para crear un vox.", 401);
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, rulesAcceptedVersion: true },
  });
  if (!user) {
    return jsonError("Sesión inválida. Volvé a iniciar sesión.", 401);
  }
  if (!hasAcceptedCurrentRules(user.rulesAcceptedVersion)) {
    return rulesNotAcceptedResponse();
  }
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = createVoxSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const result = await createVoxFromParsed(parsed, {
    userId,
    username: user.username,
    clientIpRaw: ip,
  });
  if (!result.ok) {
    if ("code" in result && result.code === "BANNED" && "ban" in result && result.ban) {
      return NextResponse.json(
        {
          code: "BANNED" as const,
          error: result.message,
          ban: result.ban,
        },
        { status: 403 },
      );
    }
    if ("code" in result && result.code === "CLIENT_NETWORK_BLOCKED") {
      return NextResponse.json(
        {
          code: "CLIENT_NETWORK_BLOCKED" as const,
          error: result.message,
          ban: result.ban,
        },
        { status: 403 },
      );
    }
    return jsonError(result.message, result.status);
  }
  return NextResponse.json({ id: result.id }, { status: 201 });
};

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
import { COMMUNITY_RULES_VERSION } from "@/lib/auth/communityRules";
import { acceptRulesSchema } from "@/lib/auth/schemas";
import { acceptCommunityRules } from "@/server/auth/communityRules";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const limited = await userActionRateLimitResponse(userId, "acceptRules");
  if (limited) return limited;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = acceptRulesSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  // An old client cannot accept a rules version it never showed.
  if (parsed.version !== COMMUNITY_RULES_VERSION) {
    return jsonError("Las reglas cambiaron. Recargá la página para leerlas.", 409);
  }
  if (!(await acceptCommunityRules(userId))) {
    return jsonError("Sesión inválida. Volvé a iniciar sesión.", 401);
  }
  return NextResponse.json({ ok: true });
};

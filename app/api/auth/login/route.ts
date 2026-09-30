import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAuthSecretConfigured } from "@/server/auth/env";
import {
  authUnavailableMessageEs,
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  zodToMessage,
} from "@/server/http/apiErrors";
import { withinRateLimit } from "@/server/http/rateLimits";
import { loginSchema } from "@/lib/auth/schemas";
import { requestClientIp } from "@/server/http/requestIp";
import { loginUser } from "@/server/auth/login";
import { setSessionCookie } from "@/server/auth/sessionCookie";
export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  if (!isAuthSecretConfigured()) {
    return jsonError(authUnavailableMessageEs(), 503);
  }
  const ip = requestClientIp(req);
  if (!(await withinRateLimit("auth:login:ip", ip))) {
    return jsonError("Demasiados intentos de inicio de sesión. Probá más tarde.", 429);
  }
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = loginSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  if (!(await withinRateLimit("auth:login:user", parsed.username.toLowerCase()))) {
    return jsonError("Demasiados intentos de inicio de sesión. Probá más tarde.", 429);
  }
  const result = await loginUser(parsed);
  if (!result.ok) {
    return jsonError(result.message, result.status);
  }
  await setSessionCookie(result.userId);
  return NextResponse.json({ ok: true });
};

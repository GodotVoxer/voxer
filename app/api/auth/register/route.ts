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
import { TURNSTILE_REGISTER_ACTION } from "@/lib/auth/turnstile";
import { registerSchema } from "@/lib/auth/schemas";
import { requestClientIp } from "@/server/http/requestIp";
import { registerUser } from "@/server/auth/register";
import { turnstileFailureMessageEs, verifyTurnstileToken } from "@/server/auth/turnstile";
import { setSessionCookie } from "@/server/auth/sessionCookie";
export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  if (!isAuthSecretConfigured()) {
    return jsonError(authUnavailableMessageEs(), 503);
  }
  const ip = requestClientIp(req);
  if (!(await withinRateLimit("auth:register:ip", ip))) {
    return jsonError("Demasiados registros desde esta red. Probá más tarde.", 429);
  }
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = registerSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const turnstile = await verifyTurnstileToken(parsed.turnstileToken, TURNSTILE_REGISTER_ACTION);
  if (!turnstile.ok) {
    return jsonError(
      turnstileFailureMessageEs(turnstile.reason),
      turnstile.reason === "unavailable" ? 503 : 403,
    );
  }
  const result = await registerUser({
    username: parsed.username,
    password: parsed.password,
    registrationIp: ip,
  });
  if (!result.ok) {
    return jsonError(result.message, result.status);
  }
  await setSessionCookie(result.userId);
  return NextResponse.json({ ok: true }, { status: 201 });
};

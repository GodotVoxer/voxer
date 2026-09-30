import { NextResponse } from "next/server";
import { isAuthSecretConfigured } from "@/server/auth/env";
import {
  dbUnavailableMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { signSocketJoinJwt } from "@/server/auth/jwt";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
export const GET = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  if (!isAuthSecretConfigured()) {
    return jsonError("Autenticación no configurada", 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const limited = await userActionRateLimitResponse(userId, "socketToken");
  if (limited) return limited;
  const token = await signSocketJoinJwt(userId);
  return NextResponse.json({ token });
};
